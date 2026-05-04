import axios from 'axios';
import { Frost, ThresholdBls } from '../packages/ztan-crypto/src';

const API_URL = 'http://localhost:3010/api/v1/ztan';

async function runVerify() {
    console.log('🚀 Starting MPC E2E Verification (RFC-001 v1.5)');

    // 0. RESET
    await axios.post(`${API_URL}/ceremony/reset`);
    console.log('✔ State reset.');

    // 1. INIT
    const messageHash = '7289f43e1d3e4b5a6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b';
    const participants = ['Node-A', 'Node-B', 'Node-C'];
    const threshold = 2;

    const initResp = await axios.post(`${API_URL}/ceremony/init`, {
        threshold,
        participants,
        messageHash
    });
    console.log('✔ Ceremony Initialized. Status:', initResp.data.status);

    // 2. ROUND 1: Commitments
    console.log('--- ROUND 1: VSS Commitments ---');
    const dkgData: any = {};
    for (const nodeId of participants) {
        const dkg = Frost.generateRound1(threshold, participants.length);
        dkgData[nodeId] = dkg;
        const resp = await axios.post(`${API_URL}/ceremony/commitments`, {
            nodeId,
            commitments: dkg.commitments
        });
        console.log(`  ✔ ${nodeId} submitted commitments. Status: ${resp.data.status}`);
    }

    // 3. ROUND 2: Share Exchange
    console.log('--- ROUND 2: Secret Shares ---');
    for (const senderNodeId of participants) {
        const shares: Record<string, string> = {};
        const senderDkg = dkgData[senderNodeId];
        
        participants.forEach((targetNodeId, idx) => {
            // idx + 1 because evaluatePolynomial is 1-indexed for x
            const share = Frost.evaluatePolynomial(senderDkg.coefficients, idx + 1);
            shares[targetNodeId] = share;
        });

        const resp = await axios.post(`${API_URL}/ceremony/shares`, {
            nodeId: senderNodeId,
            shares
        });
        console.log(`  ✔ ${senderNodeId} distributed shares. Status: ${resp.data.status}`);
    }

    // 4. SIGNING
    console.log('--- SIGNING: Partial Signatures ---');
    const finalState = (await axios.get(`${API_URL}/ceremony/active`)).data.active;
    const masterPk = finalState.masterPublicKey;
    console.log('✔ Master Public Key Derived:', masterPk);

    // Nodes A and B will sign
    for (const nodeId of ['Node-A', 'Node-B']) {
        // Fetch shares sent to this node
        const sharesResp = await axios.get(`${API_URL}/ceremony/shares/${nodeId}`);
        const myShares = Object.values(sharesResp.data.shares) as string[];
        
        // Compute local secret share
        const mySecretShare = Frost.aggregateShares(myShares);
        
        // Generate partial signature (v1.5 Context Bound)
        const partialSig = await ThresholdBls.signShare(
            messageHash, 
            mySecretShare, 
            finalState.ceremonyId,
            threshold,
            participants,
            participants.indexOf(nodeId) + 1
        );

        const resp = await axios.post(`${API_URL}/ceremony/sign`, {
            nodeId,
            signature: partialSig,
            ceremonyId: finalState.ceremonyId
        });
        console.log(`  ✔ ${nodeId} signed. Status: ${resp.data.status}`);
    }

    // 5. FINAL VERIFICATION
    const completedState = (await axios.get(`${API_URL}/ceremony/active`)).data.active;
    if (completedState.status === 'COMPLETED') {
        console.log('✅ MPC CEREMONY SUCCESSFUL!');
        console.log('   Aggregated Signature:', completedState.aggregatedSignature);
        
        // Verify locally to be sure
        const isValid = await ThresholdBls.verify(
            completedState.aggregatedSignature,
            messageHash,
            completedState.participants.filter((p: any) => p.status === 'SIGNED').map((p: any) => p.publicKey),
            completedState.ceremonyId,
            threshold,
            participants
        );
        console.log('   Local Verification of Aggregated Signature:', isValid ? 'PASS' : 'FAIL');
    } else {
        console.log('❌ MPC CEREMONY FAILED. Final Status:', completedState.status);
    }
}

runVerify().catch(console.error);
