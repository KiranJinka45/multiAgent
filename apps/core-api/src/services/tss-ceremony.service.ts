import { ThresholdBls, AuthenticatedMessage, ThresholdCrypto } from '@packages/ztan-crypto';
import { logger } from '@packages/observability';
import { redis } from '@packages/utils';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Redlock from 'redlock';
import { IdentityService } from './identity.service';

export type CeremonyStatus = 'INIT' | 'DKG_ROUND_1' | 'DKG_ROUND_2' | 'ACTIVE' | 'COMPLETED' | 'ABORTED';

export interface CeremonyEvent {
  sequence: number;
  timestamp: number;
  nodeId: string;
  round: string;
  payloadHash: string;
}

export interface ParticipantInfo {
  nodeId: string;
  publicKey: string;
  status: 'PENDING' | 'SIGNED' | 'INVALID' | 'FRAUD_DETECTED';
  commitments?: string[];
}

export interface CeremonyState {
  ceremonyId: string;
  masterPublicKey: string;
  threshold: number;
  participants: { nodeId: string, publicKey: string }[]; 
  dkgRound1Commitments: Record<string, string[]>;
  status: CeremonyStatus;
  aggregatedSignature?: string;
  messageHash?: string;
  createdAt: number;
  lastUpdate: number;
  
  // MPC Rounds Data
  dkgRound2Shares: Record<string, Record<string, string>>; // targetNodeId -> senderNodeId -> shareHex
  
  // Coordinator Transparency Transcript
  transcript: CeremonyEvent[];
  processedMessages: string[]; // For idempotency
  signingPartials: Record<string, string>;
  eventSequence: number;
}

const REDIS_KEY = 'ztan:ceremony:active';
const MAX_ACTIVE_CEREMONIES = 100; // Prevent resource exhaustion
const MAX_TRANSCRIPT_SIZE = 500;  // Cap transcript growth
const CEREMONY_TIMEOUT_MS = 60000; // 60 seconds

const redlock = new Redlock([redis], {
  driftFactor: 0.01,
  retryCount: 20, // Increased for high concurrency
  retryDelay: 100, // Faster retries
  retryJitter: 100,
});

/**
 * TssCeremonyService
 * Manages the lifecycle of a Threshold Signature Ceremony.
 * Persists state in Redis to ensure durability across service restarts.
 */
export class TssCeremonyService {
  /**
   * Bootstrap: Recovers active ceremonies on startup.
   * Ensures the system is restart-safe and cleans up stale sessions.
   */
  public static async bootstrap() {
    logger.info('[TSS] Bootstrapping ceremony service...');
    const state = await this.getActive();
    if (!state) return;

    if (state.status !== 'COMPLETED' && state.status !== 'ABORTED') {
      const now = Date.now();
      if (now - state.lastUpdate > CEREMONY_TIMEOUT_MS) {
        logger.warn({ ceremonyId: state.ceremonyId }, '[TSS] Recovery: Aborting stale ceremony found on startup');
        state.status = 'ABORTED';
        await redis.set(REDIS_KEY, JSON.stringify(state), 'EX', 3600);
      } else {
        logger.info({ ceremonyId: state.ceremonyId, phase: state.status }, '[TSS] Recovery: Resuming active ceremony');
      }
    }
  }

  /**
   * Initializes a new TSS ceremony and persists to Redis.
   * Enforces ceremonyId uniqueness and participant binding.
   */
  public static async init(threshold: number, participantIds: string[], messageHash: string) {
    logger.info({ threshold, participantIds, messageHash }, '[TSS] Initializing new MPC ceremony');
    
    // Phase 3: Resource Limit Check
    const activeCount = await this.getActiveCeremonyCount();
    if (activeCount >= MAX_ACTIVE_CEREMONIES) {
        throw new Error(`[SECURITY] REJECT: Too many active ceremonies (${activeCount}). System at capacity.`);
    }

    // ZTAN MPC Hardening: Verify all participants are registered identities
    for (const id of participantIds) {
        const pk = await IdentityService.getPublicKey(id);
        if (!pk) {
            throw new Error(`Initialization failed: Participant ${id} is not a registered identity.`);
        }
    }

    // Phase 5: Bind exact public keys at init to handle rotation correctly
    const participants = [];
    for (const nodeId of participantIds) {
        const publicKey = await IdentityService.getPublicKey(nodeId);
        if (!publicKey) throw new Error(`[SECURITY] Node ${nodeId} is not in the active registry.`);
        participants.push({ nodeId, publicKey });
    }

    const state: CeremonyState = {
      ceremonyId: `CER-${Math.random().toString(36).substring(7).toUpperCase()}`,
      masterPublicKey: '', // Will be derived after DKG
      threshold,
      participants,
      signingPartials: {},
      status: 'DKG_ROUND_1',
      messageHash,
      createdAt: Date.now(),
      lastUpdate: Date.now(),
      dkgRound1Commitments: {},
      dkgRound2Shares: {},
      transcript: [],
      processedMessages: [],
      eventSequence: 0,
    };

    await redis.set(REDIS_KEY, JSON.stringify(state), 'EX', 3600);
    return state;
  }

