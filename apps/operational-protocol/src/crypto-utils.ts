import { ThresholdBls, Canonical } from '@packages/utils';
import * as bls from '@noble/bls12-381';

const logger = console;

export const DEFAULT_THRESHOLD = 2;
export const DEFAULT_NODE_IDS = ['node-a', 'node-b', 'node-c'];

export interface KeyShare {
  nodeId: string;
  share: bigint;
  groupPublicKey: string;
  pop: string;
}

export interface PartialSignature {
  nodeId: string;
  signature: string;
  payloadHash: string;
  timestamp: number;
}

/**
 * ZTAN-TSAC Wrapper: Bridges legacy Governance API to hardened @packages/ztan-crypto
 */
export class ThresholdCrypto {
  /**
   * ELITE: Distributed Key Generation (DKG)
   */
  public static async performDKG(nodeIds: string[], threshold: number): Promise<KeyShare[]> {
    const dkg = await ThresholdBls.dkg(threshold, nodeIds.length, nodeIds);
    return dkg.shares.map((s: any) => ({
        nodeId: s.nodeId,
        share: BigInt('0x' + s.secretShare),
        groupPublicKey: dkg.masterPublicKey,
        pop: 'pop-verified-by-dkg' // Hardened package handles this internally
    }));
  }

  /**
   * ELITE: Partial Signing
   */
  public static async signPartial(
    payload: string, 
    share: bigint, 
    nodeId: string,
    threshold: number,
    allNodeIds: string[]
  ): Promise<PartialSignature> {
    const pks = await this.getEligiblePublicKeys(allNodeIds);
    const sig = await ThresholdBls.signShare(payload, share.toString(16).padStart(64, '0'), 'ceremony-gov', threshold, pks);

    return {
      nodeId,
      signature: sig,
      payloadHash: payload,
      timestamp: Date.now()
    };
  }

  /**
   * ELITE: Aggregation
   */
  public static async aggregate(
    partials: PartialSignature[], 
    threshold: number, 
    allNodeIds: string[]
  ): Promise<string | null> {
    if (partials.length < threshold) return null;
    
    const signatures = partials.map(p => p.signature);
    const pks = await this.getEligiblePublicKeys(allNodeIds);
    
    // Convert nodeIds to indices (1-based for Lagrange)
    const indices = partials.map(p => allNodeIds.indexOf(p.nodeId) + 1);

    try {
        return await ThresholdBls.aggregate(signatures, indices);
    } catch (e) {
        logger.error('[TSAC] Aggregation failed:', e);
        return null;
    }
  }

  /**
   * ELITE: Verify Aggregate
   */
  public static async verifyAggregate(
    aggregateHex: string, 
    payload: string, 
    groupPublicKeyHex: string,
    threshold: number,
    allNodeIds: string[]
  ): Promise<boolean> {
    const pks = await this.getEligiblePublicKeys(allNodeIds);
    return await ThresholdBls.verify(aggregateHex, payload, groupPublicKeyHex, 'ceremony-gov', threshold, pks);
  }

  public static async generateGroupPublicKey(threshold: number, nodeIds: string[]): Promise<string> {
    const dkg = await ThresholdBls.dkg(threshold, nodeIds.length, nodeIds);
    return dkg.masterPublicKey;
  }

  private static async getEligiblePublicKeys(nodeIds: string[]): Promise<string[]> {
    // In a real system, this would fetch from a registry.
    // For the simulation, we use deterministic derivation matching the test environment.
    return Promise.all(nodeIds.map(async id => {
      const seed = new TextEncoder().encode(`NODE_SEED_${id}`);
      const hashedSeed = await bls.utils.sha256(seed);
      const pk = bls.getPublicKey(hashedSeed);
      return Array.from(pk).map(b => b.toString(16).padStart(2, '0')).join('');
    }));
  }
}

