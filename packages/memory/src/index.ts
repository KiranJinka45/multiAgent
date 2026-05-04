export * from '@packages/memory-core';
export { memoryVector, MemoryVectorService } from '@packages/memory-vector';
export { SemanticCacheService } from '@packages/memory-cache';

// Backward compatibility (optional, but good for now)
import { memoryVector } from '@packages/memory-vector';
export const MemoryService = memoryVector;