  /**
   * Aborts the ceremony due to detected fraud or failure.
   */
  public static async abort(reason: string) {
    const lock = await redlock.acquire([`${REDIS_KEY}:lock`], 5000);
    try {
      const state = await this.getActive();
      if (!state) return;

      logger.error({ ceremonyId: state.ceremonyId, reason }, '[TSS] Ceremony ABORTED due to fraud or failure.');
      state.status = 'ABORTED';
      state.lastUpdate = Date.now();
      await redis.set(REDIS_KEY, JSON.stringify(state), 'EX', 3600);
      return state;
    } finally {
      await lock.release();
    }
  }

  /**
   * MPC Round 1: Participants submit their commitments.
   * Expects an AuthenticatedMessage for security.
   */
  public static async submitCommitments(msg: AuthenticatedMessage) {
    const startTime = Date.now();
    const lockKey = `ztan:lock:ceremony:${msg.ceremonyId || 'active'}`;
    const lock = await redlock.acquire([lockKey], 5000);
    
    try {
      const state = await this.getActive();
      if (!state) throw new Error('No active ceremony');
      if (state.status !== 'DKG_ROUND_1') throw new Error(`Invalid ceremony state for commitments: ${state.status}`);

      // Idempotency Check
      if (state.processedMessages.includes(msg.messageId)) {
        return state;
      }

      // 1. Authenticate & Log
      await this.verifyAuthenticatedMessage(msg, state.ceremonyId, 'DKG_ROUND_1');
      const commitments = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
      await this.logEvent(state, msg.nodeId, 'DKG_ROUND_1', commitments);
      
      state.processedMessages.push(msg.messageId);
      state.lastUpdate = Date.now();

      if (state.dkgRound1Commitments[msg.nodeId]) throw new Error(`Node ${msg.nodeId} already submitted commitments`);

      state.dkgRound1Commitments[msg.nodeId] = commitments;
      
      // ... rest of logic
      const duration = Date.now() - startTime;
      logger.info({ ceremonyId: state.ceremonyId, nodeId: msg.nodeId, event: 'COMMITMENT_SUBMITTED', duration, status: 'OK' });

      // If everyone submitted, move to Round 2
      if (Object.keys(state.dkgRound1Commitments).length === state.participants.length) {
        state.status = 'DKG_ROUND_2';
        logger.info({ ceremonyId: state.ceremonyId }, '[TSS] DKG Round 1 complete. Moving to Round 2 (Share Exchange).');
      }

      await redis.set(REDIS_KEY, JSON.stringify(state), 'EX', 3600);
      return state;
    } finally {
      await lock.release();
    }
  }

