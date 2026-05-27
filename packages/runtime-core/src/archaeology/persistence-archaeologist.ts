import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export interface GovernanceLedgerEntry {
  sequenceId: number;
  timestamp: string;
  type: 'GOVERNANCE' | 'REPLAY' | 'IDENTITY' | 'TELEMETRY' | 'POLICY';
  payload: string;
  operatorId: string;
  signature: string;
  hash: string;
  prevHash: string;
  epoch: string;
  verdict: 'VERIFIED' | 'DEGRADED' | 'UNTRUSTED';
}

export interface CorruptionInspectionResult {
  filePath: string;
  isParseable: boolean;
  hasTrailingNulls: boolean;
  trailingNullCount: number;
  isTornWrite: boolean;
  syntaxError?: string;
  totalBlocksScanned: number;
  corruptions: {
    sequenceId: number;
    types: ('HASH_MISMATCH' | 'MERKLE_LINK_BROKEN' | 'SIGNATURE_INVALID')[];
    details: string;
  }[];
  isValid: boolean;
}

export interface RollbackAuditResult {
  hasDiscrepancy: boolean;
  divergenceType?: 'DB_AHEAD' | 'DISK_AHEAD' | 'STATE_DIVERGENCE' | 'NONE';
  dbBlockCount: number;
  diskBlockCount: number;
  mismatches: {
    sequenceId: number;
    dbHash?: string;
    diskHash?: string;
    reason: string;
  }[];
}

export interface RepairStats {
  success: boolean;
  originalSizeBytes: number;
  repairedSizeBytes: number;
  repairedBlockCount: number;
  prunedBlockCount: number;
  errorMessage?: string;
}

export class PersistenceArchaeologist {
  /**
   * Scans a ledger file for torn writes, zeroed padding, hash inconsistencies, Merkle breaches, or bad signatures.
   */
  public async inspectBlockLevelCorruption(
    filePath: string,
    publicKeyPem?: string
  ): Promise<CorruptionInspectionResult> {
    const result: CorruptionInspectionResult = {
      filePath,
      isParseable: false,
      hasTrailingNulls: false,
      trailingNullCount: 0,
      isTornWrite: false,
      totalBlocksScanned: 0,
      corruptions: [],
      isValid: false
    };

    if (!fs.existsSync(filePath)) {
      result.syntaxError = 'File does not exist';
      return result;
    }

    const buffer = fs.readFileSync(filePath);
    const contentStr = buffer.toString('utf8');

    // 1. Detect trailing null-bytes / zeroed padding (common in ext4/xfs delayed allocations)
    let nullCount = 0;
    for (let i = buffer.length - 1; i >= 0; i--) {
      if (buffer[i] === 0) {
        nullCount++;
      } else {
        break;
      }
    }

    if (nullCount > 0) {
      result.hasTrailingNulls = true;
      result.trailingNullCount = nullCount;
    }

    // 2. Try parsing the JSON ledger
    let entries: GovernanceLedgerEntry[] = [];
    try {
      entries = JSON.parse(contentStr.replace(/\u0000+$/, '')); // strip trailing nulls for parse attempt
      result.isParseable = true;
    } catch (err: any) {
      result.isParseable = false;
      result.syntaxError = err.message;
      // If we have trailing nulls or unclosed brackets, it's a torn write
      const trimmed = contentStr.trim();
      const isTruncatedJson = trimmed.startsWith('[') && !trimmed.endsWith(']');
      if (nullCount > 0 || isTruncatedJson || err.message.includes('Unexpected end of JSON input')) {
        result.isTornWrite = true;
      }
      return result;
    }

    result.totalBlocksScanned = entries.length;

    // 3. Resolve public key for NIST P-256 signature checks
    let pubKey: crypto.KeyObject | null = null;
    if (publicKeyPem) {
      try {
        pubKey = crypto.createPublicKey(publicKeyPem);
      } catch (e) {}
    } else {
      // Look for default operator key
      const defaultPubKeyPath = path.join(process.cwd(), '.ztan-transparency', 'keys', 'operator.pub');
      if (fs.existsSync(defaultPubKeyPath)) {
        try {
          const pem = fs.readFileSync(defaultPubKeyPath, 'utf8');
          pubKey = crypto.createPublicKey(pem);
        } catch (e) {}
      }
    }

    // 4. Audit Block Chain Hash and Cryptographic Signatures
    let prevHash = entries[0] ? entries[0].prevHash : '';
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const corruptTypes: CorruptionInspectionResult['corruptions'][0]['types'] = [];
      const detailsArr: string[] = [];

      // A. Verify computed SHA-256 Hash matches block hash
      const computedHash = this.computeHash(entry);
      if (computedHash !== entry.hash) {
        corruptTypes.push('HASH_MISMATCH');
        detailsArr.push(`Computed hash ${computedHash} does not match entry.hash ${entry.hash}`);
      }

      // B. Verify Merkle Chain Links
      if (i > 0) {
        const expectedPrevHash = entries[i - 1].hash;
        if (entry.prevHash !== expectedPrevHash) {
          corruptTypes.push('MERKLE_LINK_BROKEN');
          detailsArr.push(`Expected prevHash ${expectedPrevHash} but got ${entry.prevHash}`);
        }
      }

      // C. Verify operator cryptographic signature
      if (pubKey) {
        const isSigValid = this.verifySignature(entry.payload, entry.signature, pubKey);
        if (!isSigValid) {
          corruptTypes.push('SIGNATURE_INVALID');
          detailsArr.push('NIST P-256 signature verification failed');
        }
      }

      if (corruptTypes.length > 0) {
        result.corruptions.push({
          sequenceId: entry.sequenceId,
          types: corruptTypes,
          details: detailsArr.join('; ')
        });
      }
    }

