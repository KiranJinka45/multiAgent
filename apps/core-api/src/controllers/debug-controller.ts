import { Router } from 'express';
import type { Request, Response } from 'express';
import { logger } from '@packages/observability';
import { sreEngine } from '../services/sre-engine.js';
import { injectDbOutage, clearDbOutage } from '@packages/db';
import { injectRedisOutage, clearRedisOutage } from '@packages/utils';

export const debugRouter = Router();

/**
 * Simulates a latency spike in the system.
 */
debugRouter.get('/latency', (req: Request, res: Response) => {
  try {
    const delay = parseInt(req.query.delay as string) || 500;
    logger.warn({ delay }, '[DEBUG] Injecting artificial latency spike');
    
    if (!sreEngine) throw new Error('SRE Engine not initialized');
    sreEngine.reportNodeAnomaly('api-service', 0.85); 
    
    res.json({ status: 'INJECTED', type: 'LATENCY', delay });
  } catch (err: any) {
    logger.error({ error: err.message }, '[DEBUG ERROR] Latency injection failed');
    res.status(200).json({ status: 'FAILED_SAFE', error: err.message });
  }
});

/**
 * Simulates telemetry data loss.
 */
debugRouter.get('/drop-telemetry', (_req: Request, res: Response) => {
  try {
    logger.warn('[DEBUG] Simulating telemetry data loss');
    
    if (!sreEngine) throw new Error('SRE Engine not initialized');
    (sreEngine as any).injectChaos('TELEMETRY_LOSS', 'global');
    
    res.json({ status: 'INJECTED', type: 'TELEMETRY_LOSS' });
  } catch (err: any) {
    logger.error({ error: err.message }, '[DEBUG ERROR] Telemetry loss injection failed');
    res.status(200).json({ status: 'FAILED_SAFE', error: err.message });
  }
});

/**
 * Simulates a regional failover scenario.
 */
debugRouter.get('/failover', (req: Request, res: Response) => {
  try {
    const source = req.query.source as string || 'us-east-1';
    logger.warn({ source }, '[DEBUG] Simulating REGIONAL FAILOVER');
    
    if (!sreEngine) throw new Error('SRE Engine not initialized');
    sreEngine.reportNodeAnomaly('global-gateway', 1.0);
    (sreEngine as any).injectChaos('REGIONAL_FAILOVER', source);
    
    res.json({ status: 'TRIGGERED', type: 'FAILOVER', source });
  } catch (err: any) {
    logger.error({ error: err.message }, '[DEBUG ERROR] Failover trigger failed');
    res.status(200).json({ status: 'FAILED_SAFE', error: err.message });
  }
});

/**
 * Tests the integrity of the Operational Watchdog.
 */
debugRouter.get('/watchdog-test', (req: Request, res: Response) => {
  try {
    const mode = req.query.mode as string || 'FALSE_POSITIVE';
    logger.warn({ mode }, '[DEBUG] Running Watchdog Integrity Test');
    
    if (!sreEngine) throw new Error('SRE Engine not initialized');
  
    if (mode === 'FALSE_POSITIVE') {
      sreEngine.reportNodeAnomaly('api-service', 0.1); // Nominal score
    } else {
      (sreEngine as any).injectChaos('STABILITY_DRIFT', 'critical');
    }
    
    res.json({ status: 'TRIGGERED', mode });
  } catch (err: any) {
    logger.error({ error: err.message }, '[DEBUG ERROR] Watchdog test failed');
    res.status(200).json({ status: 'FAILED_SAFE', error: err.message });
  }
});

/**
 * Generic chaos injection endpoint.
 */
debugRouter.get('/chaos', (req: Request, res: Response) => {
  try {
    const { type, nodeId, score } = req.query;
    logger.warn({ type, nodeId, score }, '[DEBUG] Injecting generic chaos');
    
    if (!sreEngine) throw new Error('SRE Engine not initialized');

    if (type === 'NODE_ANOMALY' && nodeId) {
      sreEngine.reportNodeAnomaly(nodeId as string, parseFloat(score as string) || 0.8);
    } else {
      (sreEngine as any).injectChaos(type as string, nodeId as string || 'global');
    }
    
    res.json({ status: 'TRIGGERED', type, nodeId });
  } catch (err: any) {
    logger.error({ error: err.message }, '[DEBUG ERROR] Chaos injection failed');
    res.status(200).json({ status: 'FAILED_SAFE', error: err.message });
  }
});

/**
 * Resets the SRE Control Plane state for a clean certification run.
 */
debugRouter.post('/reset', (_req: Request, res: Response) => {
  try {
    if (!sreEngine) throw new Error('SRE Engine not initialized');
    
    // Multi-Layer Reset for Certification Purity
    sreEngine.reset();
    
    import('../services/operational-control/audit-engine.js').then(({ operationalAudit }) => operationalAudit.reset());
    import('../services/operational-control/policy-optimizer.js').then(({ policyOptimizer }) => policyOptimizer.reset());
    import('@packages/business').then(({ roiPipeline }) => roiPipeline.reset());
    import('../services/telemetry-simulator.js').then(({ telemetrySimulator }) => {
        // Stop any active healing
        (telemetrySimulator as any).isHealing = false;
    });

    logger.info('[DEBUG] Comprehensive system reset performed');
    res.json({ status: 'RESET_COMPLETE' });
  } catch (err: any) {
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

/**
 * Injects simulated database or Redis failures.
 */
debugRouter.get('/inject-failure', (req: Request, res: Response) => {
  try {
    const type = req.query.type as string;
    const duration = parseInt(req.query.duration as string) || 3000;
    
    logger.warn({ type, duration }, '[DEBUG] Injecting simulated failure');
    
    if (type === 'db') {
      injectDbOutage(duration, 'db');
      res.json({ status: 'INJECTED', type: 'db', duration });
    } else if (type === 'pool') {
      injectDbOutage(duration, 'pool');
      res.json({ status: 'INJECTED', type: 'pool', duration });
    } else if (type === 'redis') {
      injectRedisOutage(duration);
      res.json({ status: 'INJECTED', type: 'redis', duration });
    } else {
      res.status(400).json({ status: 'ERROR', error: 'Invalid failure type. Must be db, pool, or redis.' });
    }
  } catch (err: any) {
    logger.error({ error: err.message }, '[DEBUG ERROR] Failure injection failed');
    res.status(200).json({ status: 'FAILED_SAFE', error: err.message });
  }
});

/**
 * Manually clears all simulated failures.
 */
debugRouter.get('/clear-failure', (_req: Request, res: Response) => {
  try {
    logger.info('[DEBUG] Clearing all injected failures');
    clearDbOutage();
    clearRedisOutage();
    res.json({ status: 'CLEARED' });
  } catch (err: any) {
    logger.error({ error: err.message }, '[DEBUG ERROR] Clearing failures failed');
    res.status(200).json({ status: 'FAILED_SAFE', error: err.message });
  }
});

export default debugRouter;
