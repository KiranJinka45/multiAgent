// src/index.ts
import { PrismaClient } from "@prisma/client";
export * from "@prisma/client";
function getDb() {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } }
    });
  }
  return global.prisma;
}
function getReadDb() {
  if (!global.readPrisma) {
    global.readPrisma = process.env.READ_REPLICA_URL ? new PrismaClient({ datasources: { db: { url: process.env.READ_REPLICA_URL } } }) : getDb();
  }
  return global.readPrisma;
}
var db = new Proxy({}, {
  get: (_target, prop) => getDb()[prop]
});
var readDb = new Proxy({}, {
  get: (_target, prop) => getReadDb()[prop]
});
export {
  db,
  readDb
};
