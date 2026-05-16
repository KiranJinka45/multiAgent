export declare const DEFAULT_THRESHOLD = 2;
export declare const DEFAULT_NODE_IDS: string[];
export interface KeyShare {
    nodeId: string;
    share: bigint;
    groupPublicKey: string;
    pop: string;
}
export interface PartialSignature {
    nodeId: string;
    signature: string;
    payloadHash: string;
    timestamp: number;
}
/**
 * ZTAN-TSAC Wrapper: Bridges legacy Governance API to hardened @packages/ztan-crypto
 */
export declare class ThresholdCrypto {
    /**
     * ELITE: Distributed Key Generation (DKG)
     */
    static performDKG(nodeIds: string[], threshold: number): Promise<KeyShare[]>;
    /**
     * ELITE: Partial Signing
     */
    static signPartial(payload: string, share: bigint, nodeId: string, threshold: number, allNodeIds: string[]): Promise<PartialSignature>;
    /**
     * ELITE: Aggregation
     */
    static aggregate(partials: PartialSignature[], threshold: number, allNodeIds: string[]): Promise<string | null>;
    /**
     * ELITE: Verify Aggregate
     */
    static verifyAggregate(aggregateHex: string, payload: string, groupPublicKeyHex: string, threshold: number, allNodeIds: string[]): Promise<boolean>;
    private static getEligiblePublicKeys;
}
//# sourceMappingURL=crypto-utils.d.ts.map