import { KeyShare } from './crypto-utils';
import { TelemetryData, SreDecision, TrustAttestation } from './types';
export declare class SidecarVerifier {
    private readonly verifierId;
    private telemetryBuffer;
    private keyShare;
    setKeyShare(share: KeyShare): void;
    /**
     * Processes a new telemetry update and stores it in the local buffer.
     */
    processTelemetry(data: TelemetryData): void;
    /**
     * Independently validates an SRE decision.
     */
    verifyDecision(decision: SreDecision): Promise<TrustAttestation>;
}
export declare const sidecarVerifier: SidecarVerifier;
//# sourceMappingURL=sidecar-verifier.d.ts.map