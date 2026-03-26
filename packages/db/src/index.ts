import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var readPrisma: PrismaClient | undefined;
}

function getDb(): PrismaClient {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } }
    });
  }
  return global.prisma;
}

function getReadDb(): PrismaClient {
  if (!global.readPrisma) {
    global.readPrisma = process.env.READ_REPLICA_URL
      ? new PrismaClient({ datasources: { db: { url: process.env.READ_REPLICA_URL } } })
      : getDb();
  }
  return global.readPrisma;
}

// Lazy proxies — PrismaClient is only created when first accessed
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get: (_target, prop) => (getDb() as any)[prop],
});

export const readDb: PrismaClient = new Proxy({} as PrismaClient, {
  get: (_target, prop) => (getReadDb() as any)[prop],
});

export * from '@prisma/client';
