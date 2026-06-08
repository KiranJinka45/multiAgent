import pkg from '@prisma/client';
const { PrismaClient, Prisma } = pkg;
import fs from 'fs';
import path from 'path';

export type DbOutageType = 'db' | 'pool' | 'disk-full' | 'corrupt-payload' | 'checksum-mismatch' | 'lineage-mismatch';

export let dbOutageType: DbOutageType | null = null;
export let dbOutageDuration = 0;
export let dbOutageStart = 0;

export function injectDbOutage(durationMs: number, type: DbOutageType = 'db') {
    dbOutageType = type;
    dbOutageDuration = durationMs;
    dbOutageStart = Date.now();
    
    // Write to shared local file for cross-process CLI injection support
    try {
        const ztanDir = path.resolve(process.cwd(), '.ztan');
        if (!fs.existsSync(ztanDir)) {
            fs.mkdirSync(ztanDir, { recursive: true });
        }
        const filePath = path.join(ztanDir, 'injected_outage.json');
        fs.writeFileSync(filePath, JSON.stringify({
            type,
            durationMs,
            injectedAt: dbOutageStart
        }), 'utf8');
    } catch (_e) {}
}

export function clearDbOutage() {
    dbOutageType = null;
    dbOutageDuration = 0;
    dbOutageStart = 0;
    try {
        const filePath = path.resolve(process.cwd(), '.ztan/injected_outage.json');
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (_e) {}
}

export function getActiveDbOutage(): DbOutageType | null {
    if (dbOutageType) {
        if (Date.now() - dbOutageStart > dbOutageDuration) {
            clearDbOutage();
        } else {
            return dbOutageType;
        }
    }

    try {
        const filePath = path.resolve(process.cwd(), '.ztan/injected_outage.json');
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(raw);
            if (Date.now() - data.injectedAt > data.durationMs) {
                try { fs.unlinkSync(filePath); } catch (_e) {}
                return null;
            }
            return data.type;
        }
    } catch (_e) {}

    return null;
}

export function getActivePathologyConfig(): any {
    try {
        const filePath = path.resolve(process.cwd(), '.ztan/active_pathology.json');
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(raw);
        }
    } catch (_e) {}
    return null;
}

let prismaInstance: any;

