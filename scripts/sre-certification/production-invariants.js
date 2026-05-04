// scripts/sre-certification/production-invariants.js
/**
 * Production Invariants Checker for Level 5 Certification.
 * Machine-checkable rules for absolute safety.
 */
class ProductionInvariants {
  assertNoSplitBrain(history) {
    const leaders = history.filter(op => op.op === 'ELECTION' && op.type === 'OK');
    const terms = new Map();

    for (const l of leaders) {
      if (terms.has(l.value.term) && terms.get(l.value.term) !== l.region) {
        console.error(`❌ [INVARIANT] SPLIT-BRAIN: Two nodes (${terms.get(l.value.term)}, ${l.region}) claim Term ${l.value.term}`);
        return false;
      }
      terms.set(l.value.term, l.region);
    }
    return true;
  }

  assertNoPartialSaga(history) {
    const sagaSteps = history.filter(op => op.op === 'SAGA_STEP');
    const sagaResults = {}; // sagaId -> { steps: Set, failed: boolean }

    for (const step of sagaSteps) {
      const id = step.value.sagaId;
      if (!sagaResults[id]) sagaResults[id] = { steps: new Set(), failed: false };
      
      if (step.type === 'FAIL') sagaResults[id].failed = true;
      sagaResults[id].steps.add(step.value.stepName);
    }

    const inconsistent = Object.values(sagaResults).filter(s => s.failed && s.steps.size > 0);
    if (inconsistent.length > 0) {
        console.error(`❌ [INVARIANT] PARTIAL SAGA: ${inconsistent.length} sagas failed without proper cleanup/compensation.`);
        return false;
    }
    return true;
  }

  assertResourceStability(memoryHistory) {
    if (memoryHistory.length < 50) return true; // Warm-up phase
    const start = memoryHistory[0];

    const end = memoryHistory[memoryHistory.length - 1];
    
    const growth = (end - start) / start;
    if (growth > 0.1) { // 10% growth limit
        console.error(`❌ [INVARIANT] RESOURCE LEAK: Memory grew by ${(growth*100).toFixed(1)}% during soak.`);
        return false;
    }
    return true;
  }
}

module.exports = new ProductionInvariants();
