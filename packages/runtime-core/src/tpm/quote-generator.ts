import * as crypto from 'crypto';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';

export class TPMQuoteGenerator {
  private mockPcrState: Record<number, string>;
  private akPrivateKeyPem: string;
  private akPublicKeyPem: string;

  constructor() {
    // Generate an ephemeral Attestation Key pair for simulation
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    this.akPrivateKeyPem = privateKey;
    this.akPublicKeyPem = publicKey;

    // Simulate standard PCR values (e.g., all zeros or baseline hashes)
    this.mockPcrState = {
      // Hardware baseline (UEFI/Secure Boot)
      0: crypto.createHash('sha256').update('fw-baseline').digest('hex'),
      7: crypto.createHash('sha256').update('secure-boot-keys').digest('hex'),
      // Initially, IMA measurement list might be empty or a default state
      10: crypto.createHash('sha256').update('ima-measurement-list').digest('hex')
    };
  }

  /**
   * Binds an execution image digest into the hardware PCR 10.
   */
  public setIMA_PCR10(digest: string) {
    this.mockPcrState[10] = crypto.createHash('sha256').update(digest).digest('hex');
  }

  public getPublicKey(): string {
    return this.akPublicKeyPem;
  }

  /**
   * Generates a TPM Quote over the current PCR state and provided nonce.
   */
  public generateQuote(nonce: string, pcrIndices: number[] = [0, 7, 10]) {
    // 1. Try physical TPM hardware quote generation if available
    let useRealTpm = os.platform() === 'linux' && (fs.existsSync('/dev/tpm0') || fs.existsSync('/dev/tpmrm0'));
    if (useRealTpm) {
      try {
        execSync('which tpm2_quote', { stdio: 'ignore' });
      } catch {
        useRealTpm = false;
      }
    }

    if (useRealTpm) {
      try {
        console.log('[TPMQuoteGenerator] Generating hardware quote via /dev/tpm0...');
        // Generate EK and AK contexts if they don't exist
        if (!fs.existsSync('ek.pub')) {
          execSync('tpm2_createek -c ek.ctx -G rsa -u ek.pub', { stdio: 'pipe' });
        }
        if (!fs.existsSync('ak.pub')) {
          execSync('tpm2_createak -C ek.ctx -c ak.ctx -u ak.pub', { stdio: 'pipe' });
          const pem = execSync('tpm2_readpublic -c ak.ctx -f pem', { encoding: 'utf8' });
          this.akPublicKeyPem = pem.trim();
        }

        const pcrListStr = pcrIndices.join(',');
        execSync(`tpm2_quote -c ak.ctx -l sha256:${pcrListStr} -q ${nonce} -m quote.bin -s signature.bin -o pcr.bin`, { stdio: 'pipe' });
        
        const quoteBuffer = fs.readFileSync('quote.bin');
        const signature = fs.readFileSync('signature.bin');
        
        // Read actual PCR values from physical registers
        const pcrValues: Record<number, string> = {};
        const pcrOutput = execSync(`tpm2_pcrread sha256:${pcrListStr}`, { encoding: 'utf8' });
        const lines = pcrOutput.split('\n');
        for (const line of lines) {
          const match = line.trim().match(/^(\d+)\s*:\s*0x([a-fA-F0-9]+)/);
          if (match) {
            pcrValues[parseInt(match[1], 10)] = match[2].toLowerCase();
          }
        }
        
        // Clean up transient run artifacts
        for (const file of ['quote.bin', 'signature.bin', 'pcr.bin']) {
          if (fs.existsSync(file)) {
            try { fs.unlinkSync(file); } catch {}
          }
        }

        return {
          quoteBuffer: quoteBuffer.toString('base64'),
          signature: signature.toString('base64'),
          pcrValues
        };
      } catch (err: any) {
        console.warn(`[TPMQuoteGenerator] Hardware quote generation failed: ${err.message}. Falling back to binary simulation.`);
      }
    }

    // 2. Binary-compliant simulation fallback
    const pcrValues: Record<number, string> = {};
    for (const index of pcrIndices) {
      if (!this.mockPcrState[index]) {
        throw new Error(`[QuoteGenerator] PCR ${index} not available`);
      }
      pcrValues[index] = this.mockPcrState[index];
    }

    // Compute the digest of the collected PCRs
    const pcrDigest = this.computePcrDigest(pcrValues);

    // Encode standard TPM2B_ATTEST binary structure
    const quoteBuffer = this.encodeTPM2BAttest(nonce, pcrDigest);

    // Cryptographically sign the quote with the AK
    const sign = crypto.createSign('sha256');
    sign.update(quoteBuffer);
    sign.end();
    const signature = sign.sign(this.akPrivateKeyPem);

    return {
      quoteBuffer: quoteBuffer.toString('base64'),
      signature: signature.toString('base64'),
      pcrValues
    };
  }

