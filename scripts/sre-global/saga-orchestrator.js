const Redis = require('ioredis');
const verifier = require('./state-verifier');
const reconciler = require('./reconciler');

/**
 * Saga Orchestrator for Global SRE Actions (Self-Healing Version).
 * Ensures multi-step, cross-system consistency via deterministic execution 
 * and compensation logic (Saga Pattern).
 */
class SagaOrchestrator {
  constructor() {
    this.redis = new Redis();
  }

  /**
   * Execute a high-risk action as a distributed Saga.
   */
  async executeSaga(actionName, steps, context = {}) {
    console.log(`🌀 [SAGA-START] Initiating saga: ${actionName} (ID: ${context.fencingToken})`);
    
    const sagaId = `SAGA:${actionName}:${context.fencingToken}`;
    const state = { 
        name: actionName,
        fencingToken: context.fencingToken,
        currentStep: 0, 
        completedSteps: [],
        status: 'IN_PROGRESS' 
    };

    try {
        for (let i = 0; i < steps.length; i++) {
            state.currentStep = i;
            const step = steps[i];
            console.log(`  ➡ Step ${i+1}/${steps.length}: ${step.name}`);

            // 1. Persist intent before execution (Journaling)
            await this.redis.hset(sagaId, 'state', JSON.stringify(state));

            // 2. Execute Step
            await step.execute(context);

            // 3. VERIFY State (Truth Detection)
            const expected = step.expectedState || {};
            const observed = await this.collectRealState(); // In real life, this calls APIs
            const audit = await verifier.verify(expected, observed);

            if (audit.hasDrift) {
                // 4. RECONCILE (Truth Enforcement)
                await reconciler.reconcile(audit, context);
            }

            state.completedSteps.push(step.name);
        }

        state.status = 'COMPLETED';
        await this.redis.hset(sagaId, 'state', JSON.stringify(state));
        console.log(`✅ [SAGA-COMPLETE] ${actionName} finalized.`);
        return { success: true };

    } catch (err) {
        console.error(`❌ [SAGA-FAILURE] ${actionName} failed at step ${state.currentStep + 1}: ${err.message}`);
        state.status = 'COMPENSATING';
        await this.redis.hset(sagaId, 'state', JSON.stringify(state));

        // 3. Compensate (Rollback in reverse order)
        await this.compensate(actionName, steps, state, context);
        
        state.status = 'FAILED_COMPENSATED';
        await this.redis.hset(sagaId, 'state', JSON.stringify(state));
        return { success: false, error: err.message };
    }
  }

  /**
   * Compensate completed steps in reverse order
   */
  async compensate(actionName, steps, state, context) {
    console.log(`🔙 [SAGA-COMPENSATE] Rolling back ${state.completedSteps.length} completed steps...`);
    
    for (let i = state.completedSteps.length - 1; i >= 0; i--) {
        const step = steps[i];
        console.log(`  ⬅ Compensating: ${step.name}`);
        try {
            await step.compensate(context);
        } catch (compErr) {
            console.error(`  ⚠️ [CRITICAL] Compensation failed for ${step.name}: ${compErr.message}`);
            // In a real system, this would trigger an operator alert or a 'Dead Letter Saga'
        }
    }
  }

  /**
   * Observed State Collector (Simulated for audit)
   */
  async collectRealState() {
    // In production, this calls regional infrastructure APIs (Prisma, AWS, Cloudflare, etc.)
    return {
        db: { primary: process.env.OBSERVED_DB || 'us-east-1' },
        traffic: { weight: parseFloat(process.env.OBSERVED_TRAFFIC || '1.0') },
        dns: { target: process.env.OBSERVED_DNS || 'us-east-1' }
    };
  }
}

module.exports = new SagaOrchestrator();