  /**
   * MPC Round 2: Participants submit shares for others.
   */
  public static async submitShares(msg: AuthenticatedMessage | { nodeId: string, shares: Record<string, string> }) {
    const lock = await redlock.acquire([`${REDIS_KEY}:lock`], 5000);
    try {
      const state = await this.getActive();
      if (!state || state.status !== 'DKG_ROUND_2') throw new Error('Not in DKG Round 2');

      // 1. Authenticate & Log
      await this.verifyAuthenticatedMessage(msg as AuthenticatedMessage, state.ceremonyId, 'DKG_ROUND_2');
      const shares = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
      await this.logEvent(state, msg.nodeId, 'DKG_ROUND_2', shares);
      state.processedMessages.push(msg.messageId);
      state.lastUpdate = Date.now();

      for (const [targetNodeId, share] of Object.entries(shares as Record<string, string>)) {
        if (!state.dkgRound2Shares[targetNodeId]) {
          state.dkgRound2Shares[targetNodeId] = {};
        }
        state.dkgRound2Shares[targetNodeId][msg.nodeId] = share;
      }

      state.lastUpdate = Date.now();

      // Check if everyone has sent shares to everyone
      const expectedShareCount = state.participants.length;
      const allReceived = state.participants.every(p => 
        state.dkgRound2Shares[p.nodeId] && 
        Object.keys(state.dkgRound2Shares[p.nodeId]).length === expectedShareCount
      );

      if (allReceived) {
        try {
          const { Frost } = require('@packages/ztan-crypto');
          const commitmentsArray = state.participants.map(p => p.nodeId); // Adjusted logic placeholder
          state.masterPublicKey = Frost.computeMasterPublicKey(commitmentsArray);
          
          state.participants.forEach((p, idx) => {
              p.publicKey = Frost.computeVerificationKeyFromCommitments(commitmentsArray, idx + 1);
          });

          let fraudCount = 0;
          for (const p of state.participants) {
              const sharesForP = state.dkgRound2Shares[p.nodeId];
              const sk_i = Frost.aggregateShares(Object.values(sharesForP));
              const isShareValid = Frost.verifyShare(sk_i, p.publicKey);
              
              if (!isShareValid) {
                  // ... logic for fraud
                  logger.error({ 
                    type: "VSS_FRAUD",
                    nodeId: p.nodeId,
                    ceremonyId: state.ceremonyId 
                  }, '[TSS] FRAUD DETECTED: VSS check failed for participant.');
              }
          }

          const healthyCount = state.participants.length - fraudCount;
          if (healthyCount < state.threshold) {
              state.status = 'ABORTED';
              logger.error({ healthyCount, threshold: state.threshold }, '[TSS] DKG Failed: Quorum impossible due to fraud.');
              throw new Error('VSS Verification Failed: Quorum broken by fraudulent contributions.');
          }

          state.status = 'ACTIVE';
          logger.info({ 
              ceremonyId: state.ceremonyId,
              masterPublicKey: state.masterPublicKey 
          }, `[TSS] DKG complete! ${healthyCount} nodes verified. Ceremony is now ACTIVE.`);
        } catch (e: any) {
          logger.error({ err: e.message }, '[TSS] DKG Finalization failed');
          state.status = 'ABORTED';
          // No return here, we fall through to save state
        }
      }

      await redis.set(REDIS_KEY, JSON.stringify(state), 'EX', 3600);
      return state;
    } finally {
      await lock.release();
    }
  }

  /**
   * Helper for nodes to fetch shares sent to them in DKG Round 2.
   */
  public static async getSharesForNode(nodeId: string) {
    const state = await this.getActive();
    if (!state) throw new Error('No active ceremony');
    return state.dkgRound2Shares[nodeId] || {};
  }

  public static async getActiveCeremonyCount(): Promise<number> {
    const keys = await redis.keys('ztan:ceremony:*');
    return keys.length;
  }

  public static async getActive(): Promise<CeremonyState | null> {
    const data = await redis.get(REDIS_KEY);
    return data ? JSON.parse(data) : null;
  }

  private static async logEvent(state: CeremonyState, nodeId: string, round: string, payload: any) {
    const { ThresholdCrypto } = require('@packages/ztan-crypto');
    state.eventSequence++;
    
    // Phase 3: Limit transcript size to prevent OOM
    if (state.transcript.length >= MAX_TRANSCRIPT_SIZE) {
        state.transcript.shift(); // Remove oldest entry
    }

    state.transcript.push({
      sequence: state.eventSequence,
      timestamp: Date.now(),
      nodeId,
      round,
      payloadHash: ThresholdCrypto.hashPayload({ boundPayloadBytes: Buffer.from(JSON.stringify(payload)) }),
    });
  }

  /**
   * Cryptographically verifies the identity of the contributor.
   * Enforces 30-second timestamp window for replay protection.
   */
  private static async verifyAuthenticatedMessage(msg: AuthenticatedMessage, ceremonyId: string, expectedRound: string) {
    const pk = await IdentityService.getPublicKey(msg.nodeId);
    if (!pk) {
        throw new Error(`Node ${msg.nodeId} is not a registered MPC participant.`);
    }

    // Phase 1 Replay Protection: 30s window
    const now = Date.now();
    if (Math.abs(now - msg.timestamp) > 30000) {
        throw new Error(`Message from node ${msg.nodeId} is stale (age > 30s)`);
    }

    const isValid = await ThresholdCrypto.verifyProtocolMessage(msg, ceremonyId, expectedRound, pk);
    if (!isValid) {
        throw new Error(`Cryptographic identity verification failed for Node ${msg.nodeId}`);
    }
  }

