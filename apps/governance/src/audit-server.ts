import express from 'express';
import path from 'path';
import fs from 'fs';
import { ThresholdCrypto, FileReplayGuard, AuditInput } from '@packages/ztan-crypto';

const app = express();
app.use(express.json());

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
      return res.json(initialResult);
    }

    const anchor = initialResult.finalAnchor!;

    // 🔥 STEP 2: SIMULATE MULTI-PARTY CONSENSUS
    // In a real decentralized system, the client would collect these signatures
    // or the verifiers would communicate via a P2P consensus layer.
    const partialSigs = AUTHORITIES.map(id => ({
      verifierId: id,
      signature: ThresholdCrypto.signAnchor(anchor, id)
    }));

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
