import { supabaseAdmin } from '../lib/supabaseAdmin';

async function testRetentionLogic() {
    console.log('--- Testing Retention Logic ---');

    // 1. Mock a user with a build yesterday (D1 return potential)
    const testUserId = '00000000-0000-0000-0000-000000000001';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBeforeYesterday = new Date();
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);

    console.log(`Mocking user ${testUserId} with first build on ${dayBeforeYesterday.toISOString()}`);

    // This won't actually work without a real DB connection and user-id
    // But we can check if the RPC is callable and returns a structure
    try {
        const { data, error } = await supabaseAdmin.rpc('get_retention_metrics');
        if (error) {
            console.error('RPC Error (Expected if migration not applied):', error.message);
        } else {
            console.log('Retention Metrics:', data);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testRetentionLogic().catch(console.error);
