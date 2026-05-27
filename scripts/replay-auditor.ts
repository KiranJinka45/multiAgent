/**
 * ZTAN — Replay & Ledger Integrity Auditor
 * 
 * Audits cryptographic hash-chain continuity, block index monotonicity,
 * outbox transactional log convergence, and fencing epoch monotonicity.
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env') });

export interface AuditReport {
  overallPassed: boolean;
  timestamp: number;
  hashChain: {
    passed: boolean;
    totalBlocksVerified: number;
    fractures: Array<{ index: number; expectedPrevHash: string; actualPrevHash: string; blockId: string }>;
  };
  monotonicity: {
    passed: boolean;
    gaps: Array<{ beforeBlockId: string; afterBlockId: string }>;
  };
  outboxConvergence: {
    passed: boolean;
    pendingWalCount: number;
    duplicateWalSeqs: number[];
  };
  fencingEpoch: {
    passed: boolean;
    epochSequence: string[];
    retrogradeEpochs: Array<{ index: number; currentEpoch: string; previousEpoch: string }>;
  };
}

/**
 * Audits the ZTAN database ledger and outbox state for complete integrity.
 */
export async function runReplayAudit(dbUrl?: string): Promise<AuditReport> {
  const url = dbUrl || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set.');
  }

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  
  const report: AuditReport = {
    overallPassed: true,
    timestamp: Date.now(),
    hashChain: { passed: true, totalBlocksVerified: 0, fractures: [] },
    monotonicity: { passed: true, gaps: [] },
    outboxConvergence: { passed: true, pendingWalCount: 0, duplicateWalSeqs: [] },
    fencingEpoch: { passed: true, epochSequence: [], retrogradeEpochs: [] }
  };

  try {
    console.log(`[Auditor] Starting ZTAN Ledger Replay & Integrity Audit...`);

    // 1. Fetch blocks and WAL logs
    const blocks = await prisma.ztanLedgerBlock.findMany({ orderBy: { id: 'asc' } });
    const walLogs = await prisma.ztanWalLog.findMany({ orderBy: { seq: 'asc' } });

    console.log(`[Auditor] Retrieved ${blocks.length} blocks and ${walLogs.length} WAL log entries.`);

    // Helper to get partition and sequence for any blockId dynamically
    const getPartitionAndSequence = (blockId: string): { partition: string | 'canonical'; sequence: number } => {
      if (!blockId) {
        return { partition: 'shard-0', sequence: 0 };
      }
      
      if (blockId.startsWith('canonical-block-')) {
        const seqStr = blockId.replace('canonical-block-', '');
        const seq = parseInt(seqStr, 10);
        return { partition: 'canonical', sequence: isNaN(seq) ? 0 : seq };
      }
      
      if (blockId.includes(':')) {
        const parts = blockId.split(':');
        const prefix = parts.slice(0, -1).join(':');
        const suffix = parts[parts.length - 1];
        const seq = parseInt(suffix, 10);
        return { partition: prefix, sequence: isNaN(seq) ? 0 : seq };
      }
      
      const num = parseInt(blockId, 10);
      if (isNaN(num)) {
        return { partition: blockId, sequence: 0 };
      }
      
      let partition = 'shard-0';
      if (num >= 3000000) partition = 'shard-3';
      else if (num >= 2000000) partition = 'shard-2';
      else if (num >= 1000000) partition = 'shard-1';
      
      return { partition, sequence: num };
    };

    // Group blocks by partition
    const blocksByPartition = new Map<string | 'canonical', typeof blocks>();

    for (const block of blocks) {
      const { partition } = getPartitionAndSequence(block.blockId);
      if (!blocksByPartition.has(partition)) {
        blocksByPartition.set(partition, []);
      }
      blocksByPartition.get(partition)!.push(block);
    }

    // Sort blocks inside each partition by sequence
    for (const [part, partBlocks] of blocksByPartition.entries()) {
      partBlocks.sort((a, b) => {
        const seqA = getPartitionAndSequence(a.blockId).sequence;
        const seqB = getPartitionAndSequence(b.blockId).sequence;
        return seqA - seqB;
      });
    }

    // 2. Hash-Chain Continuity Audit
    report.hashChain.totalBlocksVerified = blocks.length;
    
    // Allowed initial genesis prevHashes for partition start
    const allowedGenesisPrevHashes = [
      'GENESIS_PREV_HASH',
      '0x0',
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    ];

    for (const [part, partBlocks] of blocksByPartition.entries()) {
      if (partBlocks.length === 0) continue;
      
      // The first block in a partition has specific prevHash expectations
      const firstBlock = partBlocks[0];
      if (!allowedGenesisPrevHashes.includes(firstBlock.prevHash)) {
        report.hashChain.passed = false;
        report.hashChain.fractures.push({
          index: 0,
          expectedPrevHash: part === 'canonical' ? 'GENESIS_PREV_HASH' : '0x0',
          actualPrevHash: firstBlock.prevHash,
          blockId: firstBlock.blockId
        });
      }

      // Check subsequent blocks in this partition
      for (let i = 1; i < partBlocks.length; i++) {
        const prevBlock = partBlocks[i - 1];
        const currentBlock = partBlocks[i];

        if (currentBlock.prevHash !== prevBlock.hash) {
          report.hashChain.passed = false;
          report.hashChain.fractures.push({
            index: i,
            expectedPrevHash: prevBlock.hash,
            actualPrevHash: currentBlock.prevHash,
            blockId: currentBlock.blockId
          });
        }
      }
    }

    // 3. Ledger Sequence Monotonicity (Sequential Block indexing: no ID or blockID gaps)
    for (const [part, partBlocks] of blocksByPartition.entries()) {
      for (let i = 1; i < partBlocks.length; i++) {
        const prevBlock = partBlocks[i - 1];
        const currentBlock = partBlocks[i];
        
        const prevSeq = getPartitionAndSequence(prevBlock.blockId).sequence;
        const currSeq = getPartitionAndSequence(currentBlock.blockId).sequence;

        if (currSeq !== prevSeq + 1) {
          report.monotonicity.passed = false;
          report.monotonicity.gaps.push({
            beforeBlockId: prevBlock.blockId,
            afterBlockId: currentBlock.blockId
          });
        }
      }
    }

    // 4. Outbox Convergence Audit
    const pendingWal = walLogs.filter(l => l.status === 'PENDING');
    report.outboxConvergence.pendingWalCount = pendingWal.length;
    if (pendingWal.length > 0) {
      report.outboxConvergence.passed = false;
    }

    // Check duplicate sequence indices
    const seqCounts = new Map<number, number>();
    for (const log of walLogs) {
      seqCounts.set(log.seq, (seqCounts.get(log.seq) || 0) + 1);
    }
    for (const [seq, count] of seqCounts.entries()) {
      if (count > 1) {
        report.outboxConvergence.duplicateWalSeqs.push(seq);
        report.outboxConvergence.passed = false;
      }
    }

    // 5. Fencing Monotonicity Audit
    // Epochs should be non-decreasing (monotonicity) per partition
    const allEpochs: string[] = [];
    for (const [part, partBlocks] of blocksByPartition.entries()) {
      for (const block of partBlocks) {
        if (block.epoch) {
          allEpochs.push(block.epoch);
        }
      }
    }
    report.fencingEpoch.epochSequence = allEpochs;

    const parseEpochToBigInt = (epochStr: string): bigint => {
      if (!epochStr) return 0n;
      const s = String(epochStr).trim();
      
      const hasMinus = s.startsWith('-');
      const digits = s.replace(/\D/g, '');
      if (!digits) return 0n;
      
      const stripped = digits.replace(/^0+/, '');
      const finalDigits = stripped || '0';
      const signedString = hasMinus && finalDigits !== '0' ? `-${finalDigits}` : finalDigits;
      
      try {
        return BigInt(signedString);
      } catch {
        return 0n;
      }
    };

    for (const [part, partBlocks] of blocksByPartition.entries()) {
      for (let i = 1; i < partBlocks.length; i++) {
        const prevBlock = partBlocks[i - 1];
        const currentBlock = partBlocks[i];
        
        if (!prevBlock.epoch || !currentBlock.epoch) continue;
        
        const prevEpoch = parseEpochToBigInt(prevBlock.epoch);
        const currEpoch = parseEpochToBigInt(currentBlock.epoch);
        if (currEpoch < prevEpoch) {
          report.fencingEpoch.passed = false;
          report.fencingEpoch.retrogradeEpochs.push({
            index: i,
            currentEpoch: currentBlock.epoch,
            previousEpoch: prevBlock.epoch
          });
        }
      }
    }

    // Overall verdict
    report.overallPassed = 
      report.hashChain.passed && 
      report.monotonicity.passed && 
      report.outboxConvergence.passed && 
      report.fencingEpoch.passed;

    console.log(`[Auditor] Audit finished. Verdict: ${report.overallPassed ? 'INTEGRITY SECURE ✅' : 'INTEGRITY FAILED ❌'}`);
    return report;
  } catch (err: any) {
    console.error(`[Auditor] Error during integrity audit: ${err.message}`);
    report.overallPassed = false;
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}