if (process.env.MOCK_DB === 'true') {
    const blocks: any[] = [];
    const snapshots = new Map<number, any>();
    const walLogs: any[] = [];

    const mockZtanLedgerBlock = {
        findUnique: async (args: any) => {
            const blockId = args?.where?.blockId;
            if (blockId) {
                return blocks.find(b => b.blockId === blockId) || null;
            }
            const id = args?.where?.id;
            if (id) {
                return blocks.find(b => b.id === id) || null;
            }
            return null;
        },
        findFirst: async (args?: any) => {
            if (args?.where?.payload?.contains) {
                const search = args.where.payload.contains;
                return blocks.find(b => b.payload.includes(search)) || null;
            }
            if (args?.where?.blockId?.startsWith) {
                const prefix = args.where.blockId.startsWith;
                const filtered = blocks.filter(b => b.blockId.startsWith(prefix));
                return filtered[filtered.length - 1] || null;
            }
            if (args?.orderBy?.id === 'desc') {
                return blocks[blocks.length - 1] || null;
            }
            return null;
        },
        create: async (args: any) => {
            const data = { id: blocks.length + 1, ...args.data };
            blocks.push(data);
            return data;
        },
        findMany: async (args?: any) => {
            const prefix = args?.where?.blockId?.startsWith || '';
            return blocks.filter(b => b.blockId.startsWith(prefix));
        },
        delete: async (args: any) => {
            const id = args.where.id;
            const idx = blocks.findIndex(b => b.id === id);
            if (idx !== -1) {
                blocks.splice(idx, 1);
            }
        },
        deleteMany: async (_args?: any) => {
            blocks.length = 0;
            return { count: 0 };
        },
        update: async (args: any) => {
            const id = args.where.id;
            const block = blocks.find(b => b.id === id);
            if (block) {
                Object.assign(block, args.data);
            }
            return block;
        }
    };

    const mockZtanSnapshot = {
        upsert: async (args: any) => {
            const epoch = args.where.epoch;
            const data = { epoch, ...args.create };
            snapshots.set(epoch, data);
            return data;
        },
        findFirst: async (_args?: any) => {
            return Array.from(snapshots.values())[0] || null;
        },
        deleteMany: async (_args?: any) => {
            snapshots.clear();
            return { count: 0 };
        }
    };

    const mockZtanWalLog = {
        create: async (args: any) => {
            const data = { id: walLogs.length + 1, ...args.data };
            walLogs.push(data);
            return data;
        },
        update: async (args: any) => {
            const id = args.where.id;
            const log = walLogs.find(l => l.id === id);
            if (log) {
                Object.assign(log, args.data);
            }
            return log;
        },
        deleteMany: async (_args?: any) => {
            walLogs.length = 0;
            return { count: 0 };
        }
    };

    const activeLeases = new Map<string, any>();

    const mockQueryRawUnsafe = async (query: string, ...params: any[]) => {
        if (query.includes('FROM "ZtanActiveLease"')) {
            const leaseId = params[0];
            const lease = activeLeases.get(leaseId);
            if (lease) {
                return [{
                    generation: lease.generation,
                    ownerPid: lease.owner_pid,
                    ownerHost: lease.owner_host,
                    heartbeat: lease.heartbeat
                }];
            }
            return [];
        }
        return [];
    };

    const mockExecuteRawUnsafe = async (query: string, ...params: any[]) => {
        if (query.includes('INSERT INTO "ZtanActiveLease"')) {
            const [leaseId, pid, host] = params;
            activeLeases.set(leaseId, {
                id: leaseId,
                generation: 1,
                owner_pid: pid,
                owner_host: host,
                heartbeat: new Date()
            });
        } else if (query.includes('UPDATE "ZtanActiveLease"') && query.includes('SET generation =')) {
            const [gen, pid, host, leaseId] = params;
            activeLeases.set(leaseId, {
                id: leaseId,
                generation: gen,
                owner_pid: pid,
                owner_host: host,
                heartbeat: new Date()
            });
        } else if (query.includes('UPDATE "ZtanActiveLease"') && query.includes('SET heartbeat = NOW()') && !query.includes('INTERVAL')) {
            const [leaseId, pid, host, gen] = params;
            const lease = activeLeases.get(leaseId);
            if (lease && lease.owner_pid === pid && lease.owner_host === host && lease.generation === gen) {
                lease.heartbeat = new Date();
            }
        } else if (query.includes('UPDATE "ZtanActiveLease"') && query.includes('INTERVAL')) {
            const [leaseId, pid, host, gen] = params;
            const lease = activeLeases.get(leaseId);
            if (lease && lease.owner_pid === pid && lease.owner_host === host && lease.generation === gen) {
                lease.heartbeat = new Date(Date.now() - 30000);
            }
        }
        return 1;
    };

    const audits: any[] = [];
    const mockAuditLog = {
        findUnique: async (args: any) => {
            const id = args?.where?.id;
            return audits.find(a => a.id === id) || null;
        },
        create: async (args: any) => {
            audits.push(args.data);
            return args.data;
        }
    };

    const idempotency: any[] = [];
    const mockIdempotencyRecord = {
        findUnique: async (args: any) => {
            const key = args?.where?.key;
            return idempotency.find(i => i.key === key) || null;
        },
        create: async (args: any) => {
            idempotency.push(args.data);
            return args.data;
        }
    };

    const governanceEvents: any[] = [];
    const mockGovernanceEvent = {
        findFirst: async (args: any) => {
            const correlationId = args?.where?.correlationId;
            const eventType = args?.where?.eventType;
            if (correlationId) {
                let events = governanceEvents.filter(e => e.correlationId === correlationId);
                if (eventType) {
                    events = events.filter(e => e.eventType === eventType);
                }
                if (args?.orderBy?.timestamp === 'desc') {
                    return events[events.length - 1] || null;
                }
                return events[0] || null;
            }
            return null;
        },
        findMany: async (args: any) => {
            const correlationId = args?.where?.correlationId;
            let result = governanceEvents;
            if (correlationId) {
                result = result.filter(e => e.correlationId === correlationId);
            }
            if (args?.orderBy?.timestamp === 'asc') {
                return result; // array is push order
            }
            return result;
        },
        create: async (args: any) => {
            const data = { eventId: args.data.eventId || `mock-event-${Math.random().toString(36).substring(7)}`, ...args.data };
            governanceEvents.push(data);
            return data;
        },
        deleteMany: async () => {
            governanceEvents.length = 0;
            return { count: 0 };
        },
        update: async (args: any) => {
            const eventId = args.where.eventId;
            const event = governanceEvents.find(e => e.eventId === eventId);
            if (event) {
                Object.assign(event, args.data);
            }
            return event;
        }
    };

    const proposals: any[] = [];
    const mockProposedChange = {
        findUnique: async (args: any) => {
            const id = args?.where?.id;
            return proposals.find(p => p.id === id) || null;
        },
        create: async (args: any) => {
            const data = { id: `mock-proposal-${Math.random().toString(36).substring(7)}`, ...args.data };
            proposals.push(data);
            return data;
        }
    };

    const identities: any[] = [];
    const mockZtanIdentity = {
        findUnique: async (args: any) => {
            const nodeId = args?.where?.nodeId;
            return identities.find(i => i.nodeId === nodeId) || null;
        },
        create: async (args: any) => {
            identities.push(args.data);
            return args.data;
        },
        upsert: async (args: any) => {
            const nodeId = args.where.nodeId;
            let id = identities.find(i => i.nodeId === nodeId);
            if (id) {
                Object.assign(id, args.update);
            } else {
                id = args.create;
                identities.push(id);
            }
            return id;
        },
        update: async (args: any) => {
            const nodeId = args.where.nodeId;
            const id = identities.find(i => i.nodeId === nodeId);
            if (id) {
                Object.assign(id, args.data);
            }
            return id;
        }
    };

    prismaInstance = {
        ztanLedgerBlock: mockZtanLedgerBlock,
        ztanSnapshot: mockZtanSnapshot,
        ztanWalLog: mockZtanWalLog,
        auditLog: mockAuditLog,
        idempotencyRecord: mockIdempotencyRecord,
        governanceEvent: mockGovernanceEvent,
        proposedChange: mockProposedChange,
        ztanIdentity: mockZtanIdentity,
        $queryRawUnsafe: mockQueryRawUnsafe,
        $executeRawUnsafe: mockExecuteRawUnsafe,
        $transaction: async (cb: any) => {
            return await cb({
                ztanLedgerBlock: mockZtanLedgerBlock,
                ztanSnapshot: mockZtanSnapshot,
                ztanWalLog: mockZtanWalLog,
                auditLog: mockAuditLog,
                idempotencyRecord: mockIdempotencyRecord,
                governanceEvent: mockGovernanceEvent,
                proposedChange: mockProposedChange,
                ztanIdentity: mockZtanIdentity,
                $queryRawUnsafe: mockQueryRawUnsafe,
                $executeRawUnsafe: mockExecuteRawUnsafe
            });
        }
    };
} else {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
        const urlWithLimit = getUrlWithConnectionLimit(dbUrl, 50);
        prismaInstance = new PrismaClient({
            datasources: {
                db: {
                    url: urlWithLimit
                }
            }
        });
    } else {
        prismaInstance = new PrismaClient();
    }
}