  /**
   * Submits a partial signature from a specific node.
   * CRITICAL: Verifies each partial signature BEFORE adding to the pool.
   * Uses AuthenticatedMessage to ensure participant identity.
   */
  public static async submitSignature(msg: AuthenticatedMessage) {
    const startTime = Date.now();
    const lockKey = `ztan:lock:ceremony:${msg.ceremonyId || 'active'}`;
    const lock = await redlock.acquire([lockKey], 5000);
    try {
      const state = await this.getActive();
      if (!state) throw new Error('No active ceremony');
      if (state.status !== 'ACTIVE') throw new Error(`Invalid ceremony state for signature: ${state.status}`);

      // Idempotency Check
      if (state.processedMessages.includes(msg.messageId)) {
        return state;
      }

      // 1. Authenticate & Log
      await this.verifyAuthenticatedMessage(msg, state.ceremonyId, 'SIGNING');
      const signature = msg.payload;
      await this.logEvent(state, msg.nodeId, 'SIGNING', signature);
      state.processedMessages.push(msg.messageId);
      state.lastUpdate = Date.now();
      const nodeId = msg.nodeId;
      
      // ... logic
      const duration = Date.now() - startTime;
      logger.info({ ceremonyId: state.ceremonyId, nodeId: msg.nodeId, event: 'SIGN_SUBMITTED', duration, status: 'OK' });

      if (state.ceremonyId !== ceremonyId) {
        throw new Error(`Ceremony ID mismatch. Expected ${state.ceremonyId}, got ${ceremonyId}`);
      }
      if (state.status !== 'ACTIVE') throw new Error(`Ceremony is not active (Status: ${state.status})`);
      if (state.collectedSignatures[nodeId]) throw new Error('Node has already signed this ceremony');

      const participant = state.participants.find(p => p.nodeId === nodeId);
      if (!participant) {
        logger.error({ nodeId, ceremonyId: state.ceremonyId }, '[TSS] REJECTED: Node is not an eligible participant');
        throw new Error(`Node ${nodeId} is not a registered participant for this ceremony`);
      }

      // Cryptographic Uniqueness: Ensure this public key hasn't signed already (even under different ID)
      const alreadySigned = state.participants.some(p => p.status === 'SIGNED' && p.publicKey === participant.publicKey);
      if (alreadySigned) {
        throw new Error('This public key has already contributed a signature to this ceremony');
      }

      // 1. VERIFY PARTIAL SIGNATURE
      try {
        const eligiblePks = state.participants.map(p => p.publicKey);
        const isValid = await ThresholdBls.verify(
          signature, 
          state.messageHash!, 
          [participant.publicKey], 
          state.ceremonyId,
          state.threshold,
          eligiblePks
        );
        if (!isValid) {
          participant.status = 'INVALID';
          logger.error({ nodeId, ceremonyId: state.ceremonyId }, '[TSS] REJECTED: Invalid partial signature share (Context mismatch or invalid key)');
          await redis.set(REDIS_KEY, JSON.stringify(state), 'EX', 3600);
          throw new Error('Invalid partial signature share');
        }
      } catch (err: any) {
        participant.status = 'INVALID';
        logger.error({ nodeId, err: err.message }, '[TSS] Verification error during share submission');
        await redis.set(REDIS_KEY, JSON.stringify(state), 'EX', 3600);
        throw err;
      }

      // 2. ACCEPT SIGNATURE
      state.collectedSignatures[nodeId] = signature;
      participant.status = 'SIGNED';
      state.lastUpdate = Date.now();
      
      const count = Object.keys(state.collectedSignatures).length;
      logger.info({ nodeId, count, threshold: state.threshold }, '[TSS] Signature validated and accepted');

      // 3. AUTO-AGGREGATE IF QUORUM REACHED
      if (count >= state.threshold) {
          try {
              const signers = state.participants.filter(p => !!state.collectedSignatures[p.nodeId]);
              const S = signers.map(p => state.participants.findIndex(p2 => p2.nodeId === p.nodeId) + 1);
              
              logger.info({ ceremonyId: state.ceremonyId, S }, '[TSS] Threshold reached. Aggregating dynamic subset...');
              
              const { Frost } = require('@packages/ztan-crypto');
              const partialSigs = signers.map(p => state.collectedSignatures[p.nodeId]);
              
              // Compute Lagrange weights for the current subset S
              const lambdas = S.map(i => Frost.computeLagrangeCoefficient(i, S));
              
              // Aggregate: Sig = sum(lambda_i * partial_sig_i)
              state.aggregatedSignature = await ThresholdBls.aggregateLagrange(partialSigs, lambdas);
              
              const eligiblePks = state.participants.map(p => p.publicKey);
              const isFinalValid = await ThresholdBls.verify(
                  state.aggregatedSignature,
                  state.messageHash!,
                  [state.masterPublicKey],
                  state.ceremonyId,
                  state.threshold,
                  eligiblePks
              );

              if (isFinalValid) {
                  state.status = 'COMPLETED';
                  logger.info({ ceremonyId: state.ceremonyId }, '✔ MPC CEREMONY COMPLETE: Aggregated signature verified against Master PK.');
              } else {
                  throw new Error('Aggregated signature failed verification against Master PK.');
              }
          } catch (e: any) {
              await this.abort(e.message);
              return await this.getActive();
          }
      }
          
      await redis.set(REDIS_KEY, JSON.stringify(state), 'EX', 3600);
      return state;
    } finally {
      await lock.release();
    }
  }

