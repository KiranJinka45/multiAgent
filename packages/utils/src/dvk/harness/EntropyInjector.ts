import * as crypto from 'node:crypto';
import type { ReplayExecutionContract, EntropyProfile } from './ReplayExecutionContract.js';

export class EntropyInjector {
  /**
   * Derives deterministic entropy settings for a given contract.
   * If the contract has `entropy_profile` enabled, this generates the specific
   * numerical fuzzing profiles based on the deterministic_seed.
   */
  public static generateEntropyProfile(contract: ReplayExecutionContract): EntropyProfile | undefined {
    if (!contract.entropy_profile) {
      return undefined;
    }

    // If it already has specific settings defined, return it directly
    if (Object.keys(contract.entropy_profile).length > 0 && 
        (contract.entropy_profile.async_chunk_jitter !== undefined || 
         contract.entropy_profile.randomized_boundaries !== undefined ||
         contract.entropy_profile.scheduler_contention !== undefined)) {
      return contract.entropy_profile;
    }

    const hash = crypto.createHash('sha256').update(contract.deterministic_seed + '_entropy').digest('hex');
    
    // We deterministically use the hash to turn on/off chaotic properties
    const async_chunk_jitter = parseInt(hash.substring(0, 4), 16) % 2 === 0;
    const randomized_boundaries = parseInt(hash.substring(4, 8), 16) % 2 === 0;
    const stdout_fragmentation = parseInt(hash.substring(8, 12), 16) % 2 === 0;

    const partial_stdout_truncation = parseInt(hash.substring(12, 16), 16) % 3 === 0;
    const delayed_final_newline = parseInt(hash.substring(16, 20), 16) % 3 === 0;
    const duplicated_chunk_delivery = parseInt(hash.substring(20, 24), 16) % 3 === 0;
    const scheduler_contention = parseInt(hash.substring(24, 28), 16) % 3 === 0;

    return {
      async_chunk_jitter,
      randomized_boundaries,
      stdout_fragmentation,
      partial_stdout_truncation,
      delayed_final_newline,
      duplicated_chunk_delivery,
      scheduler_contention
    };
  }

  /**
   * Deterministically shuffles or manipulates an array of chunks if boundaries are randomized.
   */
  public static scrambleBoundaries(chunks: (string | Buffer)[], contract: ReplayExecutionContract): (string | Buffer)[] {
    const seed = contract.deterministic_seed;
    const hash = crypto.createHash('sha256').update(seed + '_boundary').digest('hex');
    
    // Naively cut some chunks randomly based on the deterministic hash
    const newChunks: (string | Buffer)[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const slicePoint = parseInt(hash.charAt(i % hash.length), 16);
      if (slicePoint > 0 && slicePoint < c.length) {
        if (Buffer.isBuffer(c)) {
          newChunks.push(c.subarray(0, slicePoint));
          newChunks.push(c.subarray(slicePoint));
        } else {
          newChunks.push(c.substring(0, slicePoint));
          newChunks.push(c.substring(slicePoint));
        }
      } else {
        newChunks.push(c);
      }
    }

    // Handle duplicated chunk delivery (simulating IPC stutter/replay logic bugs)
    if (contract.entropy_profile?.duplicated_chunk_delivery) {
      const stutterChunks: (string | Buffer)[] = [];
      for (const c of newChunks) {
        stutterChunks.push(c);
        // Deterministically duplicate occasionally based on seed
        const duplicatePoint = parseInt(crypto.createHash('sha256').update(seed + c.toString()).digest('hex').substring(0, 4), 16);
        if (duplicatePoint % 10 === 0) {
          stutterChunks.push(c); // Inject duplicated delivery
        }
      }
      return stutterChunks;
    }

    return newChunks;
  }
}