export function getUrlWithConnectionLimit(baseUrl: string | undefined, limit: number): string | undefined {
    if (!baseUrl) return baseUrl;
    const cleanUrl = baseUrl.replace(/^"(.*)"$/, '$1');
    try {
        const urlObj = new URL(cleanUrl);
        urlObj.searchParams.set('connection_limit', limit.toString());
        return urlObj.toString();
    } catch (_e) {
        if (cleanUrl.includes('?')) {
            if (cleanUrl.includes('connection_limit=')) {
                return cleanUrl.replace(/connection_limit=\d+/, `connection_limit=${limit}`);
            }
            return `${cleanUrl}&connection_limit=${limit}`;
        }
        return `${cleanUrl}?connection_limit=${limit}`;
    }
}

export function wrapWithDbProxy(client: any): any {
    return new Proxy(client, {
        get(target, prop, receiver) {
            const outageType = getActiveDbOutage();
            
            if (prop === '$transaction') {
                const originalTx = Reflect.get(target, prop, receiver);
                return async function (...args: any[]) {
                    if (outageType === 'db') {
                        throw new Prisma.PrismaClientInitializationError("Can't reach database server", "5.22.0", "P1001");
                    } else if (outageType === 'pool') {
                        throw new Prisma.PrismaClientKnownRequestError("Database connection pool timed out", { code: "P1008", clientVersion: "5.22.0" });
                    }
                    
                    // For $transaction, we apply the same proxy to the transaction client
                    const txCallback = args[0];
                    const txOptions = args[1];
                    
                    const wrappedCallback = async (txClient: any) => {
                        const txProxy = new Proxy(txClient, {
                            get(txTarget, txProp, txReceiver) {
                                return createModelProxy(txTarget, txProp, txReceiver);
                            }
                        });
                        return await txCallback(txProxy);
                    };
                    return await originalTx.call(target, wrappedCallback, txOptions);
                };
            }

            return createModelProxy(target, prop, receiver);
        }
    });
}

