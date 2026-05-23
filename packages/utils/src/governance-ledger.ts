import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import * as os from 'node:os';
import {
  logger,
  leaseFencingRevocationsTotal,
  activeLeaseGeneration,
  heartbeatDriftSeconds,
  invariantBreachesTotal
} from '@packages/observability';
import { db } from '@packages/db';

const LEDGER_DIR = path.join(process.cwd(), '.ztan-transparency');
const LEDGER_FILE = path.join(LEDGER_DIR, 'governance_ledger.json');
const OUTBOX_FILE = path.join(LEDGER_DIR, 'outbox_queue.json');
const KEYS_DIR = path.join(LEDGER_DIR, 'keys');
const OPERATOR_PRIV_FILE = path.join(KEYS_DIR, 'operator.key');
const OPERATOR_PUB_FILE = path.join(KEYS_DIR, 'operator.pub');

const LOCK_FILE = path.join(LEDGER_DIR, 'ledger.lock');
const LOCK_TIMEOUT_MS = 25000;
const LOCK_LEASE_MS = 30000;
const LOCK_RETRY_INTERVAL_MS = 50;

interface LockMetadata {
  pid: number;
  timestamp: string;
  generation: number; // Monotonically strictly increasing fencing token
}

let reconciliationInterval: NodeJS.Timeout | null = null;
let eventLoopLag = 0;
let lastLagSample = Date.now();
const lagSampler = setInterval(() => {
  const now = Date.now();
  eventLoopLag = Math.max(0, now - lastLagSample - 100);
  lastLagSample = now;
}, 100);
if (lagSampler && typeof lagSampler.unref === 'function') {
  lagSampler.unref();
}

function getOrCreateOperatorKeys(): { privateKey: crypto.KeyObject; publicKey: crypto.KeyObject } {
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }

  if (fs.existsSync(OPERATOR_PRIV_FILE) && fs.existsSync(OPERATOR_PUB_FILE)) {
    const privPem = fs.readFileSync(OPERATOR_PRIV_FILE, 'utf8');
    const pubPem = fs.readFileSync(OPERATOR_PUB_FILE, 'utf8');
    return {
      privateKey: crypto.createPrivateKey(privPem),
      publicKey: crypto.createPublicKey(pubPem)
    };
  } else {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1' // NIST P-256 curve (prime256v1 in OpenSSL)
    });

    fs.writeFileSync(OPERATOR_PRIV_FILE, privateKey.export({ type: 'pkcs8', format: 'pem' }), 'utf8');
    fs.writeFileSync(OPERATOR_PUB_FILE, publicKey.export({ type: 'spki', format: 'pem' }), 'utf8');

    return { privateKey, publicKey };
  }
}

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

export type ZtanState = 'ACTIVE' | 'DEGRADED' | 'FENCED' | 'QUARANTINED' | 'REBUILDING' | 'REPLAYING' | 'READ_ONLY';

export function parseCorrelationAndPayload(payload: string, timestamp: string, operatorId: string) {
  const match = payload.match(/\[CorrelationTrace:\s*requestUuid=([a-fA-F0-9-]+),\s*auditUuid=([a-fA-F0-9-]+),\s*outboxUuid=([a-fA-F0-9-]+),\s*ledgerBlockUuid=([a-fA-F0-9-]+)\]/);
  if (!match) return null;

  const requestUuid = match[1];
  const auditUuid = match[2];
  const outboxUuid = match[3];
  const ledgerBlockUuid = match[4];

  // Check if it's a resolution/mitigation
  const resolveMatch = payload.match(/MITIGATION SUCCESSFUL:\s*Drill\s+(\S+)\s+resolved\.\s*Actions:\s*(.*?)\.\s*Reaction Time:\s*(\d+(?:\.\d+)?)s\.\s*Signature:\s*(\S+)/);
  if (resolveMatch) {
    const drillId = resolveMatch[1];
    const actionsTaken = resolveMatch[2];
    const reactionTime = parseFloat(resolveMatch[3]);
    const signature = resolveMatch[4];
    return {
      auditUuid,
      action: `DRILL_RESOLVED:${drillId}`,
      resource: 'ZTAN_GOVERNANCE',
      userId: signature || operatorId,
      metadata: {
        reactionTime,
        actionsTaken,
        signature,
        requestUuid,
        auditUuid,
        outboxUuid,
        ledgerBlockUuid
      }
    };
  }

  // Custom FREEZE_PRESSURE resolution
  if (payload.includes('MITIGATION SUCCESSFUL') && payload.toLowerCase().includes('freeze pressure')) {
    return {
      auditUuid,
      action: 'DRILL_RESOLVED:FREEZE_PRESSURE',
      resource: 'ZTAN_GOVERNANCE',
      userId: operatorId,
      metadata: {
        reactionTime: 0,
        actionsTaken: 'Rejected automated capability expansions under freeze pressure',
        signature: 'SYSTEM',
        requestUuid,
        auditUuid,
        outboxUuid,
        ledgerBlockUuid
      }
    };
  }

  // Custom FREEZE_PRESSURE failure/escalation
  if (payload.includes('TRUST FAILURE') && payload.toLowerCase().includes('freeze pressure')) {
    return {
      auditUuid,
      action: 'DRILL_FAILED:FREEZE_PRESSURE',
      resource: 'ZTAN_GOVERNANCE',
      userId: operatorId,
      metadata: {
        actionsTaken: 'Operator authorized capability expansion under freeze pressure',
        requestUuid,
        auditUuid,
        outboxUuid,
        ledgerBlockUuid
      }
    };
  }

  // Check if it's a trigger
  let drillId = '';
  if (payload.includes('ADVERSARIAL REPLAY')) drillId = 'IFD-001';
  else if (payload.includes('TELEMETRY EROSION')) drillId = 'IFD-002';
  else if (payload.includes('GOVERNANCE COLLAPSE')) drillId = 'IFD-003';
  else if (payload.includes('RITUAL DECAY')) drillId = 'RITUAL_DECAY';
  else if (payload.includes('FREEZE PRESSURE') || payload.includes('FREEZE_PRESSURE')) drillId = 'FREEZE_PRESSURE';
  else if (payload.includes('QUORUM CRASH')) drillId = 'TOTAL_QUORUM_FAILURE';

  if (drillId) {
    return {
      auditUuid,
      action: `DRILL_TRIGGERED:${drillId}`,
      resource: 'ZTAN_GOVERNANCE',
      userId: operatorId,
      metadata: {
        activeDrill: drillId,
        timestamp,
        requestUuid,
        auditUuid,
        outboxUuid,
        ledgerBlockUuid
      }
    };
  }

  return null;
}

