import { sha256 } from '@noble/hashes/sha256';

/**
 * ZTAN Canonical Utilities (Binary CER Style)
 */
export class Canonical {
    public static readonly VERSION_TAG = 'ZTAN_CANONICAL_V1';

    public static encodeUint32BE(value: number): Uint8Array {
        const arr = new Uint8Array(4);
        const view = new DataView(arr.buffer as any);
        view.setUint32(0, value, false);
        return arr;
    }

    public static encodeUint64BE(value: number): Uint8Array {
        const arr = new Uint8Array(8);
        const view = new DataView(arr.buffer as any);
        const big = BigInt(value);
        view.setUint32(0, Number(big >> 32n), false);
        view.setUint32(4, Number(big & 0xffffffffn), false);
        return arr;
    }

    public static safeEncode(str: string): Uint8Array {
        const normalized = str.normalize('NFC');
        if (/(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(normalized)) {
            throw new Error(`[ZTAN] REJECT: Invalid UTF-16 in string: ${str}`);
        }
        return new TextEncoder().encode(normalized);
    }

    public static encodeField(bytes: Uint8Array): Uint8Array {
        if (bytes.length > 0xFFFFFFFF) throw new Error('[ZTAN] REJECT: Field length overflow');
        const lenBuf = this.encodeUint32BE(bytes.length);
        const out = new Uint8Array(lenBuf.length + bytes.length);
        out.set(lenBuf);
        out.set(bytes, lenBuf.length);
        return out;
    }

    public static concat(arrays: Uint8Array[]): Uint8Array {
        const totalLength = arrays.reduce((acc, value) => acc + value.length, 0);
        const result = new Uint8Array(totalLength);
        let length = 0;
        for (const array of arrays) {
            result.set(array, length);
            length += array.length;
        }
        return result;
    }

    /**
     * Browser-compatible Hex utilities (Replaces Node.js Buffer)
     */
    public static hexToBytes(hex: string): Uint8Array {
        if (hex.length % 2 !== 0) throw new Error('[ZTAN] Invalid hex string');
        const array = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            array[i / 2] = parseInt(hex.substring(i, i + 2), 16);
        }
        return array;
    }

    public static bytesToHex(bytes: Uint8Array): string {
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Sort public keys lexicographically by their raw bytes.
     */
    public static sortPublicKeys(keys: string[]): string[] {
        return [...keys].sort((a, b) => {
            const bytesA = this.hexToBytes(a);
            const bytesB = this.hexToBytes(b);
            for (let i = 0; i < Math.min(bytesA.length, bytesB.length); i++) {
                if (bytesA[i] !== bytesB[i]) return bytesA[i] - bytesB[i];
            }
            return bytesA.length - bytesB.length;
        });
    }
}
