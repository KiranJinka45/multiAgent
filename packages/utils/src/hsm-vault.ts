/**
 * ZTAN HSM-Vault (Constitutional Appliance)
 * 
 * DESIGN RULE: This vault is "cryptographically stupid." 
 * It only knows how to sign, verify, and track epochs.
 * It does NOT interpret policy or generate human narratives.
 *
 * PRODUCTION MODE: Uses AWS KMS ECDSA P-256 signing via KMS_SIGNING_KEY_ARN.
 * LOCAL FALLBACK: Auto-generates a local ECDSA P-256 keypair when KMS is unavailable.
 */
import * as crypto from 'crypto';

export enum HSMErrorCode {
    SUCCESS = 'SUCCESS',
    EPOCH_EXPIRED = 'EPOCH_EXPIRED',
    INVALID_QUORUM = 'INVALID_QUORUM',
    SIGNATURE_FAILED = 'SIGNATURE_FAILED',
    SNAPSHOT_STALE = 'SNAPSHOT_STALE'
}

export interface HSMAttestation {
    signature: string;
    epoch: number;
    timestamp: number;
}

export interface HSMState {
    currentEpoch: number;
    activeSigners: string[];
    snapshotHash: string;
    lastSnapshotTs: number;
}

export class HSMVault {
    private state: HSMState;
    private SNAPSHOT_TTL = 60000; // 60 seconds
    private localKeyPair: { publicKey: crypto.KeyObject; privateKey: crypto.KeyObject } | null = null;
    private kmsKeyArn: string | undefined;
    private kmsClient: any = null;
    private mode: 'KMS' | 'LOCAL';

    constructor(initialSigners: string[]) {
        this.state = {
            currentEpoch: 100,
            activeSigners: initialSigners,
            snapshotHash: 'initial-snapshot-hash',
            lastSnapshotTs: Date.now()
        };

        this.kmsKeyArn = process.env.KMS_SIGNING_KEY_ARN;

        if (this.kmsKeyArn) {
            this.mode = 'KMS';
            this.initKmsClient();
        } else {
            this.mode = 'LOCAL';
            this.generateLocalKeyPair();
        }
    }

    private initKmsClient(): void {
        try {
            // Dynamic import to avoid hard dependency on AWS SDK at build time
            // The AWS SDK must be installed in the deployment environment
            const { KMSClient } = require('@aws-sdk/client-kms');
            this.kmsClient = new KMSClient({
                region: process.env.AWS_REGION || 'us-east-1'
            });
        } catch (err) {
            console.warn('[HSMVault] AWS KMS SDK not available, falling back to local keypair.');
            this.mode = 'LOCAL';
            this.generateLocalKeyPair();
        }
    }

    private generateLocalKeyPair(): void {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
            namedCurve: 'P-256'
        });
        this.localKeyPair = { publicKey, privateKey };
    }

    public async attest(payload: string): Promise<HSMAttestation> {
        const signature = await this.sign(payload);
        return {
            signature,
            epoch: this.state.currentEpoch,
            timestamp: Date.now()
        };
    }

    private async sign(payload: string): Promise<string> {
        if (this.mode === 'KMS' && this.kmsClient && this.kmsKeyArn) {
            return this.signWithKms(payload);
        }
        return this.signLocally(payload);
    }

    private async signWithKms(payload: string): Promise<string> {
        try {
            const { SignCommand } = require('@aws-sdk/client-kms');
            const digest = crypto.createHash('sha256').update(payload).digest();
            const command = new SignCommand({
                KeyId: this.kmsKeyArn,
                Message: digest,
                MessageType: 'DIGEST',
                SigningAlgorithm: 'ECDSA_SHA_256'
            });
            const response = await this.kmsClient.send(command);
            return Buffer.from(response.Signature).toString('base64');
        } catch (err: any) {
            console.error('[HSMVault] KMS signing failed, falling back to local:', err.message);
            // Degrade gracefully to local signing
            if (!this.localKeyPair) this.generateLocalKeyPair();
            return this.signLocally(payload);
        }
    }

    private signLocally(payload: string): string {
        if (!this.localKeyPair) {
            throw new Error('[HSMVault] No local keypair available for signing.');
        }
        const sign = crypto.createSign('SHA256');
        sign.update(payload);
        sign.end();
        return sign.sign(this.localKeyPair.privateKey, 'base64');
    }

    public async verify(sig: string, payload: string, _epochAtSigning: number): Promise<{ valid: boolean; errorCode?: HSMErrorCode }> {
        if (this.mode === 'KMS' && this.kmsClient && this.kmsKeyArn) {
            return this.verifyWithKms(sig, payload);
        }
        return this.verifyLocally(sig, payload);
    }

    private async verifyWithKms(sig: string, payload: string): Promise<{ valid: boolean; errorCode?: HSMErrorCode }> {
        try {
            const { VerifyCommand } = require('@aws-sdk/client-kms');
            const digest = crypto.createHash('sha256').update(payload).digest();
            const command = new VerifyCommand({
                KeyId: this.kmsKeyArn,
                Message: digest,
                MessageType: 'DIGEST',
                Signature: Buffer.from(sig, 'base64'),
                SigningAlgorithm: 'ECDSA_SHA_256'
            });
            const response = await this.kmsClient.send(command);
            if (response.SignatureValid) {
                return { valid: true, errorCode: HSMErrorCode.SUCCESS };
            }
            return { valid: false, errorCode: HSMErrorCode.SIGNATURE_FAILED };
        } catch (err: any) {
            console.error('[HSMVault] KMS verification failed:', err.message);
            return { valid: false, errorCode: HSMErrorCode.SIGNATURE_FAILED };
        }
    }

    private verifyLocally(sig: string, payload: string): { valid: boolean; errorCode?: HSMErrorCode } {
        if (!this.localKeyPair) {
            return { valid: false, errorCode: HSMErrorCode.SIGNATURE_FAILED };
        }
        try {
            const verify = crypto.createVerify('SHA256');
            verify.update(payload);
            verify.end();
            const isValid = verify.verify(this.localKeyPair.publicKey, sig, 'base64');
            return {
                valid: isValid,
                errorCode: isValid ? HSMErrorCode.SUCCESS : HSMErrorCode.SIGNATURE_FAILED
            };
        } catch (err) {
            return { valid: false, errorCode: HSMErrorCode.SIGNATURE_FAILED };
        }
    }

    public async rotateEpoch(newSigners: string[]): Promise<{ epoch: number; status: string }> {
        this.state.currentEpoch += 1;
        this.state.activeSigners = newSigners;
        this.state.lastSnapshotTs = Date.now();
        this.state.snapshotHash = crypto.createHash('sha256')
            .update(`${this.state.currentEpoch}|${newSigners.join(',')}`)
            .digest('hex');

        // Rotate local keypair on epoch change for forward secrecy
        if (this.mode === 'LOCAL') {
            this.generateLocalKeyPair();
        }

        return {
            epoch: this.state.currentEpoch,
            status: 'ACTIVE'
        };
    }

    public getEpochState(): HSMState {
        return { ...this.state };
    }

    public getMode(): 'KMS' | 'LOCAL' {
        return this.mode;
    }

    /**
     * Internal check for freshness - higher layers will use this to trigger SAFE_MODE
     */
    public isSnapshotFresh(): boolean {
        return (Date.now() - this.state.lastSnapshotTs) < this.SNAPSHOT_TTL;
    }
}
