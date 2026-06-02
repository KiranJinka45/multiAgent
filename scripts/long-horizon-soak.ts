import { PrismaClient } from '@prisma/client';
import { AgentCoordinator } from '../packages/governance-core/src/intelligence/agent-coordinator.js';
import { db } from '../packages/db/src/index.js';

/**
 * ─── Phase 12 Tier E1: Long-Horizon Soak Harness ────────────────────────────
 * This script runs a continuous loop simulating operational friction.
 * It periodically coordinates objectives (simulating Intelligence loads) and 
 * generates consensus ledger writes (simulating distributed state bounds).
 */

const prisma = new PrismaClient();
const coordinator = new AgentCoordinator();
let running = true;
let loopCount = 0;

process.on('SIGINT', () => {
    console.log('\n[Soak Harness] Received SIGINT. Gracefully shutting down...');
    running = false;
});

async function randomDelay(minMs: number, maxMs: number) {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1) + minMs);
    return new Promise(resolve => setTimeout(resolve, delay));
}

async function simulateAgentLoad() {
    try {
        const objectives = [
            'Analyze resource utilization and propose scaling operations.',
            'Audit recent network traffic for anomalous loopback connections.',
            'Summarize the current ledger throughput.'
        ];
        const objective = objectives[Math.floor(Math.random() * objectives.length)];
        
        console.log(`\n[Soak Harness] Simulating Agent Coordination: "${objective}"`);
        // We use a mock tenant and don't strictly care about the output since we want to soak the layers
        const result = await coordinator.coordinateObjective(objective, 'soak-tenant-e1');
        
        console.log(`[Soak Harness] 🟢 Intelligence Coordination Succeeded. Tier: ${result.routeAttestation.assignedTier}`);
        
        // Write a scaling decision to simulate policy adjustments
        await db.scalingDecision.create({
            data: {
                tenantId: 'soak-tenant-e1',
                action: Math.random() > 0.5 ? 'SCALE_UP' : 'SCALE_DOWN',
                reason: 'Phase 12 Soak Harness simulated decision',
                metadata: { objective, tier: result.routeAttestation.assignedTier }
            }
        });
        
    } catch (err: any) {
        console.warn(`[Soak Harness] 🟡 Coordination Rejection (Expected during pressure): ${err.message}`);
    }
}

async function runSoakLoop(maxDurationMs?: number) {
    console.log('================================================================================');
    console.log('🌊 ZTAN PHASE 12 TIER E1: LONG-HORIZON SOAK HARNESS');
    console.log('================================================================================');
    
    const startTime = Date.now();
    
    while (running) {
        if (maxDurationMs && (Date.now() - startTime) >= maxDurationMs) {
            console.log(`[Soak Harness] Maximum bounded duration (${maxDurationMs}ms) reached. Stopping.`);
            break;
        }

        loopCount++;
        console.log(`\n--- Soak Iteration: ${loopCount} ---`);
        
        await simulateAgentLoad();
        
        // Simulate jitter
        await randomDelay(1000, 3000);
    }
    
    await prisma.$disconnect();
    console.log('[Soak Harness] Terminated successfully.');
}

// Parse args for bounded execution
const args = process.argv.slice(2);
const durationArg = args.find(a => a.startsWith('--duration='));
const maxMs = durationArg ? parseInt(durationArg.split('=')[1], 10) : undefined;

runSoakLoop(maxMs).catch(err => {
    console.error('[Soak Harness] Fatal error:', err);
    process.exit(1);
});
