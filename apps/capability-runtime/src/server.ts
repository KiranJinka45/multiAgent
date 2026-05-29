import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { logger } from '@packages/observability';
import { supervisor } from './supervisor.js';

export function createServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json());

  // Log incoming requests
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info(`🚥 [CAPABILITY-RUNTIME IN] ${req.method} ${req.path}`);
    next();
  });

  // Health check endpoints
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'capability-runtime',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/health/ready', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ready',
      service: 'capability-runtime'
    });
  });

  // 1. Execute Script
  app.post('/api/v1/runtime/execute', async (req: Request, res: Response): Promise<void> => {
    try {
      const { executionId, script, capabilityToken } = req.body;

      if (!executionId || !script || !capabilityToken) {
        res.status(400).json({
          error: "Invalid input. 'executionId', 'script', and 'capabilityToken' are required.",
          code: 'BAD_REQUEST'
        });
        return;
      }

      logger.info({ executionId }, 'Received execution request in Capability Runtime');

      // Supervisor handles the execution asynchronously and returns output
      const result = await supervisor.execute({
        executionId,
        script,
        capabilityToken
      });

      res.status(200).json(result);
    } catch (err: any) {
      logger.error({ err: err.message, stack: err.stack }, 'Execution execution failed in Capability Runtime');
      res.status(500).json({
        error: `Execution failure: ${err.message}`,
        code: 'EXECUTION_FAILURE'
      });
    }
  });

  // 2. Terminate Sandbox
  app.post('/api/v1/runtime/terminate', async (req: Request, res: Response): Promise<void> => {
    try {
      const { executionId } = req.body;

      if (!executionId) {
        res.status(400).json({
          error: "Invalid input. 'executionId' is required.",
          code: 'BAD_REQUEST'
        });
        return;
      }

      const terminated = await supervisor.terminate(executionId);
      if (terminated) {
        res.status(200).json({ success: true, message: `Successfully terminated execution ${executionId}` });
      } else {
        res.status(404).json({ success: false, error: `Execution ID ${executionId} not found or inactive` });
      }
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to terminate execution');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 3. Retrieve Status & Resource Metrics
  app.get('/api/v1/runtime/status/:executionId', async (req: Request, res: Response): Promise<void> => {
    try {
      const { executionId } = req.params;
      const status = supervisor.getStatus(executionId);

      if (!status) {
        res.status(404).json({ error: `Active execution ${executionId} not found` });
        return;
      }

      res.status(200).json(status);
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to fetch status');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return app;
}
