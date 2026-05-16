import { stakeManager } from './packages/staking-core/src/index.js';
import { slashingEngine } from './packages/slashing-engine/src/index.js';

async function main() {
    const fedId = 'rogue-fed';
    const reporterId = 'honest-fed';
    
    console.log('--- Initializing Federation Stake ---');
    stakeManager.deposit(fedId, 50000);
    console.log('Stake Status:', JSON.stringify(stakeManager.getStake(fedId), null, 2));

    console.log('\n--- Simulating Equivocation Proof ---');
    const proof = {
        federationId: fedId,
        epochId: 42,
        breachType: 'EQUIVOCATION' as const,
        evidence: { rootA: '0x123', rootB: '0x456' },
        reporterId: reporterId
    };

    console.log('Executing Slashing...');
    const slashedAmount = slashingEngine.executeSlashing(proof, stakeManager);
    console.log(`Amount Slashed: ${slashedAmount} ZTAN`);

    console.log('\n--- Verifying Post-Slashing State ---');
    const updatedStake = stakeManager.getStake(fedId);
    console.log('Updated Stake:', JSON.stringify(updatedStake, null, 2));

    console.log('\n--- Verifying Bounty Distribution ---');
    const bounties = slashingEngine.getBounties();
    console.log('Active Bounties:', JSON.stringify(bounties, null, 2));
}

main().catch(console.error);
