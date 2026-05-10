import { MerkleTree } from './packages/ztan-witness/src/merkle';
import crypto from 'crypto';

function testMerkle() {
    console.log("Starting Merkle Tree RFC 6962 Compliance Tests...");
    
    const tree = new MerkleTree();
    const leaves = ["apple", "banana", "cherry", "date", "elderberry"].map(s => 
        crypto.createHash('sha256').update(s).digest('hex')
    );

    // 1. Test Root calculation
    leaves.forEach(l => tree.append(l));
    const root = tree.getRoot();
    console.log("Root of 5 leaves:", root);

    // 2. Test Inclusion Proof
    for (let i = 0; i < leaves.length; i++) {
        const proof = tree.getProof(i);
        const isValid = MerkleTree.verifyProof(leaves[i], i, 5, root, proof);
        console.log(`Inclusion proof for leaf ${i}: ${isValid ? "PASS" : "FAIL"}`);
    }

    // 3. Test Consistency Proof
    const tree2 = new MerkleTree();
    leaves.slice(0, 3).forEach(l => tree2.append(l));
    const oldRoot = tree2.getRoot();
    
    const consistencyProof = tree.getConsistencyProof(3);
    const isConsistent = MerkleTree.verifyConsistency(3, 5, oldRoot, root, consistencyProof);
    console.log(`Consistency proof (3 -> 5): ${isConsistent ? "PASS" : "FAIL"}`);

    // 4. Test Monotonicity (Negative Test)
    const badRoot = crypto.createHash('sha256').update('bad').digest('hex');
    const isBadConsistent = MerkleTree.verifyConsistency(3, 5, badRoot, root, consistencyProof);
    console.log(`Consistency proof with bad old root: ${!isBadConsistent ? "PASS (Correctly rejected)" : "FAIL (Accepted bad root)"}`);
}

testMerkle();
