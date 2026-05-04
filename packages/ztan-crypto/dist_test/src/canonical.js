"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Canonical = void 0;
/**
 * ZTAN Canonical Utilities (Binary CER Style)
 */
class Canonical {
    static VERSION_TAG = 'ZTAN_CANONICAL_V1';
    static encodeUint32BE(value) {
        const arr = new Uint8Array(4);
        const view = new DataView(arr.buffer);
        view.setUint32(0, value, false);
        return arr;
    }
    static encodeUint64BE(value) {
        const arr = new Uint8Array(8);
        const view = new DataView(arr.buffer);
        const big = BigInt(value);
        view.setUint32(0, Number(big >> 32n), false);
        view.setUint32(4, Number(big & 0xffffffffn), false);
        return arr;
    }
    static safeEncode(str) {
        const normalized = str.normalize('NFC');
        if (/(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(normalized)) {
            throw new Error(`[ZTAN] REJECT: Invalid UTF-16 in string: ${str}`);
        }
        return new TextEncoder().encode(normalized);
    }
    static encodeField(bytes) {
        if (bytes.length > 0xFFFFFFFF)
            throw new Error('[ZTAN] REJECT: Field length overflow');
        const lenBuf = this.encodeUint32BE(bytes.length);
        const out = new Uint8Array(lenBuf.length + bytes.length);
        out.set(lenBuf);
        out.set(bytes, lenBuf.length);
        return out;
    }
    static concat(arrays) {
        const totalLength = arrays.reduce((acc, value) => acc + value.length, 0);
        const result = new Uint8Array(totalLength);
        let length = 0;
        for (const array of arrays) {
            result.set(array, length);
            length += array.length;
        }
        return result;
    }
}
exports.Canonical = Canonical;
