import { PrismaClient, Prisma } from '@prisma/client';

export type DbOutageType = 'db' | 'pool' | 'disk-full' | 'corrupt-payload' | 'checksum-mismatch' | 'lineage-mismatch';

export let dbOutageType: DbOutageType | null = null;
export let dbOutageDuration = 0;
export let dbOutageStart = 0;

export function injectDbOutage(durationMs: number, type: DbOutageType = 'db') {
    dbOutageType = type;
    dbOutageDuration = durationMs;
    dbOutageStart = Date.now();
}

export function clearDbOutage() {
    dbOutageType = null;
    dbOutageDuration = 0;
    dbOutageStart = 0;
}

export function getActiveDbOutage(): DbOutageType | null {
    if (!dbOutageType) return null;
    if (Date.now() - dbOutageStart > dbOutageDuration) {
        clearDbOutage();
        return null;
    }
    return dbOutageType;
}

let prismaInstance: any;

if (process.env.MOCK_DB === 'true') {
    const blocks: any[] = [];
    const snapshots = new Map<number, any>();
    const walLogs: any[] = [];

    const mockZtanLedgerBlock = {
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
        deleteMany: async (args?: any) => {
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
        findFirst: async (args?: any) => {
            return Array.from(snapshots.values())[0] || null;
        },
        deleteMany: async (args?: any) => {
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
        deleteMany: async (args?: any) => {
            walLogs.length = 0;
            return { count: 0 };
        }
    };

    prismaInstance = {
        ztanLedgerBlock: mockZtanLedgerBlock,
        ztanSnapshot: mockZtanSnapshot,
        ztanWalLog: mockZtanWalLog,
        $transaction: async (cb: any) => {
            return await cb({
                ztanLedgerBlock: mockZtanLedgerBlock,
                ztanSnapshot: mockZtanSnapshot,
                ztanWalLog: mockZtanWalLog,
                $executeRawUnsafe: async () => {}
            });
        }
    };
} else {
    prismaInstance = new PrismaClient();
}

const dbProxy = new Proxy(prismaInstance, {
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

function createModelProxy(target: any, prop: string | symbol, receiver: any) {
    const value = Reflect.get(target, prop, receiver);
    if (typeof prop === 'string' && !prop.startsWith('$') && typeof value === 'object' && value !== null) {
        return new Proxy(value, {
            get(modelTarget, modelProp, modelReceiver) {
                const original = Reflect.get(modelTarget, modelProp, modelReceiver);
                if (typeof original === 'function') {
                    return async function (...args: any[]) {
                        const outageType = getActiveDbOutage();
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

                        // Execute original
                        const result = await original.apply(modelTarget, args);

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
            if (outageType === 'db') {
                throw new Prisma.PrismaClientInitializationError("Can't reach database server", "5.22.0", "P1001");
            } else if (outageType === 'pool') {
                throw new Prisma.PrismaClientKnownRequestError("Database connection pool timed out", { code: "P1008", clientVersion: "5.22.0" });
            } else if (outageType === 'disk-full' && prop === '$executeRawUnsafe') {
                throw new Prisma.PrismaClientKnownRequestError("No space left on device", { code: "P2024", clientVersion: "5.22.0" });
            }
            return await value.apply(target, args);
        };
    }
    return value;
}

export const db = dbProxy;
export * from '@prisma/client';
export { bootstrapZtanSecurity } from './bootstrap.js';

