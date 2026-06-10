import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * ZTAN ONE-COMMAND RECOVERY (OCR)
 * Designed for junior operators to restore the platform from scratch.
 */

async function runRecovery() {
    console.log('🏗️  ZTAN ONE-COMMAND RECOVERY INITIATED...');

    try {
        // 1. Preflight Checks
        console.log('\n🔍 STEP 1: Preflight Checks...');
        execSync('pnpm exec tsx scripts/validate-host-requirements.ts', { stdio: 'inherit' });

        // 1.5 Dependency Restoration
        console.log('\n📦 STEP 1.5: Dependency Restoration...');
        if (!fs.existsSync('node_modules')) {
            console.log('   - node_modules missing. Running pnpm install...');
            execSync('pnpm install', { stdio: 'inherit' });
        } else {
            console.log('   - node_modules already exists.');
        }

        // 2. Environment Initialization
        console.log('\n🔐 STEP 2: Environment Initialization...');
        if (!fs.existsSync('.env')) {
            console.log('   - .env missing. Running operator onboarding...');
            execSync('pnpm exec tsx scripts/operator-onboarding.ts', { stdio: 'inherit' });
        } else {
            console.log('   - .env already exists.');
        }

        // 3. Infrastructure Orchestration
        console.log('\n🐳 STEP 3: Infrastructure Orchestration...');
        console.log('   - Starting Postgres and Redis...');
        execSync('docker compose up -d postgres redis', { stdio: 'inherit' });
        
        console.log('   - Waiting for healthy state (10s)...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // 4. Schema Restoration
        console.log('\n📂 STEP 4: Schema Restoration...');
        console.log('   - Pushing Prisma schema to database...');
        execSync('pnpm run db:push', { stdio: 'inherit' });

        // 5. Service Warmup
        console.log('\n🔥 STEP 5: Service Warmup...');
        console.log('   - Building services (Parallel)...');
        execSync('pnpm run build', { stdio: 'inherit' });

        // 6. Verification
        console.log('\n✅ STEP 6: Final Verification...');
        console.log('   - Running Gateway smoke tests...');
        execSync('pnpm run test:smoke', { stdio: 'inherit' });

        console.log('\n✨ RECOVERY COMPLETE: ZTAN is operational.');
    } catch (err) {
        console.error('\n❌ RECOVERY FAILED:', (err as Error).message);
        console.error('👉 Check logs and ensure Docker is running.');
        process.exit(1);
    }
}

runRecovery();
