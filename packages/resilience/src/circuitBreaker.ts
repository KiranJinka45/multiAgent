import CircuitBreaker from 'opossum';
import { logger } from '@libs/observability';

const defaultOptions = {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 10000,
};

/**
 * Circuit Breaker Factory
 * Wraps an asynchronous function with a circuit breaker for fault tolerance.
 */
export function createBreaker(fn: (...args: unknown[]) => Promise<unknown>, options = defaultOptions) {
  const breaker = new CircuitBreaker(fn, options);

  // Monitor circuit breaker events
  breaker.on('open', () => {
    logger.warn({ service: fn.name }, '[Resilience] Circuit Breaker Opened');
  });

  breaker.on('close', () => {
    logger.info({ service: fn.name }, '[Resilience] Circuit Breaker Closed');
  });

  breaker.on('halfOpen', () => {
    logger.info({ service: fn.name }, '[Resilience] Circuit Breaker Half-Open');
  });

  breaker.on('fallback', (result) => {
    logger.error({ service: fn.name, result }, '[Resilience] Circuit Breaker Fallback Executed');
  });

  return breaker;
}
