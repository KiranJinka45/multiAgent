import { LOCAL_FEDERATION } from '../packages/utils/src/transparency/witness-federation';
import { GovernanceReceipt, InstitutionalState } from '../packages/utils/src/transparency/governance';

/**
 * ─── Illegal Transition Simulation ─────────────────────────────────────────
 * Demonstrates the runtime impossibility of unconstitutional state jumps.
 * This simulation attempts to force the institution from QUIESCENT to LOCKED
 * without the required intermediate transitions.
 * ────────────────────────────────────────────────────────────────────────────
 */

async function simulateIllegalTransition() {
    console.log("[SIMULATION] Initializing Institutional State: QUIESCENT");
    
    // Attempting a direct COUNCIL_UPDATE (Illegal from QUIESCENT)
    const illegalReceipt: any = {
        action: 'COUNCIL_UPDATE', 
        epochId: 0,
        sequenceNumber: 1,
        previousGRoot: LOCAL_FEDERATION.getSovereignSnapshot().governanceRoot,
        effectiveTimestamp: new Date().toISOString(),
        signatures: []
    };

    console.log("[SIMULATION] Attempting Illegal Transition: QUIESCENT -> COUNCIL_UPDATE (Bypassing PROPOSING)");
    
    try {
        // We will manually trigger a check that would normally happen in applyAction
        // but specifically targeting the safety violation.
        const error = await LOCAL_FEDERATION.applyAction(illegalReceipt as GovernanceReceipt);
        
        if (error && error.includes('FORMAL_SAFETY_VIOLATION')) {
            console.log(`[SIMULATION] ✅ SUCCESS: Runtime blocked the illegal transition.`);
            console.log(`[SIMULATION] Error: ${error}`);
        } else {
            console.error(`[SIMULATION] ❌ FAILURE: Runtime allowed an illegal state jump or returned an unexpected error: ${error}`);
        }
    } catch (e: any) {
        if (e.message.includes('FORMAL_SAFETY_VIOLATION')) {
            console.log(`[SIMULATION] ✅ SUCCESS: Runtime threw a formal safety violation.`);
            console.log(`[SIMULATION] Message: ${e.message}`);
        } else {
            console.error(`[SIMULATION] ❌ FAILURE: Unexpected error during simulation: ${e.message}`);
        }
    }
}

simulateIllegalTransition().catch(console.error);
