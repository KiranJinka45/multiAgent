import { StakeManager } from './packages/staking-core/src/index.js';

async function main() {
    const manager = new StakeManager();
    const fedId = 'test-fed';
    
    console.log('Testing deposit...');
    const stake = manager.deposit(fedId, 20000);
    console.log('Stake:', JSON.stringify(stake, null, 2));
    
    console.log('\nTesting unbonding...');
    manager.initiateWithdrawal(fedId);
    const updatedStake = manager.getStake(fedId);
    console.log('Updated Stake:', JSON.stringify(updatedStake, null, 2));
    
    console.log('\nTesting claim (should fail)...');
    try {
        manager.claim(fedId);
    } catch (err: any) {
        console.log('Expected error:', err.message);
    }
}

main().catch(console.error);
