import { stakeManager } from './packages/staking-core/src/index.js';
import { SurvivabilityEngine } from './packages/staking-core/src/survivability/index.js';
import { LegitimacyEngine } from './packages/staking-core/src/legitimacy/index.js';

const survivability = new SurvivabilityEngine(stakeManager);
const legitimacy = new LegitimacyEngine(stakeManager);

async function main() {
    console.log('--- INITIALIZING NETWORK STATE ---');
    stakeManager.deposit('fed-01', 50000); // 50%
    stakeManager.deposit('fed-02', 20000); // 20%
    stakeManager.deposit('fed-03', 15000); // 15%
    stakeManager.deposit('fed-04', 15000); // 15%

    console.log(`Total Staked: ${stakeManager.getTotalStaked()} ZTAN`);
    console.log(`Concentration: ${(stakeManager.getConcentrationRisk() * 100).toFixed(2)}%`);
    console.log(`Nakamoto: ${legitimacy.calculateNakamotoCoefficient()}`);

    console.log('\n--- ATTACK 1: 51% CAPTURE ---');
    stakeManager.deposit('fed-01', 2000); // Now > 51%
    console.log(`Concentration: ${(stakeManager.getConcentrationRisk() * 100).toFixed(2)}%`);
    console.log(`Capture Detected: ${stakeManager.detectGovernanceCapture()}`);
    console.log(`Confidence Score: ${legitimacy.getContinuityConfidence().toFixed(2)}`);

    console.log('\n--- ATTACK 2: SLASHING CASCADE (SHOCK MODEL) ---');
    const shock = survivability.modelGovernanceShock(50); // 50% loss
    console.log(`Weight Lost: ${shock.weightLost}`);
    console.log(`Stability Index: ${(shock.remainingStability * 100).toFixed(2)}%`);
    console.log(`Resilience Rating: ${shock.remainingStability > 0.5 ? 'HIGH' : 'LOW'}`);

    console.log('\n--- ATTACK 3: COORDINATED WITHDRAWAL ---');
    stakeManager.withdraw('fed-02');
    stakeManager.withdraw('fed-03');
    const updatedNakamoto = legitimacy.calculateNakamotoCoefficient();
    console.log(`Updated Nakamoto: ${updatedNakamoto}`);
    console.log(`Updated Stability Score: ${survivability.calculateStabilityScore().toFixed(2)}`);
}

main().catch(console.error);
