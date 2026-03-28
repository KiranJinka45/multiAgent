import { logger } from './logger';

/**
 * Checks if the code is running during the Next.js build phase.
 */
export function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

/**
 * Checks if the code is running in a live runtime environment (not build).
 */
export function isRuntime(): boolean {
  return !isBuildPhase();
}

/**
 * Creates a lazy-loading proxy for an object.
 * The instance is only created when the first property or method is accessed.
 */
export function createLazyProxy<T extends object>(factory: () => T, name?: string): T {
  let instance: T | null = null;

  return new Proxy({} as T, {
    get: (target, prop, receiver) => {
      // Allow access to then/catch/finally for promise-like objects if necessary,
      // but mostly we care about methods and properties.
      if (!instance) {
        if (isBuildPhase()) {
          // If we are in build phase, we return a no-op or throw a clear error 
          // if it's a critical access that shouldn't happen during build.
          // For most cases, returning a dummy or throwing is better than connecting to Redis.
          logger.warn(`[LazyProxy] Accessing ${name || 'unnamed'} during build phase. Potential side effect.`);
          // We still return a proxy that returns empty values to allow build to continue
          return (target as Record<string | symbol, unknown>)[prop];
        }
        
        logger.debug(`[LazyProxy] Initializing ${name || 'unnamed'} on first access`);
        instance = factory();
      }
      
      const value = Reflect.get(instance, prop, receiver);
      return typeof value === 'function' ? value.bind(instance) : value;
    },
    apply: (target, thisArg, args) => {
      if (!instance) {
        if (isBuildPhase()) return undefined;
        instance = factory();
      }
      return Reflect.apply(instance as (...args: unknown[]) => unknown, thisArg, args);
    }
  });
}
