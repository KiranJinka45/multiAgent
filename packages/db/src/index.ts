import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var readPrisma: PrismaClient | undefined;
}

export const db = global.prisma || new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

export const readDb = global.readPrisma || (process.env.READ_REPLICA_URL 
  ? new PrismaClient({ datasources: { db: { url: process.env.READ_REPLICA_URL } } })
  : db);

if (process.env.NODE_ENV !== 'production') {
  global.prisma = db;
  global.readPrisma = readDb;
}

export * from '@prisma/client';
