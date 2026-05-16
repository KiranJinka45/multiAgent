import { KeyShare } from './crypto-utils';
import { TelemetryData, SreDecision, TrustAttestation } from './types';
export declare class ExternalVerifier {
    private readonly verifierId;
    private keyShare;
    setKeyShare(share: KeyShare): void;
    verifyDecision(decision: SreDecision, telemetrySnapshot: TelemetryData[]): Promise<TrustAttestation>;
    private calculateHeuristicScore;
}
export declare const externalVerifier: ExternalVerifier;
//# sourceMappingURL=external-verifier.d.ts.map