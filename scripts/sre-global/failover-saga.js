// scripts/sre-global/failover-saga.js
const sagaOrchestrator = require('./saga-orchestrator');

/**
 * Definition of a Global Failover Saga.
 * Includes execution and compensation logic for every atomic step.
 */
async function runFailoverSaga(fencingToken, sourceRegion, targetRegion) {
  const steps = [
    {
        name: 'DRAIN_TRAFFIC_SOURCE',
        expectedState: { traffic: { weight: 0.0 } },
        execute: async (ctx) => { console.log(`    [EXEC] Draining ${ctx.sourceRegion}...`); },
        compensate: async (ctx) => { console.log(`    [UNDO] Restoring traffic to ${ctx.sourceRegion}...`); }
    },
    {
        name: 'PROMOTE_DATABASE_TARGET',
        expectedState: { db: { primary: targetRegion } },
        execute: async (ctx) => { console.log(`    [EXEC] Promoting DB in ${ctx.targetRegion}...`); },
        compensate: async (ctx) => { console.log(`    [UNDO] Reverting DB promotion in ${ctx.targetRegion}...`); }
    },
    {
        name: 'UPDATE_GLOBAL_DNS',
        expectedState: { dns: { target: targetRegion } },
        execute: async (ctx) => { 
            console.log(`    [EXEC] Updating Global DNS to ${ctx.targetRegion}...`);
            // Simulate failure point for testing
            if (ctx.testFailure === 'DNS') throw new Error('DNS_API_TIMEOUT');
        },
        compensate: async (ctx) => { console.log(`    [UNDO] Reverting DNS to ${ctx.sourceRegion}...`); }
    },
    {
        name: 'SCALE_TARGET_REGION',
        expectedState: {}, // Scaling doesn't have a simple property to verify here
        execute: async (ctx) => { console.log(`    [EXEC] Scaling workers in ${ctx.targetRegion}...`); },
        compensate: async (ctx) => { console.log(`    [UNDO] Descaling workers in ${ctx.targetRegion}...`); }
    }
  ];

  return await sagaOrchestrator.executeSaga('GLOBAL_FAILOVER', steps, { 
    fencingToken, 
    sourceRegion, 
    targetRegion,
    testFailure: process.env.TEST_SAGA_FAILURE 
  });
}

module.exports = { runFailoverSaga };