    result.isValid = result.isParseable && !result.hasTrailingNulls && result.corruptions.length === 0;
    return result;
  }

  /**
   * Audits consistency/rollback parity between DB consensus records and disk-level block sequences.
   */
  public auditRollbackParity(dbBlocks: any[], fileBlocks: any[]): RollbackAuditResult {
    const result: RollbackAuditResult = {
      hasDiscrepancy: false,
      divergenceType: 'NONE',
      dbBlockCount: dbBlocks.length,
      diskBlockCount: fileBlocks.length,
      mismatches: []
    };

    // Sort both sets by sequenceId or blockId (which corresponds to sequenceId)
    const getSeqId = (b: any) => parseInt(b.sequenceId ?? b.blockId, 10);
    const sortedDb = [...dbBlocks].sort((a, b) => getSeqId(a) - getSeqId(b));
    const sortedDisk = [...fileBlocks].sort((a, b) => getSeqId(a) - getSeqId(b));

    const dbMap = new Map<number, any>(sortedDb.map(b => [getSeqId(b), b]));
    const diskMap = new Map<number, any>(sortedDisk.map(b => [getSeqId(b), b]));

    const allSeqIds = Array.from(new Set([...dbMap.keys(), ...diskMap.keys()])).sort((a, b) => a - b);

    for (const seqId of allSeqIds) {
      const dbBlock = dbMap.get(seqId);
      const diskBlock = diskMap.get(seqId);

      if (dbBlock && !diskBlock) {
        result.mismatches.push({
          sequenceId: seqId,
          dbHash: dbBlock.hash,
          reason: 'Block exists in database but is missing from disk (DB_AHEAD / Disk loss)'
        });
      } else if (!dbBlock && diskBlock) {
        result.mismatches.push({
          sequenceId: seqId,
          diskHash: diskBlock.hash,
          reason: 'Block exists on disk but is missing from database (DISK_AHEAD / DB Rollback)'
        });
      } else if (dbBlock && diskBlock) {
        // Compare hashes to ensure state matches
        if (dbBlock.hash !== diskBlock.hash) {
          result.mismatches.push({
            sequenceId: seqId,
            dbHash: dbBlock.hash,
            diskHash: diskBlock.hash,
            reason: `Hash mismatch at sequence ${seqId}. DB: ${dbBlock.hash}, Disk: ${diskBlock.hash}`
          });
        }
      }
    }

    if (result.mismatches.length > 0) {
      result.hasDiscrepancy = true;
      // Determine overall divergence type classification
      const dbOnly = result.mismatches.every(m => m.reason.includes('missing from disk'));
      const diskOnly = result.mismatches.every(m => m.reason.includes('missing from database'));
      if (dbOnly) {
        result.divergenceType = 'DB_AHEAD';
      } else if (diskOnly) {
        result.divergenceType = 'DISK_AHEAD';
      } else {
        result.divergenceType = 'STATE_DIVERGENCE';
      }
    }

    return result;
  }

  /**
   * Recovers torn-writes dynamically by truncating corrupt/null-filled endings back to the last valid block.
   * Guarantees quarantine-first backups and requires explicit operator approval before modifying ledger state.
   */
  public async attemptRepair(
    filePath: string,
    requireOperatorApproval: boolean = true,
    operatorApproved: boolean = false,
    backupPath?: string
  ): Promise<RepairStats> {
    const stats: RepairStats = {
      success: false,
      originalSizeBytes: 0,
      repairedSizeBytes: 0,
      repairedBlockCount: 0,
      prunedBlockCount: 0
    };

    if (!fs.existsSync(filePath)) {
      stats.errorMessage = 'File does not exist';
      return stats;
    }

    const buffer = fs.readFileSync(filePath);
    stats.originalSizeBytes = buffer.length;
    let content = buffer.toString('utf8');

    // Clean trailing null-bytes first
    content = content.replace(/\u0000+$/, '').trim();

    // Iterate backwards from the end of the content to find parseable prefixes
    let repaired = false;
    let entries: GovernanceLedgerEntry[] = [];

    // Scan backwards for potential closing curly braces
    let lastBraceIdx = content.lastIndexOf('}');
    while (lastBraceIdx !== -1) {
      const candidateSub = content.slice(0, lastBraceIdx + 1);
      const attemptStr = candidateSub.endsWith(']') ? candidateSub : `${candidateSub}]`;
      
      try {
        const parsed = JSON.parse(attemptStr);
        if (Array.isArray(parsed)) {
          entries = parsed;
          repaired = true;
          break;
        }
      } catch (e) {
        // Continue backtracking
      }
      lastBraceIdx = content.lastIndexOf('}', lastBraceIdx - 1);
    }

    if (!repaired) {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          entries = parsed;
          repaired = true;
        }
      } catch (e) {
        stats.errorMessage = 'No valid JSON block sequence prefix could be extracted';
        return stats;
      }
    }

    if (repaired) {
      // 1. Enforce quarantine-first backup
      const quarantineDir = path.join(path.dirname(filePath), '..', 'quarantine');
      if (!fs.existsSync(quarantineDir)) {
        fs.mkdirSync(quarantineDir, { recursive: true });
      }
      const quarantineBackupPath = path.join(quarantineDir, `corrupt-ledger-backup-${Date.now()}.json`);
      fs.writeFileSync(quarantineBackupPath, buffer);

      // 2. Perform secondary backup if requested
      if (backupPath) {
        fs.writeFileSync(backupPath, buffer);
      }

      // 3. Operator approval check before actual mutation
      if (requireOperatorApproval && !operatorApproved) {
        stats.errorMessage = `Operator approval required for storage repair. Corrupt ledger quarantined to ${quarantineBackupPath}`;
        stats.success = false;
        return stats;
      }

      // Write repaired content back
      const repairedJson = JSON.stringify(entries, null, 2);
      fs.writeFileSync(filePath, repairedJson, 'utf8');

      stats.success = true;
      stats.repairedSizeBytes = Buffer.byteLength(repairedJson, 'utf8');
      stats.repairedBlockCount = entries.length;
      stats.prunedBlockCount = Math.max(0, stats.originalSizeBytes > stats.repairedSizeBytes ? 1 : 0);
    }

    return stats;
  }

  // --- HASHING & SIGNATURE UTILITIES ---

  private computeHash(entry: Omit<GovernanceLedgerEntry, 'hash'>): string {
    const canonicalStr = [
      entry.prevHash,
      entry.sequenceId.toString(),
      entry.timestamp,
      entry.type,
      entry.payload,
      entry.operatorId,
      entry.signature,
      entry.epoch,
      entry.verdict
    ].join('|');

    return '0x' + crypto.createHash('sha256').update(canonicalStr).digest('hex');
  }

  private verifySignature(payload: string, signatureBase64: string, publicKey: crypto.KeyObject): boolean {
    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(payload);
      verify.end();
      return verify.verify(publicKey, Buffer.from(signatureBase64, 'base64'));
    } catch (e) {
      return false;
    }
  }
}