/**
 * ─── Centralized Prisma Client Registry ──────────────────────────────────────
 * Prevents accidental client multiplication by enforcing a fixed set of
 * named roles, each mapped to a singleton Prisma client with controlled
 * pool sizing. Use getSharedClient(role) instead of creating ad-hoc clients.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export enum DbClientRole {
    PRIMARY = 'PRIMARY',       // Main application pool (50 connections)
    LEASE = 'LEASE',           // Governance lease/fencing operations (3 connections)
    ANALYTICS = 'ANALYTICS',   // Telemetry/observability queries (5 connections)
}

const isDev = process.env.NODE_ENV === 'development';
const ROLE_POOL_LIMITS: Record<DbClientRole, number> = {
    [DbClientRole.PRIMARY]: isDev ? 15 : 50,
    [DbClientRole.LEASE]: isDev ? 3 : 5,
    [DbClientRole.ANALYTICS]: isDev ? 2 : 10,
};

const clientRegistry = new Map<DbClientRole, any>();

export function getSharedClient(role: DbClientRole): any {
    if (clientRegistry.has(role)) {
        return clientRegistry.get(role)!;
    }

    const createClient = () => {
        if (role === DbClientRole.PRIMARY) {
            return dbProxy;
        }

        if (process.env.MOCK_DB === 'true') {
            return wrapWithDbProxy(prismaInstance);
        }

        const limit = ROLE_POOL_LIMITS[role];
        const dbUrl = process.env.DATABASE_URL;
        const urlWithLimit = getUrlWithConnectionLimit(dbUrl, limit);
        const newClient = new PrismaClient({
            datasources: {
                db: {
                    url: urlWithLimit
                }
            }
        });
        console.log(`[DbRegistry] Created dedicated Prisma client for role: ${role} (pool: ${limit})`);
        return wrapWithDbProxy(newClient);
    };

    const startWait = performance.now();
    // @ts-ignore — optional telemetry; resolution may fail in pruned Docker builds
    import('@packages/observability').then(obs => {
        if (obs && obs.prismaActiveWaiters) obs.prismaActiveWaiters.labels(role).inc();
    }).catch(() => {});

    const clientInstance = createClient();
    
    // @ts-ignore — optional telemetry; resolution may fail in pruned Docker builds
    import('@packages/observability').then(obs => {
        if (obs && obs.prismaActiveWaiters) obs.prismaActiveWaiters.labels(role).dec();
        if (obs && obs.prismaWaitDurationSeconds) obs.prismaWaitDurationSeconds.labels(role).observe((performance.now() - startWait) / 1000);
    }).catch(() => {});

    clientRegistry.set(role, clientInstance);
    return clientInstance;
}

/**
 * @deprecated Use getSharedClient(DbClientRole.LEASE) instead.
 * Kept for backward compatibility during migration.
 */
export function createDedicatedClient(connectionLimit: number): any {
    console.warn('[DbRegistry] createDedicatedClient() is deprecated. Use getSharedClient(DbClientRole) instead.');
    return getSharedClient(DbClientRole.LEASE);
}

const dbProxy = wrapWithDbProxy(prismaInstance);

