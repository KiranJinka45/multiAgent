import { stakeManager } from './packages/staking-core/src/index.js';
import { ContainmentEngine } from './packages/staking-core/src/containment/index.js';
import { CircuitBreaker } from './packages/staking-core/src/circuit-breakers/index.js';
import { readFileSync } from 'fs';

const policy = JSON.parse(readFileSync('./configs/governance-stabilization/v1.json', 'utf8')).policies;
const containment = new ContainmentEngine(stakeManager, policy);
const circuitBreaker = new CircuitBreaker(stakeManager, policy);

async function main() {
    console.log('--- INITIALIZING CHAOS SCENARIO ---');
    stakeManager.deposit('fed-01', 50000); // 50%
    stakeManager.deposit('fed-02', 20000); // 20%
    stakeManager.deposit('fed-03', 20000); // 20%
    stakeManager.deposit('fed-04', 10000); // 10%

    console.log('\n--- CHAOS 1: COORDINATED WITHDRAWAL SURGE ---');
    stakeManager.withdraw('fed-02');
    stakeManager.withdraw('fed-03');
    circuitBreaker.checkWithdrawalSurge();
    console.log(`Circuit Breaker Status: ${circuitBreaker.status}`);
    console.log(`Reason: ${circuitBreaker.reason}`);

    console.log('\n--- CHAOS 2: SLASHING CASCADE THROTTLING ---');
    // Try to slash 25% (Total network stake is 100k, so 25k)
    // Policy limit is 10% of total (10k)
    const slashed = containment.throttledSlash('fed-01', 30); // 30% of 50k = 15k
    console.log(`Actual Slashed: ${slashed} ZTAN (Requested 15k)`);
    
    circuitBreaker.checkSlashingCascade(slashed);
    console.log(`Circuit Breaker Status: ${circuitBreaker.status}`);

    console.log('\n--- CHAOS 3: GOVERNANCE SLOWDOWN ---');
    console.log(`Current Slowdown Factor: ${containment.getGovernanceSlowdown()}x`);

    console.log('\n--- RECOVERY ---');
    circuitBreaker.reset();
    console.log(`Final Status: ${circuitBreaker.status}`);
}

main().catch(console.error);
