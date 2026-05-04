import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';
import CircuitBreaker from 'opossum';
import { logger, circuitBreakerState } from '@packages/observability';
import { contextStorage } from '@packages/utils';

interface OutboundClientOptions {
  serviceName: string;
  baseURL: string;
  timeout?: number;
  retries?: number;
  circuitBreaker?: {
    errorThresholdPercentage?: number;
    resetTimeout?: number;
  };
}

/**
 * Standardized Outbound HTTP Client
 * 
 * Features:
 * 1. Exponential Retries (axios-retry)
 * 2. Circuit Breaker (opossum)
 * 3. Standard Timeouts
 * 4. Header Propagation (X-Request-ID via AsyncLocalStorage)
 */
export function createOutboundClient(options: OutboundClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL: options.baseURL,
    timeout: options.timeout || 10000,
  });

  // 1. Exponential Retry Logic with Jitter (Risk 3 Mitigation)
  axiosRetry(client, {
    retries: options.retries ?? 2, // Default to 2 retries (3 total attempts) to prevent amplification
    retryDelay: (retryCount) => {
      const delay = axiosRetry.exponentialDelay(retryCount);
      const jitter = delay * 0.2 * (Math.random() - 0.5); // +/- 10% jitter
      const finalDelay = Math.max(0, delay + jitter);
      
      const source = process.env.SERVICE_NAME || 'unknown';
      const target = options.serviceName;

      // Phase 21: Track Retry Pressure
      const { retryAttemptsTotal } = require('@packages/observability');
      retryAttemptsTotal.inc({ source_service: source, target_service: target });

      logger.warn(
        { service: target, retryCount, delay: finalDelay }, 
        `[Resilience] Retrying request with jitter...`
      );
      return finalDelay;
    },
    retryCondition: (error) => {
      return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
             (error.response?.status ? error.response.status >= 500 : false);
    },
  });

  // 2. Trace Propagation & Retry Tracking Interceptor
  client.interceptors.request.use((config) => {
    const context = contextStorage.getStore();
    if (context?.requestId) {
      config.headers['X-Request-ID'] = context.requestId;
    }
    
    // Add retry tracking header for downstream observability
    const retryCount = (config as any)['axios-retry']?.retryCount || 0;
    if (retryCount > 0) {
      config.headers['X-Retry-Count'] = retryCount.toString();
    }
    
    return config;
  });

  // 3. Circuit Breaker Logic
  const breaker = new CircuitBreaker(async (config: AxiosRequestConfig) => {
    return client.request(config);
  }, {
    timeout: options.timeout || 10000,
    errorThresholdPercentage: options.circuitBreaker?.errorThresholdPercentage || 50,
    resetTimeout: options.circuitBreaker?.resetTimeout || 30000,
  });

  breaker.on('open', () => {
    logger.error(`[Resilience][Circuit] Open for ${options.serviceName}`);
    circuitBreakerState.set({ target_service: options.serviceName }, 1);
  });
  breaker.on('halfOpen', () => {
    logger.warn(`[Resilience][Circuit] Half-Open for ${options.serviceName}`);
    circuitBreakerState.set({ target_service: options.serviceName }, 2);
  });
  breaker.on('close', () => {
    logger.info(`[Resilience][Circuit] Closed for ${options.serviceName}`);
    circuitBreakerState.set({ target_service: options.serviceName }, 0);
  });

  // Initial state registration
  circuitBreakerState.set({ target_service: options.serviceName }, 0);

  // Overriding request method to go through the breaker
  client.request = (async (config: AxiosRequestConfig) => {
    return breaker.fire(config);
  }) as any;

  return client;
}
