import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { logger } from '@packages/observability';
import Docker from 'dockerode';
import { 
  ShadowExecutionEngine, 
  SandboxSupervisor, 
  HardenedIsolationEngine
} from '@packages/runtime-core';
import type { HardenedIsolationProfile } from '@packages/runtime-core';

export function createServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json());

  // Log incoming requests
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info(`🚥 [SANDBOX-SERVICE IN] ${req.method} ${req.path}`);
    next();
  });

  // Health check endpoints
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'sandbox-service',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/health/ready', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ready',
      service: 'sandbox-service'
    });
  });

  // 1. Layer 3 Simulation Plane: Speculative Preview / Dry-Run
  app.post('/api/v1/simulate', async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, workflow, initialState = {} } = req.body;

      if (!projectId || !workflow || !Array.isArray(workflow.nodes)) {
        res.status(400).json({
          error: "Invalid input. 'projectId' and 'workflow.nodes' are required.",
          code: 'BAD_REQUEST'
        });
        return;
      }

      logger.info({ projectId, nodeCount: workflow.nodes.length }, 'Speculatively previewing workflow in Simulation Plane');

      const engine = new ShadowExecutionEngine();
      const report = engine.executeSpeculativePreview(workflow, initialState);

      res.status(200).json({
        success: report.success,
        overall_rollback_confidence: report.overallRollbackConfidenceScore,
        quarantine_triggered: report.quarantineTriggered,
        reasons: report.quarantineTriggered ? ['Irreversible unrecoverable actions or low rollback confidence detected in simulation.'] : [],
        step_reports: report.stepReports,
        state_diffs: report.stateDiffs
      });
    } catch (err: any) {
      logger.error({ err: err.message, stack: err.stack }, 'Simulation preview execution failed');
      res.status(500).json({
        error: 'An internal error occurred during speculative simulation.',
        code: 'SIMULATION_PREVIEW_FAILURE'
      });
    }
  });

  // 2. Layer 2 Sandbox Runtime: Supervision & Isolation Verification
  app.post('/api/v1/supervise', async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        containerId, 
        resources, 
        syscalls = [], 
        attemptedOverlayEscapes = false,
        isolationProfile 
      } = req.body;

      let finalResources = {
        cpuPercent: 0,
        memoryMb: 0,
        maxMemoryLimitMb: 512,
        sysCallsCount: syscalls.length,
        ...resources
      };

      let violations: string[] = [];
      let quarantineTriggered = false;

      // Real Docker Integration: If containerId is provided, attempt to inspect it using dockerode
      if (containerId) {
        try {
          logger.info({ containerId }, 'Attempting real Docker container inspection');
          const docker = new Docker();
          const container = docker.getContainer(containerId);
          const inspectData = await container.inspect();
          
          // Map docker memory limit (bytes to MB)
          const memoryLimitMb = (inspectData?.HostConfig?.Memory || 0) / (1024 * 1024);
          finalResources.maxMemoryLimitMb = isNaN(memoryLimitMb) || memoryLimitMb <= 0 ? 512 : memoryLimitMb;

          // Attempt to query container stats for CPU/Memory
          try {
            const stats = await container.stats({ stream: false });
            const usedMemory = stats.memory_stats.usage / (1024 * 1024);
            finalResources.memoryMb = isNaN(usedMemory) ? 0 : Math.round(usedMemory * 100) / 100;
            
            // Simplified CPU percent calculation from stats
            const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
            const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
            if (systemDelta > 0 && cpuDelta > 0) {
              finalResources.cpuPercent = Math.round((cpuDelta / systemDelta) * 100 * 100) / 100;
            }
          } catch (statErr) {
            logger.warn({ containerId }, 'Stats retrieval failed, using fallback/supplied resource metrics');
          }
        } catch (dockErr: any) {
          logger.warn({ containerId, err: dockErr.message }, 'Docker container inspection skipped/failed. Using supplied metrics.');
        }
      }

      // Execute Sandbox Supervision checks
      const supervisor = new SandboxSupervisor(finalResources.maxMemoryLimitMb);
      const supervisionReport = supervisor.superviseSandbox(
        finalResources,
        syscalls,
        attemptedOverlayEscapes
      );

      violations.push(...supervisionReport.violations);
      if (supervisionReport.quarantineTriggered) {
        quarantineTriggered = true;
      }

      // Execute Isolation Profile validation if provided
      let isolationSecurityScore = 1.0;
      if (isolationProfile) {
        const isolationEngine = new HardenedIsolationEngine();
        const profileReport = isolationEngine.evaluateIsolationSecurity(isolationProfile as HardenedIsolationProfile);
        
        violations.push(...profileReport.violations);
        isolationSecurityScore = profileReport.isolationSecurityScore;
        if (profileReport.quarantineTriggered) {
          quarantineTriggered = true;
        }
      }

      const safe = !quarantineTriggered && supervisionReport.resourceCompliant;

      res.status(200).json({
        safe,
        resource_compliant: supervisionReport.resourceCompliant,
        syscalls_blocked: supervisionReport.restrictedSyscallBlocked,
        quarantine_triggered: quarantineTriggered,
        violations: Array.from(new Set(violations)),
        metrics_snapshot: {
          resources: finalResources,
          isolation_score: isolationSecurityScore
        }
      });

    } catch (err: any) {
      logger.error({ err: err.message, stack: err.stack }, 'Sandbox supervision execution failed');
      res.status(500).json({
        error: 'An internal error occurred during sandbox supervision.',
        code: 'SANDBOX_SUPERVISION_FAILURE'
      });
    }
  });

  return app;
}
