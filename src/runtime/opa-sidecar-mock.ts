import express from 'express';
import { Server } from 'http';

/**
 * ─── Local Mock OPA Sidecar Server ──────────────────────────────────────────
 * Lightweight REST daemon mirroring compiled Rego decisions to support local
 * verification pipelines without containerization dependencies.
 * ────────────────────────────────────────────────────────────────────────────
 */

export class MockOpaSidecar {
    private app: express.Express;
    private server: Server | null = null;
    private port = 8181;
    private mockAllowedOperators = new Set([
        'steward_omega',
        'operator_alpha',
        'operator_beta',
        'backup_steward',
        'mock_operator'
    ]);

    constructor() {
        this.app = express();
        this.app.use(express.json());
        this.setupRoutes();
    }

    private setupRoutes() {
        this.app.post('/v1/data/ztan/safety', (req, res) => {
            const input = req.body?.input;
            if (!input) {
                return res.status(200).json({ result: { allow: false } });
            }

            const { payload, operator, signature } = input;

            // 1. Signature Valid (not empty, starts with "sig:")
            const signatureValid = signature && typeof signature === 'string' && signature.startsWith('sig:');

            // 2. Payload within bounds (not empty, <= 1MB)
            const payloadValid = payload && typeof payload === 'string' && payload.length <= 1048576;

            // 3. Operator Authorized (present, not compromised, listed in whitelist)
            const operatorValid = operator && 
                                  typeof operator === 'string' && 
                                  operator !== 'compromised_operator' && 
                                  this.mockAllowedOperators.has(operator);

            const allowed = !!(signatureValid && payloadValid && operatorValid);

            return res.status(200).json({
                result: {
                    allow: allowed
                }
            });
        });
    }

    public start(): Promise<void> {
        return new Promise((resolve) => {
            this.server = this.app.listen(this.port, () => {
                console.log(`[Mock OPA] Local mock sidecar daemon listening on port ${this.port}`);
                resolve();
            });
        });
    }

    public stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('[Mock OPA] Mock sidecar daemon stopped.');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}
