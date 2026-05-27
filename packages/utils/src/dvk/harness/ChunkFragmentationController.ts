import * as crypto from 'node:crypto';
import type { FragmentationProfile } from './ReplayExecutionContract.js';

export class ChunkFragmentationController {
  
  /**
   * Generates a sequence of chunks from a raw payload based on the given fragmentation profile.
   */
  public static fragment(payload: string | Buffer, profile: FragmentationProfile): (string | Buffer)[] {
    const isBuffer = Buffer.isBuffer(payload);
    const data = isBuffer ? payload : Buffer.from(payload as string, 'utf-8');
    
    if (data.length === 0) return [isBuffer ? Buffer.alloc(0) : ''];

    const chunks: Buffer[] = [];
    
    switch (profile.strategy) {
      case 'fixed':
        const fixedSize = profile.params?.size || 1;
        for (let i = 0; i < data.length; i += fixedSize) {
          chunks.push(data.subarray(i, i + fixedSize));
        }
        break;

      case 'alternating':
        const sizes = profile.params?.sizes || [1, 5];
        let altIdx = 0;
        let pos = 0;
        while (pos < data.length) {
          const step = sizes[altIdx % sizes.length];
          chunks.push(data.subarray(pos, pos + step));
          pos += step;
          altIdx++;
        }
        break;

      case 'boundary_targeted':
        // Specifically split UTF-8 continuation bytes to test decoder robustness
        // For simplicity, we randomly split midway through multi-byte characters if present,
        // or default to arbitrary small splits.
        // A proper implementation would find UTF-8 start bytes (0xC0-0xFD) and split after them.
        let btPos = 0;
        while (btPos < data.length) {
          const byte = data[btPos];
          // If we hit a multi-byte sequence starter (e.g., 110xxxxx), split right after it
          if ((byte & 0xE0) === 0xC0 || (byte & 0xF0) === 0xE0 || (byte & 0xF8) === 0xF0) {
            chunks.push(data.subarray(btPos, btPos + 1));
            btPos += 1;
          } else {
            const step = Math.min(3, data.length - btPos);
            chunks.push(data.subarray(btPos, btPos + step));
            btPos += step;
          }
        }
        break;

      case 'escape_targeted':
        // Target '\' characters to split right before and right after them to test escape FSM
        let escPos = 0;
        let lastSplit = 0;
        while (escPos < data.length) {
          if (data[escPos] === 0x5C) { // '\\'
            if (escPos > lastSplit) {
              chunks.push(data.subarray(lastSplit, escPos));
            }
            chunks.push(data.subarray(escPos, escPos + 1));
            lastSplit = escPos + 1;
          }
          escPos++;
        }
        if (lastSplit < data.length) {
          chunks.push(data.subarray(lastSplit));
        }
        break;

      case 'deterministic_random':
        const seedStr = profile.params?.seed || 'default-seed';
        // Simple deterministic PRNG based on hash
        const seedHash = crypto.createHash('sha256').update(seedStr).digest();
        let prngIdx = 0;
        let randPos = 0;
        while (randPos < data.length) {
          // Use byte from hash as pseudo-random chunk size (1 to 16)
          const step = (seedHash[prngIdx % seedHash.length] % 16) + 1;
          chunks.push(data.subarray(randPos, randPos + step));
          randPos += step;
          prngIdx++;
        }
        break;

      default:
        // Fallback to sending the whole payload as one chunk
        chunks.push(data);
    }

    if (isBuffer) {
      return chunks;
    } else {
      return chunks.map(c => c.toString('utf-8'));
    }
  }
}
