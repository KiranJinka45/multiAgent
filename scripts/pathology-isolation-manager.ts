/**
 * ZTAN — Pathology Isolation & Schema Sandboxing Manager
 * 
 * Dynamically provisions, migrates, and tears down ephemeral PostgreSQL schemas
 * to isolate destructive pathology trials from developer and baseline databases.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env') });

const DEFAULT_SCHEMA = 'ztan_pathology_isolated';

/**
 * Returns the sandboxed database URL with the custom schema query parameter.
 */
export function getSandboxedUrl(originalUrl: string, schemaName = DEFAULT_SCHEMA): string {
  try {
    const url = new URL(originalUrl);
    url.searchParams.set('schema', schemaName);
    return url.toString();
  } catch {
    // If parsing fails, fall back to string manipulation
    if (originalUrl.includes('?')) {
      const parts = originalUrl.split('?');
      const params = new URLSearchParams(parts[1]);
      params.set('schema', schemaName);
      return `${parts[0]}?${params.toString()}`;
    } else {
      return `${originalUrl}?schema=${schemaName}`;
    }
  }
}

/**
 * Provisions the ephemeral schema inside PostgreSQL.
 */
export async function setupSchema(schemaName = DEFAULT_SCHEMA): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not set in environment.');
  }

  console.log(`[Sandbox] Provisioning ephemeral schema: "${schemaName}"...`);
  
  // Connect using baseline Prisma Client to create the schema
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  
  try {
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`);
    console.log(`[Sandbox] Ephemeral schema "${schemaName}" successfully created.`);
  } catch (err: any) {
    console.error(`[Sandbox] Failed to create schema "${schemaName}": ${err.message}`);
    throw err;
  } finally {
    await prisma.$disconnect();
  }

  // Swap DATABASE_URL for prisma push
  const sandboxedUrl = getSandboxedUrl(dbUrl, schemaName);
  console.log(`[Sandbox] Running Prisma db push migration against sandboxed URL...`);
  
  try {
    // Run npx prisma db push with env override
    const { stdout, stderr } = await execAsync('npx prisma db push --schema=packages/db/prisma/schema.prisma --accept-data-loss --skip-generate', {
      cwd: rootDir,
      env: {
        ...process.env,
        DATABASE_URL: sandboxedUrl
      }
    });
    console.log(stdout);
    if (stderr && stderr.includes('Error')) {
      console.warn(`[Sandbox] Prisma warning/error during migration: ${stderr}`);
    }
    console.log(`[Sandbox] Ephemeral database schema migrated successfully.`);
  } catch (err: any) {
    console.error(`[Sandbox] Prisma migration failed: ${err.message}`);
    throw err;
  }
}

/**
 * Tears down and drops the ephemeral schema.
 */
export async function teardownSchema(schemaName = DEFAULT_SCHEMA): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not set in environment.');
  }

  console.log(`[Sandbox] Tearing down ephemeral schema: "${schemaName}" (CASCADE)...`);
  
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  
  try {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE;`);
    console.log(`[Sandbox] Ephemeral schema "${schemaName}" dropped successfully.`);
  } catch (err: any) {
    console.error(`[Sandbox] Failed to drop schema "${schemaName}": ${err.message}`);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

// Support CLI execution for manual testing and validation
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const isTeardown = args.includes('--teardown');
  const isSetup = args.includes('--setup');
  const schemaName = args.includes('--schema') ? args[args.indexOf('--schema') + 1] : DEFAULT_SCHEMA;

  (async () => {
    try {
      if (isTeardown) {
        await teardownSchema(schemaName);
      } else if (isSetup) {
        await setupSchema(schemaName);
      } else {
        console.log('Usage: npx tsx scripts/pathology-isolation-manager.ts [--setup | --teardown] [--schema <name>]');
      }
    } catch (e: any) {
      console.error(`CLI execution failed: ${e.message}`);
      process.exit(1);
    }
  })();
}
