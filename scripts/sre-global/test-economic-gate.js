// scripts/sre-global/test-economic-gate.js
const authority = require('./authority');

async function testEconomicGate() {
  console.log("🧪 Testing Phase 6 Economic Guardrails...");

  // Action that is too expensive
  const expensiveAction = {
    type: 'REPAIR',
    risk: 'HIGH',
    blastRadius: 0.1,
    projectedCost: 500.0, // Exceeds $50 limit for REPAIR
    stateUncertainty: 0.1
  };

  const res = await authority.requestExecution('us-east-1', expensiveAction);
  
  if (!res.allowed && res.reason.includes('ECONOMIC_BUDGET_EXCEEDED')) {
    console.log(`✅ Success: Action BLOCKED by budget gate as expected. Reason: ${res.reason}`);
  } else {
    console.log("❌ Failure: Economic gate did not block the expensive action!");
    console.log(res);
  }

  // Action within budget
  const cheapAction = {
    type: 'REPAIR',
    risk: 'HIGH',
    blastRadius: 0.1,
    projectedCost: 5.0, // Within $50 limit
    stateUncertainty: 0.1
  };

  const res2 = await authority.requestExecution('us-east-1', cheapAction);
  if (res2.allowed) {
    console.log("✅ Success: Cheap action ALLOWED through budget gate.");
  } else {
    console.log("❌ Failure: Budget gate blocked a cheap action!");
    console.log(res2);
  }
}

testEconomicGate();
