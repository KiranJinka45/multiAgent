import { PrismaClient } from '@prisma/client';

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

export const db = prismaInstance;
export * from '@prisma/client';
export { bootstrapZtanSecurity } from './bootstrap.js';

