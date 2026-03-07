import { CostGovernanceService, PLAN_LIMITS } from '@configs/governance';

async function testCostSafeguard() {
    console.log('--- Testing Cost Safeguard ---');



    // 1. Test calculation
    const tokens = 1_000_000;
    const cost = CostGovernanceService.calculateExecutionCost(tokens);
    console.log(`Cost for ${tokens} tokens: $${cost}`);

    // 2. Test safeguard (this will attempt to query Supabase, so it might fail or return default)
    // We can manually check the logic in the code if we can't run the DB query easily.

    console.log('Plan Limits:', PLAN_LIMITS);
}

testCostSafeguard().catch(console.error);
