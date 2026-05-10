import crypto from 'crypto';
import { WitnessFederation } from '../packages/utils/src/transparency/witness-federation';
import { InstitutionalConstitution, DEFAULT_CONSTITUTION } from '../packages/utils/src/transparency/constitutional';

async function runSimulation() {
    console.log("--- Constitutional Ceiling Simulation ---");

    const constitution = new InstitutionalConstitution();
    
    console.log("\nPhase 1: Attempting to reduce challenge window to 1 hour (Ceiling: 6 hours)...");
    const aggressivePolicy = {
        ...DEFAULT_CONSTITUTION,
        recoveryChallengeWindowMs: 1 * 60 * 60 * 1000 // 1 hour
    };

    const error = constitution.validatePolicyUpdate(aggressivePolicy);
    console.log("Result (Expected Error):", error);
    if (!error?.includes("CEILING_VIOLATION")) throw new Error("Expected ceiling violation error");

    console.log("\nPhase 2: Attempting to reduce recovery interval to 12 hours (Ceiling: 24 hours)...");
    const unstablePolicy = {
        ...DEFAULT_CONSTITUTION,
        minRecoveryIntervalMs: 12 * 60 * 60 * 1000 // 12 hours
    };

    const intervalError = constitution.validatePolicyUpdate(unstablePolicy);
    console.log("Result (Expected Error):", intervalError);
    if (!intervalError?.includes("CEILING_VIOLATION")) throw new Error("Expected ceiling violation error");

    console.log("\n✅ CONSTITUTIONAL CEILINGS VALIDATED!");
}

runSimulation().catch(err => {
    console.error("Simulation Failed:", err);
    process.exit(1);
});
