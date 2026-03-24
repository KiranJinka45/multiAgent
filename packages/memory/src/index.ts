export * from '@libs/memory-core';
export { memoryVector, MemoryVectorService } from '@libs/memory-vector';
export { SemanticCacheService } from '@libs/memory-cache';

// Backward compatibility (optional, but good for now)
import { memoryVector } from '@libs/memory-vector';
export const MemoryService = memoryVector;
