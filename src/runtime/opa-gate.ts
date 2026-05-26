import axios from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * ─── ZTAN OPA Rego Gateway Client ───────────────────────────────────────────
 * Validates outbox writes against the local OPA sidecar REST engine using
 * compiled Rego policies. Enforces strict fail-closed security properties.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface OpaValidationResult {
    allowed: boolean;
    reason?: string;
    quarantined: boolean;
}

export class ZtanOpaGate {
    private opaEndpoint: string;
    private regoPolicyPath: string;
    private failClosed = true;

    constructor(
        opaEndpoint = 'http://localhost:8181/v1/data/ztan/safety',
        regoPolicyPath?: string
    ) {
        this.opaEndpoint = opaEndpoint;
        this.regoPolicyPath = regoPolicyPath || path.resolve(__dirname, 'policy/ztan_safety.rego');
    }

    /**
     * Verifies the compiled Rego policy file's integrity against expected hashes
     */
    public verifyPolicyIntegrity(approvedPolicyHash: string): boolean {
        if (!fs.existsSync(this.regoPolicyPath)) {
            console.error(`[OPA Gate] Rego policy file missing: ${this.regoPolicyPath}`);
            return false;
        }
        const fileContent = fs.readFileSync(this.regoPolicyPath);
        const computedHash = crypto.createHash('sha256').update(fileContent).digest('hex');
        const matched = computedHash === approvedPolicyHash;
        if (!matched) {
            console.error(`[OPA Gate] Cryptographic drift detected on Rego Policy! Expected: ${approvedPolicyHash}, Computed: ${computedHash}`);
        }
        return matched;
    }

    /**
     * Evaluate transactional write inputs against OPA engine
     */
    public async validateWrite(input: {
        payload: string;
        operator: string;
        signature: string;
    }, workspaceRoot: string): Promise<OpaValidationResult> {
        // First check for active emergency overrides in exceptions_ledger.json
        const exceptionLedgerPath = path.resolve(workspaceRoot, 'db/exceptions_ledger.json');
        let hasActiveOverride = false;
        if (fs.existsSync(exceptionLedgerPath)) {
            try {
                const rawContent = fs.readFileSync(exceptionLedgerPath, 'utf-8');
                const exceptions = JSON.parse(rawContent);
                const now = new Date();
                
                // If any unexpired exception matches OPA-Gate bypass, we allow it
                const activeBypass = exceptions.find((e: any) => 
                    e.targetInvariant === 'OPA-Gate' && 
                    now.getTime() < new Date(e.expiresAt).getTime()
                );
                if (activeBypass) {
                    hasActiveOverride = true;
                    console.warn(`[OPA Gate] Active SRE Exception Override detected: "${activeBypass.bypassId}". Bypassing OPA checks.`);
                }
            } catch (e) {}
        }

        try {
            const response = await axios.post(this.opaEndpoint, { input }, { timeout: 2000 });
            
            if (response.status === 200 && response.data && response.data.result) {
                const isAllowed = response.data.result.allow === true;
                return {
                    allowed: isAllowed,
                    reason: isAllowed ? undefined : '[OPA_POLICY_DENIAL] Transaction violates safety policies defined in Rego rules.',
                    quarantined: !isAllowed
                };
            }

            throw new Error(`OPA sidecar returned invalid response structure: ${JSON.stringify(response.data)}`);
        } catch (err: any) {
            console.error(`[OPA Gate] Fail-Closed Intervention: OPA Sidecar query failed: ${err.message}`);
            
            if (hasActiveOverride) {
                return {
                    allowed: true,
                    reason: '[OPA_BYPASS] OPA sidecar went offline but active SRE exception bypass allowed connection.',
                    quarantined: false
                };
            }

            // Strictly fail-closed: lock node down in quarantine mode if OPA sidecar is unreachable
            return {
                allowed: false,
                reason: `[OPA_FAIL_CLOSED] OPA sidecar unreachable or errored. Fail-closed safety activated. Error: ${err.message}`,
                quarantined: true
            };
        }
    }

    public setFailClosed(enabled: boolean) {
        this.failClosed = enabled;
    }
}
