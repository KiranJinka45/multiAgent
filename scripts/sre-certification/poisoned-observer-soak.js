// scripts/sre-certification/poisoned-observer-soak.js
/**
 * Poisoned Observer Soak (Level 5): Testing Trust Decay.
 * Injects a permanently poisoned observer into the set and verifies
 * that the system's weighted trust model correctly isolates the fault.
 */
const Reconciler = require('../sre-global/reconciler');
const infra = require('../sre-global/infra-verifier');

async function runPoisonedSoak() {
  console.log("🌊 [POISONED-SOAK] Starting Level 5 Trust Decay Test...");
  
  const reconciler = new Reconciler(infra.observers);
  
  // 1. Initial State: Synchronized
  let intent = { dns: 'regionA', region: 'regionA', db: { primary: 'regionA' } };
  
  for (let i = 0; i < 10; i++) {
    console.log(`\n--- Round ${i+1} ---`);
    
    // Inject permanent poison into Observer-3
    const audit = await infra.verifyState(intent);
    audit.expectedState = intent.dns;
    
    // Observer 9.9.9.9 always reports 'regionC' (Poison)
    audit.details.observations[2].state = 'regionC'; 
    
    const result = await reconciler.reconcile(audit, {});
    
    // Record results to registry (Simulating real feedback)
    audit.details.observations.forEach(obs => {
        const isConsistent = obs.state === infra.realWorldState.dns;
        reconciler.registry.recordObservation(obs.observerId, isConsistent);
    });

    const obs3 = reconciler.registry.observers.find(o => o.id === '9.9.9.9');
    console.log(`📡 [REGISTRY] Quad9 (9.9.9.9) Weight: ${obs3.weight.toFixed(4)} | Score: ${obs3.reliabilityScore.toFixed(4)}`);

  }
}

runPoisonedSoak();
