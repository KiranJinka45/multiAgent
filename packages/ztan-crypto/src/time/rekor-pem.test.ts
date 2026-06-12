import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rekor } from './mock-rekor.js';
import * as crypto from 'crypto';

describe('Rekor PEM Propagation & Fallback', () => {
    let originalFetch: typeof fetch;

    beforeEach(() => {
        originalFetch = global.fetch;
    });

    afterEach(() => {
        global.fetch = originalFetch;
        vi.restoreAllMocks();
    });

    it('successfully publishes entry to Rekor with a valid Ed25519 PEM public key', async () => {
        // 1. Generate Ed25519 keys
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });

        const payloadHash = crypto.createHash('sha256').update('test-payload').digest('hex');
        const signature = crypto.sign(null, Buffer.from(payloadHash), privateKey).toString('base64');

        // Mock fetch to simulate successful Sigstore Rekor response
        const mockUuid = 'db8c5e62bc1ef263c9b7de2837fcfd82b4507742d8f99e4b162629b3ee4a9918';
        global.fetch = vi.fn().mockImplementation(async (url, options) => {
            const body = JSON.parse(options.body);
            expect(body.kind).toBe('hashedrekord');
            expect(body.spec.signature.publicKey.content).toBe(Buffer.from(publicKey).toString('base64'));
            expect(body.spec.signature.content).toBe(Buffer.from(signature).toString('base64'));

            return {
                ok: true,
                json: async () => ({ [mockUuid]: { logIndex: 42 } })
            } as Response;
        });

        const entry = await rekor.publishEntry(payloadHash, signature, publicKey);
        expect(entry.payloadHash).toBe(payloadHash);
        expect(entry.inclusionProof).toBe(mockUuid);
    });

    it('successfully publishes entry to Rekor with a valid P-256/ECDSA PEM public key', async () => {
        // 1. Generate P-256 keys
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
            namedCurve: 'P-256',
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });

        const payloadHash = crypto.createHash('sha256').update('test-payload-p256').digest('hex');
        const signature = crypto.sign('sha256', Buffer.from(payloadHash), privateKey).toString('base64');

        // Mock fetch to simulate successful Sigstore Rekor response
        const mockUuid = 'ec256_rekor_uuid_12345';
        global.fetch = vi.fn().mockImplementation(async (url, options) => {
            const body = JSON.parse(options.body);
            expect(body.kind).toBe('hashedrekord');
            expect(body.spec.signature.publicKey.content).toBe(Buffer.from(publicKey).toString('base64'));
            expect(body.spec.signature.content).toBe(Buffer.from(signature).toString('base64'));

            return {
                ok: true,
                json: async () => ({ [mockUuid]: { logIndex: 43 } })
            } as Response;
        });

        const entry = await rekor.publishEntry(payloadHash, signature, publicKey);
        expect(entry.payloadHash).toBe(payloadHash);
        expect(entry.inclusionProof).toBe(mockUuid);
    });

    it('gracefully falls back to local cryptographic proof when Rekor API rejects the payload', async () => {
        const publicKey = '-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...\n-----END PUBLIC KEY-----';
        const payloadHash = 'hash-abc';
        const signature = 'sig-123';

        // Mock fetch to reject with 400 Bad Request
        global.fetch = vi.fn().mockImplementation(async () => {
            return {
                ok: false,
                text: async () => 'Invalid public key format'
            } as Response;
        });

        const entry = await rekor.publishEntry(payloadHash, signature, publicKey);
        expect(entry.payloadHash).toBe(payloadHash);
        // Should fallback to local hash calculation
        expect(entry.inclusionProof.length).toBe(64); // SHA-256 hex string length
    });

    it('gracefully falls back to local cryptographic proof under network timeout/exception', async () => {
        const publicKey = '-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...\n-----END PUBLIC KEY-----';
        const payloadHash = 'hash-abc-timeout';
        const signature = 'sig-123-timeout';

        // Mock fetch to throw network error
        global.fetch = vi.fn().mockImplementation(async () => {
            throw new Error('Connection timeout');
        });

        const entry = await rekor.publishEntry(payloadHash, signature, publicKey);
        expect(entry.payloadHash).toBe(payloadHash);
        expect(entry.inclusionProof.length).toBe(64);
    });
});
