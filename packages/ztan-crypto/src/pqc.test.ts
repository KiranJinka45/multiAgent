import { describe, it, expect } from 'vitest';
import { pqc } from './index.js';
import { CryptoRegistry, SignatureAlgorithm } from '../../utils/src/transparency/crypto-registry.js';

describe('Post-Quantum Cryptography (PQC) Operations', () => {
  describe('ML-DSA-65 (Dilithium3)', () => {
    it('should generate valid keypair, sign, and verify successfully', () => {
      const { publicKey, privateKey } = pqc.mldsa.generateKeyPair();
      expect(publicKey).toBeInstanceOf(Uint8Array);
      expect(privateKey).toBeInstanceOf(Uint8Array);

      const message = Buffer.from('ZTAN-PQC-SECURE-GOVERNMENT-CLAIM-v1.0', 'utf8');
      const signature = pqc.mldsa.sign(privateKey, message);
      expect(signature).toBeInstanceOf(Uint8Array);

      const isValid = pqc.mldsa.verify(publicKey, message, signature);
      expect(isValid).toBe(true);

      // Verify tampered message fails
      const tamperedMessage = Buffer.from('ZTAN-PQC-SECURE-GOVERNMENT-CLAIM-v1.1', 'utf8');
      const isTamperedValid = pqc.mldsa.verify(publicKey, tamperedMessage, signature);
      expect(isTamperedValid).toBe(false);
    });
  });

  describe('ML-KEM-768 (Kyber)', () => {
    it('should generate valid keypair, encapsulate, and decapsulate successfully', () => {
      const { publicKey, privateKey } = pqc.mlkem.generateKeyPair();
      expect(publicKey).toBeInstanceOf(Uint8Array);
      expect(privateKey).toBeInstanceOf(Uint8Array);

      const { cipherText, sharedSecret } = pqc.mlkem.encapsulate(publicKey);
      expect(cipherText).toBeInstanceOf(Uint8Array);
      expect(sharedSecret).toBeInstanceOf(Uint8Array);

      const recoveredSecret = pqc.mlkem.decapsulate(cipherText, privateKey);
      expect(recoveredSecret).toBeInstanceOf(Uint8Array);
      expect(Buffer.compare(Buffer.from(sharedSecret), Buffer.from(recoveredSecret))).toBe(0);
    });
  });

  describe('CryptoRegistry DILITHIUM2 Integration', () => {
    it('should verify signatures through CryptoRegistry mapping', () => {
      const { publicKey, privateKey } = pqc.mldsa.generateKeyPair();
      const message = Buffer.from('RegistryVerificationData', 'utf8');
      const signature = pqc.mldsa.sign(privateKey, message);

      const pubKeyBase64 = Buffer.from(publicKey).toString('base64');
      const sigBase64 = Buffer.from(signature).toString('base64');

      const verified = CryptoRegistry.verify({
        algorithm: SignatureAlgorithm.DILITHIUM2,
        publicKey: pubKeyBase64,
        signature: sigBase64,
        data: message
      });

      expect(verified).toBe(true);
    });
  });
});
