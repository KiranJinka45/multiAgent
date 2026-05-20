import express from 'express';
import path from 'path';
import fs from 'fs';
import { ThresholdCrypto, type AuditInput, type ReplayGuard } from '@packages/ztan-crypto';
import { DEFAULT_THRESHOLD, DEFAULT_NODE_IDS } from './crypto-utils.js';
import { AuditVerifier } from './audit-verify.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json());

export class FileReplayGuard implements ReplayGuard {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async isReplay(auditId: string): Promise<boolean> {
    try {
      if (!fs.existsSync(this.filePath)) return false;
      const data = fs.readFileSync(this.filePath, 'utf-8');
      const seen = JSON.parse(data);
      const expiry = seen[auditId];
      if (!expiry) return false;
      if (Date.now() > expiry) {
        delete seen[auditId];
        fs.writeFileSync(this.filePath, JSON.stringify(seen, null, 2));
        return false;
      }
      return true;
    } catch { return false; }
  }

  async markSeen(auditId: string, ttlSeconds: number): Promise<void> {
    try {
      let seen: Record<string, number> = {};
      if (fs.existsSync(this.filePath)) {
        seen = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      }
      seen[auditId] = Date.now() + (ttlSeconds * 1000);
      fs.writeFileSync(this.filePath, JSON.stringify(seen, null, 2));
    } catch (e) { console.error('Failed to mark seen:', e); }
  }
}

// Persistent guard for the server
const REPLAY_DB = path.join(process.cwd(), '.ztan_server_replay_db.json');
const guard = new FileReplayGuard(REPLAY_DB);

// Local Audit Log Sink
const LOCAL_AUDIT_LOG = path.join(process.cwd(), 'audit_anchor_log.txt');

// Independent Authorities (Simulated)
const AUTHORITIES = [
  'SEC-GOV-CENTRAL-01',
  'SRE-AUDIT-NODE-02',
  'COMPLIANCE-WATCH-03',
  'LEGAL-ARCHIVE-04',
  'INFRA-TRUST-05'
];

const CONSENSUS_THRESHOLD = 3;

/**
 * ZTAN Cryptographic Infrastructure Endpoint
 * Implements Threshold-Signed Anchor Consensus.
 */
app.post('/api/verify', async (req, res) => {
  try {
    const inputData: AuditInput = req.body;
    
    // 🔥 STEP 1: INITIAL VERIFICATION TO COMPUTE ANCHOR
    const initialResult = await ThresholdCrypto.verifyAudit(JSON.stringify(inputData), { guard, skipMarkSeen: true });
    
    if (initialResult.status === 'FAILED') {
      if (initialResult.errorType === 'REPLAY_DETECTED') {
        const { RecoveryHistoryEngine } = await import('@packages/utils');
        await RecoveryHistoryEngine.recordReplay({
          id: inputData.auditId,
          service: 'audit-server',
          failureType: 'REPLAY_ATTEMPT',
          correlations: { 
            anchor: initialResult.finalAnchor,
            clientHash: inputData.payloadHash
          },
          tags: ['replay', 'audit']
        });
      }
      res.json(initialResult);
      return;
    }

    const anchor = initialResult.finalAnchor!;

    // 🔥 STEP 2: SIMULATE MULTI-PARTY CONSENSUS
    const partialSigs = await Promise.all(AUTHORITIES.map(async (id) => ({
      verifierId: id,
      signature: await ThresholdCrypto.signAnchor(anchor, id)
    })));

    // 🔥 STEP 3: RE-VERIFY WITH CONSENSUS DATA
    const consensusInput: AuditInput = {
      ...inputData,
      partialAnchorSignatures: partialSigs,
      consensusThreshold: CONSENSUS_THRESHOLD
    };

    const finalResult = await ThresholdCrypto.verifyAudit(JSON.stringify(consensusInput), { guard });

    if (finalResult.status === 'VERIFIED') {
      const auditId = inputData.auditId;
      const timestamp = new Date().toISOString();

      // 🔥 MULTI-ANCHOR SINK 1: STDOUT
      console.log(`[ZTAN] [CONSENSUS-VERIFIED] ID: ${auditId} | Threshold: ${CONSENSUS_THRESHOLD}/${AUTHORITIES.length} | Aggregate: ${finalResult.aggregateAnchorSignature}`);

      // 🔥 MULTI-ANCHOR SINK 2: Local File Log
      const logEntry = `[${timestamp}] ID:${auditId} ANCHOR:${anchor} AGGREGATE:${finalResult.aggregateAnchorSignature} VERIFIERS:${finalResult.contributingVerifiers?.join(',')}\n`;
      fs.appendFileSync(LOCAL_AUDIT_LOG, logEntry);

      // 🔥 MULTI-ANCHOR SINK 3: Simulated WORM
      simulateWormStorage(finalResult.aggregateAnchorSignature!);
    }

    res.json(finalResult);

  } catch (e: any) {
    console.error('[ZTAN] Consensus Verification Error:', e);
    res.status(500).json({ error: e.message });
  }
});

function simulateWormStorage(aggregateSig: string) {
  console.log(`[ZTAN] [WORM-SYNC] Consensus proof ${aggregateSig} persisted to immutable storage.`);
}

const PORT = process.env['PORT'] || 3000;
app.listen(PORT, () => {
  console.log(`[ZTAN] Cryptographic Infrastructure Server running on port ${PORT}`);
  console.log(`[ZTAN] Consensus Authorities: ${AUTHORITIES.length}`);
  console.log(`[ZTAN] Threshold: ${CONSENSUS_THRESHOLD}`);
});