export const GovernanceLedger = {
  states: new Map<number, ZtanState>(),
  activeLockGenerations: new Map<number, number>(),
  activeDbGenerations: new Map<number, number>(),
  heartbeatIntervals: new Map<number, NodeJS.Timeout>(),
  livenessIntervals: new Map<number, NodeJS.Timeout>(),
  lastSuccessfulHeartbeats: new Map<number, number>(),

  getState(partition: number): ZtanState {
    return this.states.get(partition) ?? 'READ_ONLY';
  },

  transitionTo(partition: number, target: ZtanState, reason?: string): void {
    const current = this.getState(partition);
    if (current === target) return;

    const validTransitions: Record<ZtanState, ZtanState[]> = {
      READ_ONLY: ['REPLAYING', 'REBUILDING', 'ACTIVE'],
      REPLAYING: ['ACTIVE', 'QUARANTINED', 'READ_ONLY'],
      REBUILDING: ['ACTIVE', 'DEGRADED', 'FENCED', 'QUARANTINED'],
      ACTIVE: ['DEGRADED', 'FENCED', 'QUARANTINED', 'READ_ONLY'],
      DEGRADED: ['ACTIVE', 'FENCED', 'QUARANTINED', 'READ_ONLY'],
      FENCED: ['REBUILDING', 'READ_ONLY', 'ACTIVE', 'DEGRADED'],
      QUARANTINED: ['READ_ONLY', 'REPLAYING']
    };

    const allowed = validTransitions[current]?.includes(target);
    if (!allowed) {
      throw new Error(`[GovernanceLedger] Invalid state transition on partition ${partition}: ${current} -> ${target} (Reason: ${reason || 'unspecified'})`);
    }

    this.states.set(partition, target);
    logger.info({ partition, current, target, reason }, `[GovernanceLedger] State Transition: ${current} -> ${target} (${reason || 'unspecified'})`);
  },

  // Backward compatibility getters/setters mapping to partition 0
  get activeLockGeneration(): number | null {
    return this.activeLockGenerations.get(0) ?? null;
  },
  set activeLockGeneration(val: number | null) {
    if (val === null) this.activeLockGenerations.delete(0);
    else this.activeLockGenerations.set(0, val);
  },

  get activeDbGeneration(): number | null {
    return this.activeDbGenerations.get(0) ?? null;
  },
  set activeDbGeneration(val: number | null) {
    if (val === null) this.activeDbGenerations.delete(0);
    else this.activeDbGenerations.set(0, val);
  },

  get heartbeatInterval(): NodeJS.Timeout | null {
    return this.heartbeatIntervals.get(0) ?? null;
  },
  set heartbeatInterval(val: NodeJS.Timeout | null) {
    if (val === null) this.heartbeatIntervals.delete(0);
    else this.heartbeatIntervals.set(0, val);
  },

  get lastSuccessfulHeartbeat(): number | null {
    return this.lastSuccessfulHeartbeats.get(0) ?? null;
  },
  set lastSuccessfulHeartbeat(val: number | null) {
    if (val === null) this.lastSuccessfulHeartbeats.delete(0);
    else this.lastSuccessfulHeartbeats.set(0, val);
  },

  getPartitionCount(): number {
    if (process.env.ZTAN_PARTITIONS) {
      const parsed = parseInt(process.env.ZTAN_PARTITIONS, 10);
      return isNaN(parsed) ? 4 : parsed;
    }
    return 4;
  },

  /**
   * Routes a payload/correlationId to a specific partition domain.
   */
  getPartition(payload: string, correlationId?: string): number {
    const count = this.getPartitionCount();
    if (count <= 1) return 0;
    const routingKey = correlationId || payload || '';
    const hash = crypto.createHash('sha256').update(routingKey).digest();
    return hash[0] % count; // sharded partition mapping
  },

  getLockFile(partition: number): string {
    const count = this.getPartitionCount();
    if (count <= 1) return path.join(LEDGER_DIR, 'ledger.lock');
    return path.join(LEDGER_DIR, `ledger_partition_${partition}.lock`);
  },

  getLedgerFile(partition: number): string {
    const count = this.getPartitionCount();
    if (count <= 1) return path.join(LEDGER_DIR, 'governance_ledger.json');
    return path.join(LEDGER_DIR, `governance_ledger_partition_${partition}.json`);
  },

  getOutboxFile(partition: number): string {
    const count = this.getPartitionCount();
    if (count <= 1) return path.join(LEDGER_DIR, 'outbox_queue.json');
    return path.join(LEDGER_DIR, `outbox_queue_partition_${partition}.json`);
  },

  getGenFile(partition: number): string {
    const count = this.getPartitionCount();
    if (count <= 1) return path.join(LEDGER_DIR, 'ledger.generation');
    return path.join(LEDGER_DIR, `ledger_partition_${partition}.generation`);
  },

  /**
   * Asserts that the current process holds the active, unfenced lock for a partition.
   */
  assertLockFencing(partition: number = 0): void {
    const activeLockGen = this.activeLockGenerations.get(partition) ?? null;
    if (activeLockGen === null) {
      leaseFencingRevocationsTotal.inc({ node_id: os.hostname(), reason: `no_lock_held_p${partition}` });
      throw new Error(`[GovernanceLedger] Fencing Active Lock Violation: No lock is currently held by this process for partition ${partition}.`);
    }
    const lockFile = this.getLockFile(partition);
    if (!fs.existsSync(lockFile)) {
      leaseFencingRevocationsTotal.inc({ node_id: os.hostname(), reason: `lock_deleted_p${partition}` });
      throw new Error(`[GovernanceLedger] Fencing Active Lock Violation: Lock file does not exist for partition ${partition}. Lock was forcefully stolen or deleted.`);
    }
    try {
      const raw = fs.readFileSync(lockFile, 'utf8');
      const meta: LockMetadata = JSON.parse(raw);
      if (meta.pid !== process.pid || meta.generation !== activeLockGen) {
        leaseFencingRevocationsTotal.inc({ node_id: os.hostname(), reason: `lock_stolen_p${partition}` });
        throw new Error(
          `[GovernanceLedger] Fencing Active Lock Violation: Lock has been stolen by another process for partition ${partition}. Owner PID: ${meta.pid}, Gen: ${meta.generation} (Current PID: ${process.pid}, Gen: ${activeLockGen})`
        );
      }
    } catch (e: any) {
      if (e.message && e.message.includes('Fencing Active Lock Violation')) {
        throw e;
      }
      throw new Error(`[GovernanceLedger] Fencing Active Lock Violation: Failed to verify lock file for partition ${partition}: ${e.message || e}`);
    }
  },

  /**
   * Asserts that the current process holds both active filesystem lock and distributed database lease for a partition.
   */
  async assertLockFencingAsync(partition: number = 0): Promise<void> {
    // 1. Filesystem lock verification
    this.assertLockFencing(partition);

    // 2. Distributed Database lease verification
    const expectedGen = this.activeDbGenerations.get(partition) ?? null;
    if (expectedGen !== null) {
      try {
        const leaseId = `singleton-lease-partition-${partition}`;
        const rows = (await db.$queryRawUnsafe(`
          SELECT generation, owner_pid as "ownerPid", owner_host as "ownerHost"
          FROM "ZtanActiveLease"
          WHERE id = $1
        `, leaseId)) as any[];
        if (rows.length > 0) {
          const row = rows[0];
          const hostname = os.hostname();
          const pid = process.pid;
          if (row.ownerHost !== hostname || Number(row.ownerPid) !== pid || Number(row.generation) !== expectedGen) {
            leaseFencingRevocationsTotal.inc({ node_id: hostname, reason: `lease_stolen_p${partition}` });
            throw new Error(
              `[GovernanceLedger] Fencing Distributed Lease Violation: Database lease stolen by another host/process for partition ${partition}. Current Owner: Host: ${row.ownerHost}, PID: ${row.ownerPid}, Gen: ${row.generation} (Local Owner: Host: ${hostname}, PID: ${pid}, Gen: ${expectedGen})`
            );
          }
        } else {
          leaseFencingRevocationsTotal.inc({ node_id: os.hostname(), reason: `lease_deleted_p${partition}` });
          throw new Error(`[GovernanceLedger] Fencing Distributed Lease Violation: Database lease has been deleted for partition ${partition}.`);
        }
      } catch (err: any) {
        if (err.message && err.message.includes('Fencing Distributed Lease Violation')) {
          throw err;
        }
        // Strict fail-closed under DB partitions:
        leaseFencingRevocationsTotal.inc({ node_id: os.hostname(), reason: `db_unreachable_p${partition}` });
        throw new Error(
          `[GovernanceLedger] Fencing Distributed Lease Violation: Database is unreachable, cannot assert lease authority for partition ${partition}: ${err.message || err}`
        );
      }
    }
  },

  async bootstrapDatabaseLeaseTable(): Promise<void> {
    try {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ZtanActiveLease" (
          id VARCHAR(50) PRIMARY KEY DEFAULT 'singleton-lease',
          generation INT NOT NULL DEFAULT 0,
          owner_pid INT NOT NULL,
          owner_host VARCHAR(255) NOT NULL,
          heartbeat TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
    } catch (err: any) {
      logger.error({ err }, '[GovernanceLedger] Failed to bootstrap distributed database lease table');
    }
  },

  async acquireDbLease(partition: number = 0): Promise<void> {
    const isWriter = process.env.SERVICE_NAME === 'core-api' || 
                     process.env.PORT === '4022' || 
                     process.env.IS_GOVERNANCE_WRITER === 'true' || 
                     process.env.ZTAN_TEST_WRITER === 'true' ||
                     !process.env.PORT;
    if (!isWriter) {
      logger.info(`[GovernanceLedger] Skipping lease acquisition for non-writer process (PID: ${process.pid}, PORT: ${process.env.PORT})`);
      return;
    }

    // Enforce randomized restart jitter and exponential backoff to prevent synchronized restart storms
    const suppressionFile = path.join(LEDGER_DIR, 'watchdog_suppression.json');
    if (fs.existsSync(suppressionFile)) {
      try {
        const raw = fs.readFileSync(suppressionFile, 'utf8');
        const data = JSON.parse(raw);
        const now = Date.now();
        // Filter failures in the last 60 seconds
        const recentFailures = (data.restarts || []).filter((r: any) => now - r.timestamp < 60000);
        
        if (recentFailures.length > 0) {
          const failureCount = recentFailures.length;
          
          // Rolling Restart Suppression: Quarantine the node if it fails 5 or more times in 60 seconds
          if (failureCount >= 5) {
            const errMsg = `[GovernanceLedger] [ROLLING_RESTART_SUPPRESSION] Node quarantined: ${failureCount} failures detected in the last 60 seconds. Aborting startup to prevent synchronized self-destruction.`;
            logger.error(errMsg);
            throw new Error(errMsg);
          }

          // Calculate exponential backoff: base 1.5 seconds, scaling with failure count
          const backoffDelay = Math.min(45000, 1500 * Math.pow(2, failureCount - 1));
          // Inject a randomized restart jitter (between 0 and 3000ms) to ensure staggered boot times
          const jitterDelay = Math.floor(Math.random() * 3000);
          const totalDelay = backoffDelay + jitterDelay;
          
          logger.warn(`[GovernanceLedger] [RESTART_STORM_PROTECTION] Recent crashes detected: ${failureCount} failures in last 60s. Enforcing backoff delay of ${backoffDelay}ms + jitter of ${jitterDelay}ms (Total: ${totalDelay}ms) to prevent synchronized restart amplification.`);
          
          await new Promise(resolve => setTimeout(resolve, totalDelay));
        }
      } catch (err: any) {
        if (err.message && err.message.includes('ROLLING_RESTART_SUPPRESSION')) {
          throw err;
        }
        logger.error(`[GovernanceLedger] Failed to read/enforce restart storm protection: ${err.message}`);
      }
    }

    await this.bootstrapDatabaseLeaseTable();
    const hostname = os.hostname();
    const pid = process.pid;
    const startTime = Date.now();
    const leaseId = `singleton-lease-partition-${partition}`;

    while (true) {
      try {
        await db.$transaction(async (tx: any) => {
          // Enforce strict lock timeouts within the transaction boundary
          // This ensures that if another node holds the FOR UPDATE lock but stalls,
          // the database forcefully rejects our lock attempt after 15 seconds,
          // converting a silent distributed hang into a deterministically caught exception.
          await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '15s';`);

          const rows = (await tx.$queryRawUnsafe(`
            SELECT id, generation, owner_pid as "ownerPid", owner_host as "ownerHost", heartbeat
            FROM "ZtanActiveLease"
            WHERE id = $1
            FOR UPDATE
          `, leaseId)) as any[];

          // Chaos Test Injection: Synthetic Partial Transaction Stall
          // Pauses the event loop *after* acquiring the FOR UPDATE lock but *before* committing.
          if (process.env.ZTAN_INJECT_TX_STALL === 'true') {
             logger.warn(`[GovernanceLedger] Chaos Injection: Stalling active transaction for 20 seconds while holding FOR UPDATE lock...`);
             await new Promise(resolve => setTimeout(resolve, 20000));
          }

          // Chaos Test Injection: Process Death Mid-Transaction
          if (process.env.ZTAN_INJECT_TX_CRASH === 'true') {
             logger.warn(`[GovernanceLedger] Chaos Injection: Crashing process mid-transaction! FOR UPDATE lock should be automatically rolled back by Postgres.`);
             process.exit(139);
          }

          if (rows.length === 0) {
            await tx.$executeRawUnsafe(`
              INSERT INTO "ZtanActiveLease" (id, generation, owner_pid, owner_host, heartbeat)
              VALUES ($1, 1, $2, $3, NOW())
            `, leaseId, pid, hostname);
            this.activeDbGenerations.set(partition, 1);
            activeLeaseGeneration.set({ node_id: hostname }, 1);
            logger.info({ pid, hostname }, `[GovernanceLedger] Acquired initial distributed database lease for partition ${partition}. Generation: 1`);
          } else {
            const row = rows[0];
            const timeSinceHeartbeat = Date.now() - new Date(row.heartbeat).getTime();
            const isExpired = timeSinceHeartbeat > LOCK_TIMEOUT_MS;
            const isMe = row.ownerHost === hostname && Number(row.ownerPid) === pid;

            const localGen = this.activeDbGenerations.get(partition) ?? null;
            if (!isMe && localGen !== null) {
              throw new Error(
                `[GovernanceLedger] Fencing Distributed Lease Violation: Database lease stolen by another host/process for partition ${partition}. Current Owner: Host: ${row.ownerHost}, PID: ${row.ownerPid}, Gen: ${row.generation} (Local Owner: Host: ${hostname}, PID: ${pid}, Gen: ${localGen})`
              );
            }

            if (!isExpired && !isMe) {
              throw new Error(`Lease held by other host for partition ${partition}: Host: ${row.ownerHost}, PID: ${row.ownerPid}, Age: ${timeSinceHeartbeat}ms`);
            }

            const nextGen = Number(row.generation) + 1;
            await tx.$executeRawUnsafe(`
              UPDATE "ZtanActiveLease"
              SET generation = $1, owner_pid = $2, owner_host = $3, heartbeat = NOW()
              WHERE id = $4
            `, nextGen, pid, hostname, leaseId);
            this.activeDbGenerations.set(partition, nextGen);
            activeLeaseGeneration.set({ node_id: hostname }, nextGen);
            logger.info({ pid, hostname, nextGen }, `[GovernanceLedger] Acquired distributed database lease for partition ${partition}. Generation: ${nextGen}`);
          }
        });

        this.startHeartbeatDaemon(partition);
        return;
      } catch (err: any) {
        if (err.message && err.message.includes('Fencing Distributed Lease Violation')) {
          throw err;
        }
        if (Date.now() - startTime > LOCK_TIMEOUT_MS) {
          throw new Error(`[GovernanceLedger] Distributed database lease acquisition timed out for partition ${partition}: ${err.message || err}`);
        }
        await new Promise(resolve => setTimeout(resolve, LOCK_RETRY_INTERVAL_MS));
      }
    }
  },

  startLivenessTick(partition: number): void {
    const hostname = os.hostname();
    const pid = process.pid;
    const interval = setInterval(() => {
      const activeDbGen = this.activeDbGenerations.get(partition) ?? null;
      if (activeDbGen === null) return;
      try {
        if (!fs.existsSync(LEDGER_DIR)) {
          fs.mkdirSync(LEDGER_DIR, { recursive: true });
        }
        const livenessFile = path.join(LEDGER_DIR, `liveness_partition_${partition}.json`);
        const livenessData = {
          pid,
          hostname,
          generation: activeDbGen,
          timestamp: new Date().toISOString(),
          eventLoopLagMs: Math.round(eventLoopLag),
          partition
        };
        fs.writeFileSync(livenessFile, JSON.stringify(livenessData), 'utf8');
        if (partition === 0) {
          fs.writeFileSync(path.join(LEDGER_DIR, 'liveness.json'), JSON.stringify(livenessData), 'utf8');
        }
      } catch (livenessErr) {
        // ignore
      }
    }, 500);

    this.livenessIntervals.set(partition, interval);

    if (interval && typeof interval.unref === 'function') {
      interval.unref();
    }
  },

  startHeartbeatDaemon(partition: number): void {
    this.stopHeartbeatDaemon(partition);
    const hostname = os.hostname();
    const pid = process.pid;
    this.lastSuccessfulHeartbeats.set(partition, Date.now());

    this.startLivenessTick(partition);

    const interval = setInterval(async () => {
      const activeDbGen = this.activeDbGenerations.get(partition) ?? null;
      if (activeDbGen === null) return;
      const leaseId = `singleton-lease-partition-${partition}`;
      try {
        await db.$executeRawUnsafe(`
          UPDATE "ZtanActiveLease"
          SET heartbeat = NOW()
          WHERE id = $1 
            AND owner_pid = $2 
            AND owner_host = $3 
            AND generation = $4
        `, leaseId, pid, hostname, activeDbGen);
        const elapsed = (Date.now() - (this.lastSuccessfulHeartbeats.get(partition) || Date.now())) / 1000;
        heartbeatDriftSeconds.observe(elapsed);
        this.lastSuccessfulHeartbeats.set(partition, Date.now());
      } catch (err: any) {
        logger.error({ err }, `[GovernanceLedger] Failed to send lease heartbeat for partition ${partition}`);
        
        const timeSinceHeartbeat = Date.now() - (this.lastSuccessfulHeartbeats.get(partition) || 0);
        if (timeSinceHeartbeat > LOCK_TIMEOUT_MS / 2) {
          logger.error(
            { timeSinceHeartbeat, pid, hostname },
            `[GovernanceLedger] CRITICAL: Heartbeat threshold exceeded for partition ${partition}. Host disconnected from lease oracle. Self-fencing local authority!`
          );
          try {
            this.transitionTo(partition, 'FENCED', 'Heartbeat renewal timeout exceeded');
          } catch {}
          this.activeDbGenerations.delete(partition);
          this.activeLockGenerations.delete(partition);
          activeLeaseGeneration.set({ node_id: hostname }, 0);
          this.stopHeartbeatDaemon(partition);
          const lockFile = this.getLockFile(partition);
          if (fs.existsSync(lockFile)) {
            try {
              fs.unlinkSync(lockFile);
            } catch {}
          }
        }
      }
    }, 5000);

    this.heartbeatIntervals.set(partition, interval);

    if (interval && typeof interval.unref === 'function') {
      interval.unref();
    }
  },

  stopHeartbeatDaemon(partition: number): void {
    const interval = this.heartbeatIntervals.get(partition);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(partition);
    }
    const livenessInterval = this.livenessIntervals.get(partition);
    if (livenessInterval) {
      clearInterval(livenessInterval);
      this.livenessIntervals.delete(partition);
    }
  },

  stopBackgroundTasks(): void {
    for (const partition of this.heartbeatIntervals.keys()) {
      this.stopHeartbeatDaemon(partition);
    }
    for (const partition of this.livenessIntervals.keys()) {
      const livenessInterval = this.livenessIntervals.get(partition);
      if (livenessInterval) {
        clearInterval(livenessInterval);
      }
    }
    this.livenessIntervals.clear();
    if (reconciliationInterval) {
      clearInterval(reconciliationInterval);
      reconciliationInterval = null;
    }
  },

  async releaseDbLease(partition: number = 0): Promise<void> {
    this.stopHeartbeatDaemon(partition);
    const activeDbGen = this.activeDbGenerations.get(partition) ?? null;
    if (activeDbGen === null) return;
    const hostname = os.hostname();
    const pid = process.pid;
    this.activeDbGenerations.delete(partition);
    const leaseId = `singleton-lease-partition-${partition}`;
    try {
      await db.$executeRawUnsafe(`
        UPDATE "ZtanActiveLease"
        SET heartbeat = NOW() - INTERVAL '30 seconds'
        WHERE id = $1
          AND owner_pid = $2
          AND owner_host = $3
          AND generation = $4
      `, leaseId, pid, hostname, activeDbGen);
      logger.info({ pid, hostname, gen: activeDbGen }, `[GovernanceLedger] Released distributed database lease for partition ${partition} (expired manually).`);
    } catch (err: any) {
      logger.error({ err }, `[GovernanceLedger] Failed to release distributed database lease for partition ${partition}`);
    } finally {
      activeLeaseGeneration.set({ node_id: hostname }, 0);
    }
  },

  incrementGeneration(partition: number): number {
    let prevGen = 0;
    const genFile = this.getGenFile(partition);
    if (!fs.existsSync(LEDGER_DIR)) {
      fs.mkdirSync(LEDGER_DIR, { recursive: true });
    }
    if (fs.existsSync(genFile)) {
      try {
        prevGen = parseInt(fs.readFileSync(genFile, 'utf8'), 10) || 0;
      } catch {
        prevGen = 0;
      }
    }
    const nextGen = prevGen + 1;
    fs.writeFileSync(genFile, nextGen.toString(), 'utf8');
    return nextGen;
  },

  acquireLock(partition: number = 0): void {
    const startTime = Date.now();
    if (!fs.existsSync(LEDGER_DIR)) {
      fs.mkdirSync(LEDGER_DIR, { recursive: true });
    }
    const lockFile = this.getLockFile(partition);

    while (true) {
      try {
        const nextGen = this.incrementGeneration(partition);
        const meta: LockMetadata = {
          pid: process.pid,
          timestamp: new Date().toISOString(),
          generation: nextGen
        };
        fs.writeFileSync(lockFile, JSON.stringify(meta), { encoding: 'utf8', flag: 'wx' });
        this.activeLockGenerations.set(partition, nextGen);
        return;
      } catch (err: any) {
        if (err.code === 'EEXIST') {
          this.handleStaleLock(partition);

          if (Date.now() - startTime > LOCK_TIMEOUT_MS) {
            throw new Error(`[GovernanceLedger] Lock acquisition timed out for partition ${partition} after ${LOCK_TIMEOUT_MS}ms`);
          }

          const sleepStart = Date.now();
          while (Date.now() - sleepStart < LOCK_RETRY_INTERVAL_MS) {
            // spin
          }
        } else {
          throw err;
        }
      }
    }
  },

  async acquireLockAsync(partition: number = 0): Promise<void> {
    const startTime = Date.now();
    if (!fs.existsSync(LEDGER_DIR)) {
      fs.mkdirSync(LEDGER_DIR, { recursive: true });
    }
    const lockFile = this.getLockFile(partition);

    while (true) {
      try {
        const nextGen = this.incrementGeneration(partition);
        const meta: LockMetadata = {
          pid: process.pid,
          timestamp: new Date().toISOString(),
          generation: nextGen
        };
        fs.writeFileSync(lockFile, JSON.stringify(meta), { encoding: 'utf8', flag: 'wx' });
        this.activeLockGenerations.set(partition, nextGen);

        try {
          await this.acquireDbLease(partition);
        } catch (dbErr: any) {
          this.releaseLock(partition);
          if (dbErr.message && dbErr.message.includes('Fencing Distributed Lease Violation')) {
            throw dbErr;
          }
          throw new Error(`[GovernanceLedger] Strict Cluster Fencing Violation: Failed to acquire distributed database lease for partition ${partition}: ${dbErr.message || dbErr}`);
        }

        return;
      } catch (err: any) {
        if (err.code === 'EEXIST') {
          this.handleStaleLock(partition);

          if (Date.now() - startTime > LOCK_TIMEOUT_MS) {
            throw new Error(`[GovernanceLedger] Lock acquisition timed out for partition ${partition} after ${LOCK_TIMEOUT_MS}ms`);
          }

          await new Promise(resolve => setTimeout(resolve, LOCK_RETRY_INTERVAL_MS));
        } else {
          throw err;
        }
      }
    }
  },

  handleStaleLock(partition: number): void {
    try {
      const lockFile = this.getLockFile(partition);
      if (fs.existsSync(lockFile)) {
        const raw = fs.readFileSync(lockFile, 'utf8');
        const meta: LockMetadata = JSON.parse(raw);
        
        let isProcessAlive = true;
        try {
          process.kill(meta.pid, 0);
        } catch {
          isProcessAlive = false;
        }

        const heldDuration = Date.now() - new Date(meta.timestamp).getTime();
        const isLeaseExpired = heldDuration > LOCK_LEASE_MS;

        if (!isProcessAlive || isLeaseExpired) {
          logger.warn(
            { pid: meta.pid, heldDuration, isProcessAlive },
            `[GovernanceLedger] Stale lock detected on partition ${partition} (process dead or lease expired). Forcing release...`
          );
          this.releaseLockForce(partition);
        }
      }
    } catch {
      // Ignore reading race conditions
    }
  },

  releaseLock(partition: number = 0): void {
    const lockFile = this.getLockFile(partition);
    const activeLockGen = this.activeLockGenerations.get(partition) ?? null;
    try {
      if (fs.existsSync(lockFile)) {
        const raw = fs.readFileSync(lockFile, 'utf8');
        const meta: LockMetadata = JSON.parse(raw);
        if (meta.pid === process.pid && meta.generation === activeLockGen) {
          fs.unlinkSync(lockFile);
        } else {
          logger.warn(
            { ownerPid: meta.pid, ownerGen: meta.generation, currentPid: process.pid, currentGen: activeLockGen },
            `[GovernanceLedger] Did not release lock for partition ${partition}: stolen by another process`
          );
        }
      }
    } catch (e) {
      logger.error({ err: e }, `[GovernanceLedger] Failed to release lock for partition ${partition}`);
    } finally {
      this.activeLockGenerations.delete(partition);
      this.releaseDbLease(partition).catch((err) => {
        logger.error({ err }, `[GovernanceLedger] Failed to release DB lease for partition ${partition}`);
      });
    }
  },

  releaseLockForce(partition: number): void {
    try {
      const lockFile = this.getLockFile(partition);
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
    } catch (e) {
      logger.error({ err: e }, `[GovernanceLedger] Failed to force release lock on partition ${partition}`);
    } finally {
      this.activeLockGenerations.delete(partition);
    }
  },

  async recoverWal(): Promise<void> {
    try {
      logger.info('[GovernanceLedger] Running WAL recovery check...');
      const pendingLogs = await db.ztanWalLog.findMany({
        where: { status: 'PENDING' }
      });

      if (pendingLogs.length === 0) {
        logger.info('[GovernanceLedger] No pending WAL logs found. WAL is clean.');
        return;
      }

      logger.warn({ count: pendingLogs.length }, '[GovernanceLedger] Found pending WAL logs. Initiating recovery sequence...');
      
      for (const log of pendingLogs) {
        const blockIdStr = log.seq.toString();
        const block = await db.ztanLedgerBlock.findUnique({
          where: { blockId: blockIdStr }
        });

        if (block) {
          await db.ztanWalLog.update({
            where: { id: log.id },
            data: { status: 'COMMITTED' }
          });
          logger.info({ seq: log.seq }, '[GovernanceLedger] WAL Recovery: Resolved pending WAL log to COMMITTED (block already existed)');
        } else {
          await db.ztanWalLog.delete({
            where: { id: log.id }
          });
          logger.info({ seq: log.seq }, '[GovernanceLedger] WAL Recovery: Discarded incomplete WAL transaction (block did not exist)');
        }
      }
    } catch (err: any) {
      logger.warn(`[GovernanceLedger] WAL recovery deferred (PostgreSQL unreachable): ${err.message || err}`);
    }
  },

  init(): void {
    const count = this.getPartitionCount();
    for (let p = 0; p < count; p++) {
      this.initPartition(p);
    }

    if (!reconciliationInterval) {
      reconciliationInterval = setInterval(() => {
        this.processOutbox().catch(() => {});
      }, 10000);
      if (reconciliationInterval && typeof reconciliationInterval.unref === 'function') {
        reconciliationInterval.unref();
      }
    }
  },

  initPartition(partition: number): void {
    this.states.set(partition, 'READ_ONLY');
    this.transitionTo(partition, 'REBUILDING', 'Starting partition initialization');
    this.acquireLock(partition);
    try {
      if (!fs.existsSync(LEDGER_DIR)) {
        fs.mkdirSync(LEDGER_DIR, { recursive: true });
      }

      const ledgerFile = this.getLedgerFile(partition);
      if (!fs.existsSync(ledgerFile)) {
        logger.info(`[GovernanceLedger] Initializing genesis ledger for partition ${partition}`);
        const genesis: GovernanceLedgerEntry[] = [
          this.createGenesisEntry(partition)
        ];
        this.saveLedger(genesis, partition);
      }
    } finally {
      this.releaseLock(partition);
    }

    this.recoverWal().catch((err) => {
      logger.warn(`[GovernanceLedger] WAL recovery ceremony deferred: ${err.message || err}`);
    });

    this.initDbSync(partition).then(() => {
      this.transitionTo(partition, 'ACTIVE', 'Initialization and DB sync completed');
    }).catch((err) => {
      logger.warn(`[GovernanceLedger] Background database sync-up ceremony skipped for partition ${partition}: ${err.message || err}`);
      this.transitionTo(partition, 'DEGRADED', 'Initialization completed but DB sync deferred');
    });
  },

  loadOutbox(partition: number = 0): number[] {
    try {
      const outboxFile = this.getOutboxFile(partition);
      if (!fs.existsSync(outboxFile)) {
        return [];
      }
      const content = fs.readFileSync(outboxFile, 'utf8').trim();
      if (!content) {
        return [];
      }
      return JSON.parse(content);
    } catch (e: any) {
      logger.error({ err: e }, `[GovernanceLedger] WARNING: Outbox queue file is corrupted or truncated for partition ${partition}. Initiating async self-healing reconstruction...`);
      this.triggerOutboxSelfHealing(partition).catch(err => {
        logger.error({ err }, `[GovernanceLedger] Outbox self-healing recovery failed for partition ${partition}`);
      });
      return [];
    }
  },

  saveOutbox(queue: number[], partition: number = 0): void {
    this.assertLockFencing(partition);
    const outboxFile = this.getOutboxFile(partition);
    const tmpFile = `${outboxFile}.tmp`;
    try {
      fs.writeFileSync(tmpFile, JSON.stringify(queue, null, 2), 'utf8');
      fs.renameSync(tmpFile, outboxFile);
    } catch (e) {
      logger.error({ err: e }, `[GovernanceLedger] Failed to save outbox queue atomically for partition ${partition}, falling back to standard write`);
      try {
        fs.writeFileSync(outboxFile, JSON.stringify(queue, null, 2), 'utf8');
      } catch (innerErr) {
        logger.error({ err: innerErr }, `[GovernanceLedger] Outbox fallback write failed completely for partition ${partition}`);
      }
    }
  },

  async triggerOutboxSelfHealing(partition?: number): Promise<void> {
    const isWriter = process.env.SERVICE_NAME === 'core-api' || 
                     process.env.PORT === '4022' || 
                     process.env.IS_GOVERNANCE_WRITER === 'true' || 
                     process.env.ZTAN_TEST_WRITER === 'true' ||
                     !process.env.PORT;
    if (!isWriter) {
      return;
    }

    if (partition === undefined) {
      const count = this.getPartitionCount();
      for (let p = 0; p < count; p++) {
        await this.triggerOutboxSelfHealing(p).catch(() => {});
      }
      return;
    }

    try {
      const ledger = this.loadLedger(partition);
      const reconstructed: number[] = [];
      for (const entry of ledger) {
        const blockIdStr = entry.sequenceId.toString();
        const existing = await db.ztanLedgerBlock.findUnique({
          where: { blockId: blockIdStr }
        });
        if (!existing) {
          reconstructed.push(entry.sequenceId);
        }
      }
      reconstructed.sort((a, b) => a - b);
      
      let acquiredTempLock = false;
      if (!this.activeLockGenerations.get(partition)) {
        await this.acquireLockAsync(partition);
        acquiredTempLock = true;
      }
      try {
        await this.assertLockFencingAsync(partition);
        this.saveOutbox(reconstructed, partition);
      } finally {
        if (acquiredTempLock) {
          this.releaseLock(partition);
        }
      }
      logger.info(`[GovernanceLedger] Self-healing completed: reconstructed outbox with ${reconstructed.length} missing blocks for partition ${partition}.`);
    } catch (err: any) {
      logger.warn(`[GovernanceLedger] Self-healing deferred for partition ${partition} (PostgreSQL offline or unreachable): ${err.message || err}`);
    }
  },

  getOutboxStatus(partition: number = 0): { queueLength: number; synchronized: boolean } {
    const queue = this.loadOutbox(partition);
    return {
      queueLength: queue.length,
      synchronized: queue.length === 0
    };
  },

  async processOutbox(partition?: number): Promise<void> {
    const isWriter = process.env.SERVICE_NAME === 'core-api' || 
                     process.env.PORT === '4022' || 
                     process.env.IS_GOVERNANCE_WRITER === 'true' || 
                     process.env.ZTAN_TEST_WRITER === 'true' ||
                     !process.env.PORT;
    if (!isWriter) {
      return;
    }

    if (partition === undefined) {
      const count = this.getPartitionCount();
      for (let p = 0; p < count; p++) {
        await this.processOutbox(p).catch(() => {});
      }
      return;
    }

    await this.acquireLockAsync(partition);
    try {
      await this.assertLockFencingAsync(partition);
      const queue = this.loadOutbox(partition);
      if (queue.length === 0) {
        return;
      }

      logger.info(`[GovernanceLedger] Outbox worker processing ${queue.length} pending entries for partition ${partition}...`);
      const ledger = this.loadLedger(partition);
      const successful: number[] = [];

      for (const seq of queue) {
        const entry = ledger.find(e => e.sequenceId === seq);
        if (!entry) {
          successful.push(seq);
          continue;
        }

        try {
          const blockIdStr = entry.sequenceId.toString();
          const existing = await db.ztanLedgerBlock.findUnique({
            where: { blockId: blockIdStr }
          });

          if (existing) {
            if (existing.hash !== entry.hash) {
              invariantBreachesTotal.inc({ invariant_id: `byzantine_drift_p${partition}`, severity: 'critical' });
              logger.error(
                { sequenceId: seq, dbHash: existing.hash, localHash: entry.hash },
                `[GovernanceLedger] CRITICAL: Byzantine Drift Detected for partition ${partition}! Database block hash does not match local authoritative ledger block.`
              );
              entry.verdict = 'UNTRUSTED';
              this.saveLedger(ledger, partition);
              try {
                this.transitionTo(partition, 'QUARANTINED', `Byzantine Timeline Fracture detected at sequence ${seq}`);
              } catch {}
              throw new Error(`Byzantine Timeline Fracture at sequence ${seq} on partition ${partition}`);
            }
            logger.info({ sequenceId: seq }, `[GovernanceLedger] Block already exists in DB with perfect hash parity on partition ${partition}. Deduplicating.`);
          } else {
            await db.$transaction(async (tx: any) => {
              // Transaction-bound Epoch Fencing Check
              const expectedGen = this.activeDbGenerations.get(partition) ?? null;
              if (expectedGen !== null) {
                const leaseId = `singleton-lease-partition-${partition}`;
                const rows = (await tx.$queryRawUnsafe(`
                  SELECT generation, owner_pid as "ownerPid", owner_host as "ownerHost"
                  FROM "ZtanActiveLease"
                  WHERE id = $1
                  FOR UPDATE
                `, leaseId)) as any[];
                if (rows.length > 0) {
                  const row = rows[0];
                  const hostname = os.hostname();
                  const pid = process.pid;
                  if (row.ownerHost !== hostname || Number(row.ownerPid) !== pid || Number(row.generation) !== expectedGen) {
                    throw new Error(
                      `[GovernanceLedger] Fencing Distributed Lease Violation: Database lease stolen by another host/process for partition ${partition}. Current Owner: Host: ${row.ownerHost}, PID: ${row.ownerPid}, Gen: ${row.generation} (Local Owner: Host: ${hostname}, PID: ${pid}, Gen: ${expectedGen})`
                    );
                  }
                } else {
                  throw new Error(`[GovernanceLedger] Fencing Distributed Lease Violation: Database lease has been deleted for partition ${partition}.`);
                }
              } else {
                throw new Error(`[GovernanceLedger] Fencing Distributed Lease Violation: No local active database generation found for partition ${partition}.`);
              }

              await tx.ztanLedgerBlock.create({
                data: {
                  blockId: blockIdStr,
                  prevHash: entry.prevHash,
                  hash: entry.hash,
                  type: entry.type,
                  payload: entry.payload,
                  operator: entry.operatorId,
                  signature: entry.signature,
                  status: entry.verdict,
                  epoch: entry.epoch,
                  createdAt: new Date(entry.timestamp)
                }
              });
              logger.info({ sequenceId: seq }, `[GovernanceLedger] Outbox worker successfully synced block to PostgreSQL on partition ${partition}`);
              await tx.$executeRawUnsafe(`NOTIFY ztan_ledger_update, '${blockIdStr}';`).catch(() => {});

              // Self-heal/reconcile AuditLog if it has correlation trace in payload
              const auditInfo = parseCorrelationAndPayload(entry.payload, entry.timestamp, entry.operatorId);
              if (auditInfo) {
                const existingAudit = await tx.auditLog.findUnique({
                  where: { id: auditInfo.auditUuid }
                });
                if (!existingAudit) {
                  await tx.auditLog.create({
                    data: {
                      id: auditInfo.auditUuid,
                      action: auditInfo.action,
                      resource: auditInfo.resource,
                      userId: auditInfo.userId,
                      tenantId: 'platform-admin',
                      status: 'SUCCESS',
                      metadata: auditInfo.metadata,
                      createdAt: new Date(entry.timestamp)
                    }
                  });
                  logger.info({ auditUuid: auditInfo.auditUuid }, `[GovernanceLedger] Outbox worker successfully recovered missing AuditLog entry during sync`);
                }
              }
            });
          }

          successful.push(seq);
        } catch (dbErr: any) {
          if (dbErr.message && dbErr.message.includes('Byzantine Timeline Fracture')) {
            throw dbErr;
          }
          if (dbErr.code === 'P2002' || (dbErr.message && dbErr.message.includes('Unique constraint'))) {
            logger.info({ sequenceId: seq }, `[GovernanceLedger] Block already exists in DB (unique constraint key) on partition ${partition}, marking synced`);
            successful.push(seq);
          } else {
            logger.warn(`[GovernanceLedger] Outbox worker failed to sync block ${seq} on partition ${partition}: ${dbErr.message || dbErr}`);
            break; 
          }
        }
      }

      if (successful.length > 0) {
        const updatedQueue = queue.filter(seq => !successful.includes(seq));
        this.saveOutbox(updatedQueue, partition);
      }
    } finally {
      this.releaseLock(partition);
    }
  },

  async initDbSync(partition?: number): Promise<void> {
    const isWriter = process.env.SERVICE_NAME === 'core-api' || 
                     process.env.PORT === '4022' || 
                     process.env.IS_GOVERNANCE_WRITER === 'true' || 
                     process.env.ZTAN_TEST_WRITER === 'true' ||
                     !process.env.PORT;
    if (!isWriter) {
      logger.info(`[GovernanceLedger] Skipping database sync for non-writer process (PID: ${process.pid}, PORT: ${process.env.PORT})`);
      return;
    }

    if (partition === undefined) {
      const count = this.getPartitionCount();
      for (let p = 0; p < count; p++) {
        await this.initDbSync(p).catch(() => {});
      }
      return;
    }

    await this.acquireLockAsync(partition);
    let modified = false;
    let queue: number[] = [];
    try {
      const ledger = this.loadLedger(partition);
      queue = this.loadOutbox(partition);

      // 1. Reconcile local -> DB (outbox queue enrichment and AuditLog reconciliation)
      for (const entry of ledger) {
        const blockIdStr = entry.sequenceId.toString();
        const existing = await db.ztanLedgerBlock.findUnique({
          where: { blockId: blockIdStr }
        });

        if (!existing) {
          if (!queue.includes(entry.sequenceId)) {
            queue.push(entry.sequenceId);
            modified = true;
          }
        } else {
          // Self-heal/reconcile AuditLog if it is missing in the database
          const auditInfo = parseCorrelationAndPayload(entry.payload, entry.timestamp, entry.operatorId);
          if (auditInfo) {
            try {
              const existingAudit = await db.auditLog.findUnique({
                where: { id: auditInfo.auditUuid }
              });
              if (!existingAudit) {
                await db.auditLog.create({
                  data: {
                    id: auditInfo.auditUuid,
                    action: auditInfo.action,
                    resource: auditInfo.resource,
                    userId: auditInfo.userId,
                    tenantId: 'platform-admin',
                    status: 'SUCCESS',
                    metadata: auditInfo.metadata,
                    createdAt: new Date(entry.timestamp)
                  }
                });
                logger.info({ auditUuid: auditInfo.auditUuid }, `[GovernanceLedger] initDbSync successfully restored missing AuditLog entry`);
              }
            } catch (auditErr: any) {
              logger.warn(`[GovernanceLedger] initDbSync failed to verify/restore AuditLog for entry ${entry.sequenceId}: ${auditErr.message || auditErr}`);
            }
          }
        }
      }

      if (modified) {
        queue.sort((a, b) => a - b);
        this.saveOutbox(queue, partition);
      }

      // 2. Reconcile DB -> local (pulling missing committed blocks into local file system)
      const minSeq = (partition * 1000000) + 1000;
      const maxSeq = ((partition + 1) * 1000000) - 1;
      const dbBlocks = await db.ztanLedgerBlock.findMany({
        where: {
          createdAt: { gte: new Date('2026-01-01T00:00:00Z') }
        }
      });

      const partitionDbBlocks = dbBlocks
        .map((b: any) => ({ ...b, seqNum: parseInt(b.blockId, 10) }))
        .filter((b: any) => b.seqNum >= minSeq && b.seqNum <= maxSeq)
        .sort((a: any, b: any) => a.seqNum - b.seqNum);

      const localMaxSeq = ledger.length > 0 ? ledger[ledger.length - 1].sequenceId : minSeq - 1;
      let localModified = false;

      for (const dbBlock of partitionDbBlocks) {
        if (dbBlock.seqNum > localMaxSeq) {
          const restoredEntry: GovernanceLedgerEntry = {
            sequenceId: dbBlock.seqNum,
            timestamp: dbBlock.createdAt.toISOString(),
            type: dbBlock.type as any,
            payload: dbBlock.payload,
            operatorId: dbBlock.operator,
            signature: dbBlock.signature,
            prevHash: dbBlock.prevHash,
            hash: dbBlock.hash,
            epoch: dbBlock.epoch,
            verdict: dbBlock.status as any
          };

          const expectedHash = this.computeHash(restoredEntry);
          if (expectedHash !== restoredEntry.hash) {
            logger.error({ seq: dbBlock.seqNum }, `[GovernanceLedger] Cryptographic mismatch on restoring block from DB! Expected ${expectedHash}, got ${restoredEntry.hash}`);
            continue;
          }

          ledger.push(restoredEntry);
          localModified = true;
          logger.info({ seq: dbBlock.seqNum }, `[GovernanceLedger] Successfully reconstructed missing local ledger block from PostgreSQL consensus store.`);
        }
      }

      if (localModified) {
        this.saveLedger(ledger, partition);
      }
    } catch (e: any) {
      logger.warn(`[GovernanceLedger] Replicated consensus storage is currently offline or unreachable for partition ${partition}: ${e.message || e}`);
    } finally {
      this.releaseLock(partition);
    }

    try {
      if (modified || queue.length > 0) {
        await this.processOutbox(partition);
      }
    } catch (e: any) {
      logger.warn(`[GovernanceLedger] PostgreSQL sync trigger failed for partition ${partition}: ${e.message || e}`);
    }
  },

  createGenesisEntry(partition: number = 0): GovernanceLedgerEntry {
    const payload = `Genesis block initialized: Sovereign ZTAN Root of Trust Established for Partition ${partition}.`;
    const prevHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date('2026-05-14T00:00:00Z').toISOString();
    const signature = this.signPayload(payload);
    const genesisSeq = (partition * 1000000) + 1000;
    const hash = this.computeHash({
      sequenceId: genesisSeq,
      timestamp,
      type: 'GOVERNANCE',
      payload,
      operatorId: 'SYSTEM-ROOT',
      signature,
      prevHash,
      epoch: '100',
      verdict: 'VERIFIED'
    });

    return {
      sequenceId: genesisSeq,
      timestamp,
      type: 'GOVERNANCE',
      payload,
      operatorId: 'SYSTEM-ROOT',
      signature,
      prevHash,
      hash,
      epoch: '100',
      verdict: 'VERIFIED'
    };
  },

  computeHash(entry: Omit<GovernanceLedgerEntry, 'hash'>): string {
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
  },

  signPayload(payload: string): string {
    const { privateKey } = getOrCreateOperatorKeys();
    const sign = crypto.createSign('SHA256');
    sign.update(payload);
    sign.end();
    return sign.sign(privateKey).toString('base64');
  },

  verifySignature(payload: string, signatureBase64: string): boolean {
    try {
      const { publicKey } = getOrCreateOperatorKeys();
      const verify = crypto.createVerify('SHA256');
      verify.update(payload);
      verify.end();
      return verify.verify(publicKey, Buffer.from(signatureBase64, 'base64'));
    } catch (e) {
      return false;
    }
  },

  loadLedger(partition: number = 0): GovernanceLedgerEntry[] {
    try {
      const ledgerFile = this.getLedgerFile(partition);
      if (!fs.existsSync(ledgerFile)) {
        this.initPartition(partition);
      }
      const content = fs.readFileSync(ledgerFile, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      logger.error(`[GovernanceLedger] Failed to read ledger file for partition ${partition}, returning empty array`);
      return [];
    }
  },

  saveLedger(entries: GovernanceLedgerEntry[], partition: number = 0): void {
    this.assertLockFencing(partition);
    const ledgerFile = this.getLedgerFile(partition);
    const tmpFile = `${ledgerFile}.tmp`;
    try {
      fs.writeFileSync(tmpFile, JSON.stringify(entries, null, 2), 'utf8');
      fs.renameSync(tmpFile, ledgerFile);
    } catch (e) {
      logger.error({ err: e }, `[GovernanceLedger] Failed to save ledger atomically for partition ${partition}, falling back to standard write`);
      try {
        fs.writeFileSync(ledgerFile, JSON.stringify(entries, null, 2), 'utf8');
      } catch (innerErr) {
        logger.error({ err: innerErr }, `[GovernanceLedger] Ledger fallback write failed completely for partition ${partition}`);
      }
    }
  },

  async appendEntry(
    type: GovernanceLedgerEntry['type'],
    payload: string,
    operatorId: string,
    verdict: GovernanceLedgerEntry['verdict'],
    epoch: string = '102',
    correlationId?: string,
    correlationMetadata?: {
      requestUuid: string;
      auditUuid: string;
      outboxUuid: string;
      ledgerBlockUuid: string;
    }
  ): Promise<GovernanceLedgerEntry> {
    const partition = this.getPartition(payload, correlationId);
    const state = this.getState(partition);
    if (state === 'FENCED' || state === 'QUARANTINED' || state === 'READ_ONLY') {
      throw new Error(`[GovernanceLedger] Strict State Machine Violation: Cannot append entry to partition ${partition} while in ${state} state.`);
    }

    // Compute natural compound idempotency key
    // Include requestUuid in the hash input when available to prevent semantic collision
    // ambiguity: two logically distinct operations with identical payloads (e.g. triggering
    // the same drill twice) must produce different natural keys, while retries of the same
    // operation (same requestUuid) still deduplicate correctly.
    const hashInput = correlationMetadata?.requestUuid
      ? `${payload}::${correlationMetadata.requestUuid}`
      : payload;
    const payloadHash = crypto.createHash('sha256').update(hashInput).digest('hex');
    const naturalKey = `ztan-natural-${payloadHash}`;

    // 1. Idempotency Retry Check (Fast Path) - requestUuid
    if (correlationMetadata && correlationMetadata.requestUuid) {
      const ledger = this.loadLedger(partition);
      const existingLocal = ledger.find(e => e.payload.includes(`requestUuid=${correlationMetadata.requestUuid}`));
      if (existingLocal) {
        logger.info({ requestUuid: correlationMetadata.requestUuid, sequenceId: existingLocal.sequenceId }, `[GovernanceLedger] Idempotent retry hit in local ledger. Returning existing entry.`);
        return existingLocal;
      }

      try {
        const dbBlock = await db.ztanLedgerBlock.findFirst({
          where: {
            payload: {
              contains: `requestUuid=${correlationMetadata.requestUuid}`
            }
          }
        });
        if (dbBlock) {
          logger.info({ requestUuid: correlationMetadata.requestUuid, blockId: dbBlock.blockId }, `[GovernanceLedger] Idempotent retry hit in database consensus store. Returning existing entry.`);
          return {
            sequenceId: parseInt(dbBlock.blockId, 10),
            timestamp: dbBlock.createdAt.toISOString(),
            type: dbBlock.type as any,
            payload: dbBlock.payload,
            operatorId: dbBlock.operator,
            signature: dbBlock.signature,
            prevHash: dbBlock.prevHash,
            hash: dbBlock.hash,
            epoch: dbBlock.epoch,
            verdict: dbBlock.status as any
          };
        }
      } catch (dbErr) {
        // Ignore DB query errors in case DB is offline/partitioned
      }
    }

    // 2. Idempotency Retry Check (Fast Path) - naturalKey
    try {
      const naturalRecord = await db.idempotencyRecord.findUnique({
        where: { key: naturalKey }
      });
      if (naturalRecord && naturalRecord.response) {
        const seq = (naturalRecord.response as any).sequenceId;
        if (seq) {
          logger.info({ naturalKey, sequenceId: seq }, `[GovernanceLedger] Natural key idempotency hit in DB. Returning existing entry.`);
          const ledger = this.loadLedger(partition);
          const existingLocal = ledger.find(e => e.sequenceId === seq);
          if (existingLocal) {
            return existingLocal;
          }
          const dbBlock = await db.ztanLedgerBlock.findUnique({
            where: { blockId: seq.toString() }
          });
          if (dbBlock) {
            return {
              sequenceId: seq,
              timestamp: dbBlock.createdAt.toISOString(),
              type: dbBlock.type as any,
              payload: dbBlock.payload,
              operatorId: dbBlock.operator,
              signature: dbBlock.signature,
              prevHash: dbBlock.prevHash,
              hash: dbBlock.hash,
              epoch: dbBlock.epoch,
              verdict: dbBlock.status as any
            };
          }
        }
      }
    } catch (err) {
      // Ignore in case DB is offline/partitioned
    }

    await this.acquireLockAsync(partition);
    try {
      await this.assertLockFencingAsync(partition);
      const ledger = this.loadLedger(partition);

      // Post-Lock Check to prevent duplicate local ledger appends under concurrent retry storms
      if (correlationMetadata && correlationMetadata.requestUuid) {
        const existingLocal = ledger.find(e => e.payload.includes(`requestUuid=${correlationMetadata.requestUuid}`));
        if (existingLocal) {
          logger.info({ requestUuid: correlationMetadata.requestUuid, sequenceId: existingLocal.sequenceId }, `[GovernanceLedger] Idempotent retry hit in local ledger post-lock. Returning existing entry.`);
          return existingLocal;
        }
      }

      // Post-Lock Check by naturalKey
      try {
        const naturalRecord = await db.idempotencyRecord.findUnique({
          where: { key: naturalKey }
        });
        if (naturalRecord && naturalRecord.response) {
          const seq = (naturalRecord.response as any).sequenceId;
          if (seq) {
            logger.info({ naturalKey, sequenceId: seq }, `[GovernanceLedger] Natural key idempotency hit in DB post-lock. Returning existing entry.`);
            const existingLocal = ledger.find(e => e.sequenceId === seq);
            if (existingLocal) {
              return existingLocal;
            }
          }
        }
      } catch (err) {
        // Ignore
      }

      const lastEntry = ledger[ledger.length - 1];

      const sequenceId = lastEntry ? lastEntry.sequenceId + 1 : (partition * 1000000) + 1001;
      const prevHash = lastEntry ? lastEntry.hash : '0x0000000000000000000000000000000000000000000000000000000000000000';
      const timestamp = new Date().toISOString();

      let enrichedPayload = payload;
      if (correlationMetadata) {
        enrichedPayload = `${payload} [CorrelationTrace: requestUuid=${correlationMetadata.requestUuid}, auditUuid=${correlationMetadata.auditUuid}, outboxUuid=${correlationMetadata.outboxUuid}, ledgerBlockUuid=${correlationMetadata.ledgerBlockUuid}]`;
      }

      const signature = this.signPayload(enrichedPayload);

      const entryData: Omit<GovernanceLedgerEntry, 'hash'> = {
        sequenceId,
        timestamp,
        type,
        payload: enrichedPayload,
        operatorId,
        signature,
        prevHash,
        epoch,
        verdict
      };

      const hash = this.computeHash(entryData);
      const entry: GovernanceLedgerEntry = { ...entryData, hash };

      let syncedToDb = false;
      try {
        await db.$transaction(async (tx: any) => {
          // Enforce strict lock timeouts within the transaction boundary
          await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '15s';`);

          if (process.env.ZTAN_KILL_POINT === 'BEFORE_DB_COMMIT') {
            logger.warn('[GovernanceLedger] Simulated crash triggered: BEFORE_DB_COMMIT');
            process.exit(138);
          }

          // Chaos Test Injection: Synthetic Partial Transaction Stall
          if (process.env.ZTAN_INJECT_TX_STALL === 'true') {
             logger.warn(`[GovernanceLedger] Chaos Injection: Stalling active mutation transaction for 20 seconds while holding FOR UPDATE lock...`);
             await new Promise(resolve => setTimeout(resolve, 20000));
          }

          // Chaos Test Injection: Process Death Mid-Transaction
          if (process.env.ZTAN_INJECT_TX_CRASH === 'true') {
             logger.warn(`[GovernanceLedger] Chaos Injection: Crashing process mid-mutation-transaction! FOR UPDATE lock should be automatically rolled back by Postgres.`);
             process.exit(139);
          }

          // Transaction-bound Epoch Fencing Check
          const expectedGen = this.activeDbGenerations.get(partition) ?? null;
          if (expectedGen !== null) {
            const leaseId = `singleton-lease-partition-${partition}`;
            const rows = (await tx.$queryRawUnsafe(`
              SELECT generation, owner_pid as "ownerPid", owner_host as "ownerHost"
              FROM "ZtanActiveLease"
              WHERE id = $1
              FOR UPDATE
            `, leaseId)) as any[];
            if (rows.length > 0) {
              const row = rows[0];
              const hostname = os.hostname();
              const pid = process.pid;
              if (row.ownerHost !== hostname || Number(row.ownerPid) !== pid || Number(row.generation) !== expectedGen) {
                leaseFencingRevocationsTotal.inc({ node_id: hostname, reason: `lease_stolen_p${partition}` });
                throw new Error(
                  `[GovernanceLedger] Fencing Distributed Lease Violation: Database lease stolen by another host/process for partition ${partition}. Current Owner: Host: ${row.ownerHost}, PID: ${row.ownerPid}, Gen: ${row.generation} (Local Owner: Host: ${hostname}, PID: ${pid}, Gen: ${expectedGen})`
                );
              }
            } else {
              leaseFencingRevocationsTotal.inc({ node_id: os.hostname(), reason: `lease_deleted_p${partition}` });
              throw new Error(`[GovernanceLedger] Fencing Distributed Lease Violation: Database lease has been deleted for partition ${partition}.`);
            }
          } else {
            throw new Error(`[GovernanceLedger] Fencing Distributed Lease Violation: No local active database generation found for partition ${partition}.`);
          }

          // Prevent concurrent replay races by creating a unique idempotency record
          if (correlationMetadata && correlationMetadata.requestUuid) {
            await tx.idempotencyRecord.create({
              data: {
                key: `ztan-request-${correlationMetadata.requestUuid}`,
                status: 'completed',
                response: { sequenceId }
              }
            });
          }

          // Create the natural key idempotency record
          await tx.idempotencyRecord.create({
            data: {
              key: naturalKey,
              status: 'completed',
              response: { sequenceId }
            }
          });

          const wal = await tx.ztanWalLog.create({
            data: {
              seq: sequenceId,
              type: entry.type,
              payload: entry.payload,
              status: 'PENDING'
            }
          });

          await tx.ztanLedgerBlock.create({
            data: {
              blockId: entry.sequenceId.toString(),
              prevHash: entry.prevHash,
              hash: entry.hash,
              type: entry.type,
              payload: entry.payload,
              operator: entry.operatorId,
              signature: entry.signature,
              status: entry.verdict,
              epoch: entry.epoch,
              createdAt: new Date(entry.timestamp)
            }
          });

          // Atomic transaction write of the corresponding AuditLog row
          const auditInfo = parseCorrelationAndPayload(entry.payload, entry.timestamp, entry.operatorId);
          if (auditInfo) {
            await tx.auditLog.create({
              data: {
                id: auditInfo.auditUuid,
                action: auditInfo.action,
                resource: auditInfo.resource,
                userId: auditInfo.userId,
                tenantId: 'platform-admin',
                status: 'SUCCESS',
                metadata: auditInfo.metadata,
                createdAt: new Date(entry.timestamp)
              }
            });
          }

          await tx.ztanWalLog.update({
            where: { id: wal.id },
            data: { status: 'COMMITTED' }
          });
        });

        if (process.env.ZTAN_KILL_POINT === 'AFTER_DB_COMMIT') {
          logger.warn('[GovernanceLedger] Simulated crash triggered: AFTER_DB_COMMIT');
          process.exit(139);
        }

        await db.$executeRawUnsafe(`NOTIFY ztan_ledger_update, '${sequenceId}';`).catch(() => {});
        syncedToDb = true;
        try {
          this.transitionTo(partition, 'ACTIVE', 'Successful Postgres transaction write');
        } catch {}
        logger.info({ sequenceId, type, hash, partition }, `[GovernanceLedger] Successfully appended to PostgreSQL for partition ${partition} with WAL transaction`);
      } catch (dbErr: any) {
        if (dbErr.code === 'P2002') {
          logger.info({ requestUuid: correlationMetadata?.requestUuid, naturalKey }, `[GovernanceLedger] Database write failed with P2002. Checking for existing block.`);
          
          // 1. Try finding by requestUuid (local or DB)
          if (correlationMetadata && correlationMetadata.requestUuid) {
            const ledgerCopy = this.loadLedger(partition);
            const existingLocal = ledgerCopy.find(e => e.payload.includes(`requestUuid=${correlationMetadata.requestUuid}`));
            if (existingLocal) {
              return existingLocal;
            }
            try {
              const dbBlock = await db.ztanLedgerBlock.findFirst({
                where: {
                  payload: {
                    contains: `requestUuid=${correlationMetadata.requestUuid}`
                  }
                }
              });
              if (dbBlock) {
                const returnedEntry: GovernanceLedgerEntry = {
                  sequenceId: parseInt(dbBlock.blockId, 10),
                  timestamp: dbBlock.createdAt.toISOString(),
                  type: dbBlock.type as any,
                  payload: dbBlock.payload,
                  operatorId: dbBlock.operator,
                  signature: dbBlock.signature,
                  prevHash: dbBlock.prevHash,
                  hash: dbBlock.hash,
                  epoch: dbBlock.epoch,
                  verdict: dbBlock.status as any
                };
                if (!ledgerCopy.some(e => e.sequenceId === returnedEntry.sequenceId)) {
                  ledgerCopy.push(returnedEntry);
                  this.saveLedger(ledgerCopy, partition);
                }
                return returnedEntry;
              }
            } catch (dbReadErr) {
              logger.error({ err: dbReadErr }, '[GovernanceLedger] Failed to fetch existing block by requestUuid on P2002 error.');
            }
          }

          // 2. Try finding by naturalKey
          try {
            const naturalRecord = await db.idempotencyRecord.findUnique({
              where: { key: naturalKey }
            });
            if (naturalRecord && naturalRecord.response) {
              const seq = (naturalRecord.response as any).sequenceId;
              if (seq) {
                const ledgerCopy = this.loadLedger(partition);
                const existingLocal = ledgerCopy.find(e => e.sequenceId === seq);
                if (existingLocal) {
                  return existingLocal;
                }
                const dbBlock = await db.ztanLedgerBlock.findUnique({
                  where: { blockId: seq.toString() }
                });
                if (dbBlock) {
                  const returnedEntry: GovernanceLedgerEntry = {
                    sequenceId: seq,
                    timestamp: dbBlock.createdAt.toISOString(),
                    type: dbBlock.type as any,
                    payload: dbBlock.payload,
                    operatorId: dbBlock.operator,
                    signature: dbBlock.signature,
                    prevHash: dbBlock.prevHash,
                    hash: dbBlock.hash,
                    epoch: dbBlock.epoch,
                    verdict: dbBlock.status as any
                  };
                  if (!ledgerCopy.some(e => e.sequenceId === returnedEntry.sequenceId)) {
                    ledgerCopy.push(returnedEntry);
                    this.saveLedger(ledgerCopy, partition);
                  }
                  return returnedEntry;
                }
              }
            }
          } catch (dbReadErr) {
            logger.error({ err: dbReadErr }, '[GovernanceLedger] Failed to fetch existing block by naturalKey on P2002 error.');
          }
        }

        try {
          this.transitionTo(partition, 'DEGRADED', `Postgres transaction write failed: ${dbErr.message || dbErr}`);
        } catch {}
        logger.warn({ err: dbErr.message || dbErr }, `[GovernanceLedger] Direct PostgreSQL transactional append failed for partition ${partition}, falling back to local outbox`);
      }

      if (process.env.ZTAN_KILL_POINT === 'BEFORE_LOCAL_FSYNC') {
        logger.warn('[GovernanceLedger] Simulated crash triggered: BEFORE_LOCAL_FSYNC');
        process.exit(137);
      }

      ledger.push(entry);
      this.saveLedger(ledger, partition);

      if (process.env.ZTAN_KILL_POINT === 'AFTER_LOCAL_FSYNC') {
        logger.warn('[GovernanceLedger] Simulated crash triggered: AFTER_LOCAL_FSYNC');
        process.exit(140);
      }

      logger.info({ sequenceId, type, hash, partition }, `[GovernanceLedger] Appended new cryptographically chained event to local file for partition ${partition}`);

      if (!syncedToDb) {
        const queue = this.loadOutbox(partition);
        if (!queue.includes(sequenceId)) {
          queue.push(sequenceId);
          this.saveOutbox(queue, partition);
        }

        this.processOutbox(partition).catch((dbErr) => {
          logger.warn(`[GovernanceLedger] PostgreSQL async replication trigger deferred for partition ${partition}: ${dbErr.message || dbErr}`);
        });
      }

      if (process.env.ZTAN_KILL_POINT === 'BEFORE_ACK') {
        logger.warn('[GovernanceLedger] Simulated crash triggered: BEFORE_ACK');
        process.exit(141);
      }

      return entry;
    } finally {
      this.releaseLock(partition);
    }
  },

  async compactLedger(keepRecentCount: number = 3, partition?: number): Promise<void> {
    if (partition === undefined) {
      const count = this.getPartitionCount();
      for (let p = 0; p < count; p++) {
        await this.compactLedger(keepRecentCount, p).catch(() => {});
      }
      return;
    }

    await this.acquireLockAsync(partition);
    try {
      await this.assertLockFencingAsync(partition);
      const ledger = this.loadLedger(partition);
      if (ledger.length <= keepRecentCount) {
        return;
      }

      const dbEntries = await db.ztanLedgerBlock.findMany({
        select: { blockId: true }
      });
      const replicatedIds = new Set(dbEntries.map((e: any) => parseInt(e.blockId, 10)));

      const maxCompactibleIndex = ledger.length - keepRecentCount;
      let anchorIndex = -1;

      for (let i = maxCompactibleIndex; i >= 0; i--) {
        if (replicatedIds.has(ledger[i].sequenceId)) {
          anchorIndex = i;
          break;
        }
      }

      if (anchorIndex <= 0) {
        logger.info(`[GovernanceLedger] Compaction deferred for partition ${partition}: No fully replicated blocks found within safe compaction window.`);
        return;
      }

      const anchorSequenceId = ledger[anchorIndex].sequenceId;
      const compacted = ledger.slice(anchorIndex);

      try {
        const epochVal = parseInt(ledger[anchorIndex].epoch, 10) || 100;
        await db.$transaction(async (tx: any) => {
          // Transaction-bound Epoch Fencing Check
          const expectedGen = this.activeDbGenerations.get(partition) ?? null;
          if (expectedGen !== null) {
            const leaseId = `singleton-lease-partition-${partition}`;
            const rows = (await tx.$queryRawUnsafe(`
              SELECT generation, owner_pid as "ownerPid", owner_host as "ownerHost"
              FROM "ZtanActiveLease"
              WHERE id = $1
              FOR UPDATE
            `, leaseId)) as any[];
            if (rows.length > 0) {
              const row = rows[0];
              const hostname = os.hostname();
              const pid = process.pid;
              if (row.ownerHost !== hostname || Number(row.ownerPid) !== pid || Number(row.generation) !== expectedGen) {
                throw new Error(
                  `[GovernanceLedger] Fencing Distributed Lease Violation: Database lease stolen by another host/process for partition ${partition}. Current Owner: Host: ${row.ownerHost}, PID: ${row.ownerPid}, Gen: ${row.generation} (Local Owner: Host: ${hostname}, PID: ${pid}, Gen: ${expectedGen})`
                );
              }
            } else {
              throw new Error(`[GovernanceLedger] Fencing Distributed Lease Violation: Database lease has been deleted for partition ${partition}.`);
            }
          } else {
            throw new Error(`[GovernanceLedger] Fencing Distributed Lease Violation: No local active database generation found for partition ${partition}.`);
          }

          await tx.ztanSnapshot.upsert({
            where: { epoch: epochVal },
            create: {
              epoch: epochVal,
              lastSeq: anchorSequenceId,
              lastHash: ledger[anchorIndex].hash,
              stateData: JSON.stringify(compacted)
            },
            update: {
              lastSeq: anchorSequenceId,
              lastHash: ledger[anchorIndex].hash,
              stateData: JSON.stringify(compacted)
            }
          });
        });
        logger.info({ anchorSequenceId, epoch: epochVal }, `[GovernanceLedger] PostgreSQL snapshot created/updated during compaction for partition ${partition}`);
      } catch (snapErr: any) {
        logger.warn({ err: snapErr.message || snapErr }, `[GovernanceLedger] PostgreSQL snapshot creation deferred for partition ${partition}`);
      }

      this.saveLedger(compacted, partition);
      logger.info(
        { originalSize: ledger.length, compactedSize: compacted.length, snapshotAnchorSequenceId: anchorSequenceId },
        `[GovernanceLedger] Ledger compacted successfully for partition ${partition}. Truncated history before sequence ${anchorSequenceId}.`
      );
    } catch (err: any) {
      logger.warn(`[GovernanceLedger] Ledger compaction deferred for partition ${partition}: ${err.message || err}`);
    } finally {
      this.releaseLock(partition);
    }
  },

  verifyLedger(partition: number = 0): { valid: boolean; tamperedIndex?: number; error?: string } {
    const ledger = this.loadLedger(partition);
    if (ledger.length === 0) {
      return { valid: false, error: `Ledger is empty for partition ${partition}` };
    }

    for (let i = 0; i < ledger.length; i++) {
      const entry = ledger[i];

      if (i === 0) {
        const expectedGenesisSeq = (partition * 1000000) + 1000;
        if (entry.sequenceId === expectedGenesisSeq && entry.prevHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
          return { valid: false, tamperedIndex: i, error: `Genesis prevHash is invalid for partition ${partition}` };
        }
      } else {
        const prevEntry = ledger[i - 1];
        if (entry.prevHash !== prevEntry.hash) {
          return { valid: false, tamperedIndex: i, error: `Hash fracture: prevHash mismatch at entry ${entry.sequenceId} on partition ${partition}` };
        }
      }

      const computed = this.computeHash(entry);
      if (entry.hash !== computed) {
        return { valid: false, tamperedIndex: i, error: `Content tampered: hash mismatch at entry ${entry.sequenceId} on partition ${partition}` };
      }

      const sigValid = this.verifySignature(entry.payload, entry.signature);
      if (!sigValid) {
        return { valid: false, tamperedIndex: i, error: `Invalid asymmetric signature at entry ${entry.sequenceId} on partition ${partition}` };
      }
    }

    return { valid: true };
  },

  async verifyDbLedger(): Promise<{ valid: boolean; error?: string; count?: number; outboxLength?: number; synchronized?: boolean }> {
    try {
      const dbEntries = await db.ztanLedgerBlock.findMany();
      if (dbEntries.length === 0) {
        return { valid: false, error: 'PostgreSQL ledger table is empty' };
      }

      const partitions = new Map<number, typeof dbEntries>();
      for (const entry of dbEntries) {
        const seq = parseInt(entry.blockId, 10);
        const p = Math.floor(seq / 1000000);
        if (!partitions.has(p)) {
          partitions.set(p, []);
        }
        partitions.get(p)!.push(entry);
      }

      for (const [p, entries] of partitions.entries()) {
        entries.sort((a: any, b: any) => parseInt(a.blockId, 10) - parseInt(b.blockId, 10));

        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];

          if (i === 0) {
            if (entry.prevHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
              return { valid: false, error: `Database Genesis block prevHash is invalid for partition ${p}` };
            }
          } else {
            const prevEntry = entries[i - 1];
            if (entry.prevHash !== prevEntry.hash) {
              return { valid: false, error: `Database Hash fracture: prevHash mismatch at block ${entry.blockId} on partition ${p}` };
            }
          }

          const sigValid = this.verifySignature(entry.payload, entry.signature);
          if (!sigValid) {
            return { valid: false, error: `Database signature check failed at block ${entry.blockId} on partition ${p}` };
          }

          const computed = this.computeHash({
            sequenceId: parseInt(entry.blockId, 10),
            timestamp: entry.createdAt.toISOString(),
            type: entry.type as any,
            payload: entry.payload,
            operatorId: entry.operator,
            signature: entry.signature,
            prevHash: entry.prevHash,
            epoch: entry.epoch,
            verdict: entry.status as any
          });
          if (entry.hash !== computed) {
            return { valid: false, error: `Database block hash mismatch at block ${entry.blockId} on partition ${p}` };
          }
        }
      }

      let totalOutboxLen = 0;
      let allSynced = true;
      const count = this.getPartitionCount();
      for (let p = 0; p < count; p++) {
        const outbox = this.getOutboxStatus(p);
        totalOutboxLen += outbox.queueLength;
        if (!outbox.synchronized) {
          allSynced = false;
        }
      }

      return { 
        valid: true, 
        count: dbEntries.length,
        outboxLength: totalOutboxLen,
        synchronized: allSynced
      };
    } catch (e: any) {
      return { valid: false, error: `PostgreSQL connection offline or failed: ${e.message || e}` };
    }
  }
};

