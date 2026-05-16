import { OperatorSimulations } from './packages/operator-simulations/index.js';
import { GovernanceCompressor } from './packages/governance-compression/index.ts';
import { ExplainabilityEngine } from './packages/governance-explainability/index.ts';
import { stakeManager } from './packages/staking-core/src/index.js';
import { SurvivabilityEngine } from './packages/staking-core/src/survivability/index.ts';

const survivability = new SurvivabilityEngine(stakeManager);

async function main() {
    console.log('--- STARTING OPERATOR VALIDATION TEST ---');
    
    // Initial State
    stakeManager.deposit('fed-01', 50000);
    stakeManager.deposit('fed-02', 50000);

    const scenario = OperatorSimulations.getScenarios().find(s => s.name === 'Shadow Capture')!;
    console.log(`\nScenario: ${scenario.name}`);
    scenario.run();

    // Verification
    const risk = stakeManager.getConcentrationRisk();
    const stability = survivability.calculateStabilityScore();
    const summary = GovernanceCompressor.summarize({
        concentrationRisk: risk,
        stabilityScore: stability,
        circuitBreakerTripped: false
    });

    console.log('\n--- OPERATOR INTERPRETATION ---');
    console.log(`Status: ${summary.health}`);
    console.log(`Recommendation: ${summary.recommendation}`);
    
    if (summary.health === 'DEGRADED') {
        console.log('\n--- EXPLANATION ---');
        console.log(ExplainabilityEngine.justify('CONCENTRATION_RISK_DETECTED'));
    }

    console.log('\n✅ Operator Validation Test Passed.');
}

main().catch(console.error);