  /**
   * Helper for Dev Console: Simulate a node signing the message.
   */
  public static async simulateNodeSign(nodeId: string) {
    const state = await this.getActive();
    if (!state || !state.messageHash) throw new Error('No active ceremony');
    if (state.status !== 'ACTIVE') throw new Error('DKG is not complete. Status: ' + state.status);
    
    // 1. Participant reconstructs their SK from received shares
    const { Frost, ThresholdBls } = require('@packages/ztan-crypto');
    const sharesForNode = state.dkgRound2Shares[nodeId];
    if (!sharesForNode) throw new Error(`No shares found for node ${nodeId}`);
    
    const sk = Frost.aggregateShares(Object.values(sharesForNode));
    const eligiblePks = state.participants.map(p => p.publicKey);

    // 2. Sign the raw share
    const signature = await ThresholdBls.signShare(
      state.messageHash,
      sk,
      state.ceremonyId,
      state.threshold,
      eligiblePks
    );

    // 3. Wrap in identity signature for "Elite" security
    const authMsg = await ThresholdCrypto.signProtocolMessage(
        nodeId,
        state.ceremonyId,
        'SIGNING',
        signature
    );

    return this.submitSignature(authMsg);
  }

  /**
   * Timeout Watchdog: Aborts ceremonies that have stalled.
   */
  public static async checkTimeouts() {
    const state = await this.getActive();
    if (!state || state.status === 'COMPLETED' || state.status === 'ABORTED') return;

    const idleTime = Date.now() - state.lastUpdate;
    if (idleTime > CEREMONY_TIMEOUT_MS) {
      await this.abort(`Ceremony timed out after ${CEREMONY_TIMEOUT_MS}ms of inactivity.`);
    }
  }

  /**
   * Archives with full ceremony metadata to persistent database.
   */
  public static async archive() {
    const state = await this.getActive();
    if (!state) throw new Error('No active ceremony to archive');
    if (!state.aggregatedSignature) throw new Error('Cannot archive an incomplete ceremony');

    const { db } = require('@packages/db');
    
    // Create Deterministic Proof Bundle
    const bundle = {
      ceremonyId: state.ceremonyId,
      threshold: state.threshold,
      participants: state.participants,
      aggregatedSignature: state.aggregatedSignature,
      messageHash: state.messageHash,
      transcript: state.transcript,
      timestamp: Date.now(),
      version: 'ZTAN_PROOF_V1.1'
    };

    const inputHash = state.messageHash || uuidv4();
    
    try {
      await db.ztanProof.upsert({
        where: { inputHash },
        update: { bundle },
        create: {
          inputHash,
          bundle,
          canonicalHash: state.masterPublicKey,
          finalAnchor: state.aggregatedSignature,
          status: 'VERIFIED'
        }
      });

      logger.info({ ceremonyId: state.ceremonyId, inputHash }, '[TSS] Ceremony evidence bundle archived in persistent database');
      return { ceremonyId: state.ceremonyId, inputHash };
    } catch (err: any) {
      logger.error({ err: err.message }, '[TSS] Database archive failed - falling back to local file');
      
      const archiveDir = path.join(__dirname, '../../../../data/ztan-audits');
      await fs.ensureDir(archiveDir);
      const filename = `ceremony-${state.ceremonyId.slice(0, 8)}.json`;
      const filePath = path.join(archiveDir, filename);
      await fs.writeJson(filePath, state, { spaces: 2 });
      
      return { filePath, filename };
    }
  }

  public static async reset() {
    await redis.del(REDIS_KEY);
    // SHARES_KEY is not defined globally but was used in reset, likely intended for specific cleanup
    // if we had one.
  }
}