function createModelProxy(target: any, prop: string | symbol, receiver: any) {
    const value = Reflect.get(target, prop, receiver);
    if (typeof prop === 'string' && !prop.startsWith('$') && typeof value === 'object' && value !== null) {
        return new Proxy(value, {
            get(modelTarget, modelProp, modelReceiver) {
                const original = Reflect.get(modelTarget, modelProp, modelReceiver);
                if (typeof original === 'function') {
                    return async function (...args: any[]) {
                        const outageType = getActiveDbOutage();
                        const pathConfig = getActivePathologyConfig();

                        // 1. Process Network degradation (latency, jitter, packet loss)
                        if (pathConfig && pathConfig.network) {
                            const { latencyMs, jitterMs, packetLossProb } = pathConfig.network;
                            if (latencyMs > 0) {
                                const delay = latencyMs + (jitterMs > 0 ? (Math.random() * 2 - 1) * jitterMs : 0);
                                if (delay > 0) {
                                    await new Promise(resolve => setTimeout(resolve, delay));
                                }
                            }
                            if (packetLossProb > 0 && Math.random() < packetLossProb) {
                                throw new Prisma.PrismaClientInitializationError("Connection dropped due to packet loss pathology", "5.22.0", "P1001");
                            }
                        }

                        // 2. Process Asymmetric Partitions
                        if (pathConfig && pathConfig.partition && pathConfig.partition.type === 'asymmetric') {
                            if (['create', 'update', 'upsert', 'delete', 'createMany', 'updateMany', 'deleteMany', '$executeRawUnsafe'].includes(modelProp as string)) {
                                throw new Prisma.PrismaClientKnownRequestError("Database connection timed out under partition split-brain", { code: "P1008", clientVersion: "5.22.0" });
                            }
                        }

                        // 3. Process Storage fsync delays
                        if (pathConfig && pathConfig.storage && pathConfig.storage.fsyncDelayMs > 0) {
                            if (['create', 'update', 'upsert', 'delete', 'createMany', 'updateMany', 'deleteMany', '$executeRawUnsafe'].includes(modelProp as string)) {
                                await new Promise(resolve => setTimeout(resolve, pathConfig.storage.fsyncDelayMs));
                            }
                        }

                        if (outageType === 'db') {
                            throw new Prisma.PrismaClientInitializationError("Can't reach database server", "5.22.0", "P1001");
                        } else if (outageType === 'pool') {
                            throw new Prisma.PrismaClientKnownRequestError("Database connection pool timed out", { code: "P1008", clientVersion: "5.22.0" });
                        } else if (outageType === 'disk-full') {
                            if (['create', 'update', 'upsert', 'delete', 'createMany', 'updateMany', 'deleteMany', '$executeRawUnsafe'].includes(modelProp as string)) {
                                throw new Prisma.PrismaClientKnownRequestError("No space left on device", { code: "P2024", clientVersion: "5.22.0" });
                            }
                        }

                        // Mutation before execution
                        if (outageType === 'corrupt-payload' && prop === 'ztanWalLog' && (modelProp === 'create' || modelProp === 'update')) {
                            if (args[0] && args[0].data && args[0].data.payload) {
                                args[0].data.payload = '{"corrupted": true, "broken';
                            }
                        }

                        const startQ = performance.now();
                        // Execute original
                        const result = await original.apply(modelTarget, args);
                        const durQ = (performance.now() - startQ) / 1000;
                        // @ts-ignore — optional telemetry; resolution may fail in pruned Docker builds
                        import('@packages/observability').then(obs => {
                            if (obs && obs.prismaQueryDurationSeconds) {
                                obs.prismaQueryDurationSeconds.labels(prop as string, modelProp as string).observe(durQ);
                            }
                        }).catch(() => {});

                        // Mutation after execution
                        if (outageType === 'checksum-mismatch' && prop === 'ztanLedgerBlock' && (modelProp === 'findFirst' || modelProp === 'findMany')) {
                            if (result && Array.isArray(result)) {
                                result.forEach(r => { if (r.payload) r.payload = '{"mutated": true}'; });
                            } else if (result && result.payload) {
                                result.payload = '{"mutated": true}';
                            }
                        }

                        if (outageType === 'lineage-mismatch' && prop === 'ztanLedgerBlock' && (modelProp === 'findFirst' || modelProp === 'findMany')) {
                            if (result && Array.isArray(result)) {
                                result.forEach(r => { if (r.previousBlockId) r.previousBlockId = 'invalid-lineage-id'; });
                            } else if (result && result.previousBlockId) {
                                result.previousBlockId = 'invalid-lineage-id';
                            }
                        }

                        return result;
                    };
                }
                return value;
            }
        });
    } else if (typeof value === 'function') {
        return async function (...args: any[]) {
            const outageType = getActiveDbOutage();
            const pathConfig = getActivePathologyConfig();

            // 1. Process Network degradation (latency, jitter, packet loss)
            if (pathConfig && pathConfig.network) {
                const { latencyMs, jitterMs, packetLossProb } = pathConfig.network;
                if (latencyMs > 0) {
                    const delay = latencyMs + (jitterMs > 0 ? (Math.random() * 2 - 1) * jitterMs : 0);
                    if (delay > 0) {
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
                if (packetLossProb > 0 && Math.random() < packetLossProb) {
                    throw new Prisma.PrismaClientInitializationError("Connection dropped due to packet loss pathology", "5.22.0", "P1001");
                }
            }

            // 2. Process Asymmetric Partitions
            if (pathConfig && pathConfig.partition && pathConfig.partition.type === 'asymmetric') {
                if (['$executeRawUnsafe'].includes(prop as string)) {
                    throw new Prisma.PrismaClientKnownRequestError("Database connection timed out under partition split-brain", { code: "P1008", clientVersion: "5.22.0" });
                }
            }

            // 3. Process Storage fsync delays
            if (pathConfig && pathConfig.storage && pathConfig.storage.fsyncDelayMs > 0) {
                if (['$executeRawUnsafe'].includes(prop as string)) {
                    await new Promise(resolve => setTimeout(resolve, pathConfig.storage.fsyncDelayMs));
                }
            }

            if (outageType === 'db') {
                throw new Prisma.PrismaClientInitializationError("Can't reach database server", "5.22.0", "P1001");
            } else if (outageType === 'pool') {
                throw new Prisma.PrismaClientKnownRequestError("Database connection pool timed out", { code: "P1008", clientVersion: "5.22.0" });
            } else if (outageType === 'disk-full' && prop === '$executeRawUnsafe') {
                throw new Prisma.PrismaClientKnownRequestError("No space left on device", { code: "P2024", clientVersion: "5.22.0" });
            }
            const startQ = performance.now();
            const result = await value.apply(target, args);
            const durQ = (performance.now() - startQ) / 1000;
            // @ts-ignore — optional telemetry; resolution may fail in pruned Docker builds
            import('@packages/observability').then(obs => {
                if (obs && obs.prismaQueryDurationSeconds) {
                    obs.prismaQueryDurationSeconds.labels('ROOT', prop as string).observe(durQ);
                }
            }).catch(() => {});
            return result;
        };
    }
    return value;
}

export const db = dbProxy;
export * from '@prisma/client';
export { bootstrapZtanSecurity } from './bootstrap.js';

// Background Metrics Daemon (Observability Risk 1)
setInterval(async () => {
    for (const [role, client] of clientRegistry.entries()) {
        try {
            if (process.env.MOCK_DB === 'true') continue;
            
            if (client && typeof client.$metrics?.json === 'function') {
                const metrics = await client.$metrics.json();
                
                // @ts-ignore — optional telemetry; resolution may fail in pruned Docker builds
                import('@packages/observability').then(obs => {
                    if (!obs) return;
                    
                    const activeConn = metrics.gauges.find((g: any) => g.key === 'query_active_connections')?.value ?? 0;
                    const idleConn = metrics.gauges.find((g: any) => g.key === 'query_idle_connections')?.value ?? 0;
                    const waitConn = metrics.gauges.find((g: any) => g.key === 'query_wait_connections')?.value ?? 0;
                    
                    if (obs.prismaActiveConnections) obs.prismaActiveConnections.labels(role).set(activeConn);
                    if (obs.prismaIdleConnections) obs.prismaIdleConnections.labels(role).set(idleConn);
                    if (obs.prismaActiveWaiters) obs.prismaActiveWaiters.labels(role).set(waitConn);
                    
                    const waitDuration = metrics.histograms.find((h: any) => h.key === 'query_wait_duration_ms');
                    if (waitDuration && obs.prismaWaitDurationSeconds && waitDuration.value.count > 0) {
                        const avgWaitSec = (waitDuration.value.sum / waitDuration.value.count) / 1000;
                        obs.prismaWaitDurationSeconds.labels(role).observe(avgWaitSec);
                    }
                    
                    if (obs.prismaPoolQueueAgeSeconds && waitConn > 0 && waitDuration) {
                        const avgAgeSec = (waitDuration.value.sum / waitDuration.value.count) / 1000;
                        obs.prismaPoolQueueAgeSeconds.labels(role).observe(avgAgeSec);
                    }
                }).catch(() => {});
            }
        } catch (_e) {}
    }
}, 2000).unref();