  /**
   * Intentionally corrupts a PCR to test fail states.
   */
  public injectPcrTampering(pcrIndex: number) {
    console.warn(`[QuoteGenerator] WARNING: Tampering with PCR ${pcrIndex}`);
    this.mockPcrState[pcrIndex] = crypto.createHash('sha256').update('evil-rootkit').digest('hex');
  }

  private encodeTPM2BAttest(nonce: string, pcrDigestHex: string): Buffer {
    const nonceBytes = Buffer.from(nonce, 'utf8');
    const pcrDigestBytes = Buffer.from(pcrDigestHex, 'hex');

    // TPMS_ATTEST size calculations:
    // magic: 4, type: 2, qualifiedSigner: 2, extraData: 2+nonceBytes.length, clockInfo: 17, firmwareVersion: 8, TPMS_QUOTE_INFO: 10 + 2+pcrDigestBytes.length
    const tpmsAttestSize = 4 + 2 + 2 + (2 + nonceBytes.length) + 17 + 8 + (4 + 2 + 1 + 3) + (2 + pcrDigestBytes.length);

    const buffer = Buffer.alloc(2 + tpmsAttestSize);
    let offset = 0;

    // TPM2B_ATTEST size prefix (2 bytes)
    buffer.writeUInt16BE(tpmsAttestSize, offset);
    offset += 2;

    // magic (4 bytes): TPM_GENERATED_VALUE = 0xFF544D00
    buffer.writeUInt32BE(0xFF544D00, offset);
    offset += 4;

    // type (2 bytes): TPM_ST_ATTEST_QUOTE = 0x8018
    buffer.writeUInt16BE(0x8018, offset);
    offset += 2;

    // qualifiedSigner (TPM2B_NAME): size = 0
    buffer.writeUInt16BE(0, offset);
    offset += 2;

    // extraData / nonce (TPM2B_DATA): size + data
    buffer.writeUInt16BE(nonceBytes.length, offset);
    offset += 2;
    nonceBytes.copy(buffer, offset);
    offset += nonceBytes.length;

    // clockInfo (17 bytes)
    buffer.writeBigUInt64BE(0n, offset);
    offset += 8;
    buffer.writeUInt32BE(1, offset);
    offset += 4;
    buffer.writeUInt32BE(1, offset);
    offset += 4;
    buffer.writeUInt8(1, offset);
    offset += 1;

    // firmwareVersion (8 bytes)
    buffer.writeBigUInt64BE(0n, offset);
    offset += 8;

    // TPMS_QUOTE_INFO: pcrSelect (TPML_PCR_SELECTION): count = 1
    buffer.writeUInt32BE(1, offset);
    offset += 4;
    // hash = TPM_ALG_SHA256 (0x000B)
    buffer.writeUInt16BE(0x000B, offset);
    offset += 2;
    // sizeOfSelect = 3
    buffer.writeUInt8(3, offset);
    offset += 1;
    // pcrSelect bitmask: PCR 0, 7, 10
    buffer.writeUInt8(0x81, offset);
    buffer.writeUInt8(0x04, offset + 1);
    buffer.writeUInt8(0x00, offset + 2);
    offset += 3;

    // pcrDigest (TPM2B_DIGEST): size + data
    buffer.writeUInt16BE(pcrDigestBytes.length, offset);
    offset += 2;
    pcrDigestBytes.copy(buffer, offset);
    offset += pcrDigestBytes.length;

    return buffer;
  }

  private computePcrDigest(pcrValues: Record<number, string>): string {
    const hash = crypto.createHash('sha256');
    const sortedIndices = Object.keys(pcrValues).map(Number).sort((a, b) => a - b);
    for (const index of sortedIndices) {
      hash.update(Buffer.from(pcrValues[index], 'hex'));
    }
    return hash.digest('hex');
  }
}
