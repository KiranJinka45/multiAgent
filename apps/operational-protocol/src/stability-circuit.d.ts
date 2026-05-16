export interface ZKProof {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    publicSignals: string[];
}
/**
 * ELITE TIER (TRUE): ZK-Proof Audit Verification (ZKAV)
 * Transitioned from simulation to PRODUCTION Groth16 Verifier logic.
 */
export declare class StabilityCircuit {
    private static poseidon;
    private static getPoseidon;
    private static readonly VERIFICATION_KEY;
    /**
     * ELITE: Real Groth16 Verifier Implementation
     * Uses snarkjs to verify the mathematical soundness of the proof.
     */
    static verifyProof(proof: ZKProof, acc: number, ldet: number, lsla: number): Promise<boolean>;
    /**
     * ELITE: Native Groth16 Verification Loop
     */
    private static executeGroth16Verify;
    /**
     * Generates a ZK Proof (Simulating Prover logic)
     */
    static generateProof(acc: number, ldet: number, lsla: number, threshold: number): Promise<ZKProof>;
}
//# sourceMappingURL=stability-circuit.d.ts.map