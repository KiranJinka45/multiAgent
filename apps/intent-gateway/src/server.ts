import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { logger } from '@packages/observability';
import { getRedisClient } from '@packages/utils';
import { detectPromptInjection } from './prompt-injection-detection.js';
import { evaluateToolRisk } from './tool-risk-model.js';
import { scoreSemanticIntent } from './semantic-scorer.js';
import { classifyRisk } from './risk-classification.js';
import { generateExecutionToken } from './execution-token.js';

export function createServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json());

  // Governance Freeze Middleware
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const redis = await getRedisClient();
      const isFrozen = await redis.get('SYSTEM_FROZEN');
      if (isFrozen === 'true') {
        logger.warn(`[IntentGateway] Rejected ${req.path} because SYSTEM_FROZEN is active.`);
        res.status(503).json({ error: 'Governance Freeze Active. All operations suspended.' });
        return;
      }
    } catch (e) {
      // Allow through if redis fails (fail-open or fail-closed based on policy, but usually we don't want to crash on redis timeout)
    }
    next();
  });

  // Log incoming requests
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info(`🚥 [INTENT-GATEWAY IN] ${req.method} ${req.path}`);
    next();
  });

  // Health check endpoints
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'intent-gateway',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/health/ready', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ready',
      service: 'intent-gateway'
    });
  });

  // Unified Inspection / Intake API
  app.post('/api/v1/inspect', async (req: Request, res: Response): Promise<void> => {
    try {
      const { prompt, tools = [], requested_actions = [] } = req.body;

      if (typeof prompt !== 'string') {
        res.status(400).json({
          error: "Invalid input. 'prompt' is required and must be a string.",
          code: 'BAD_REQUEST'
        });
        return;
      }

      logger.info({ promptLength: prompt.length, toolsCount: tools.length }, 'Processing intake inspection request');

      // 1. Layer 5 Deterministic Checks: Prompt Injection
      const injectionResult = detectPromptInjection(prompt);

      // 2. Layer 5 Deterministic Checks: Tool & Action risk model
      const toolRiskResult = evaluateToolRisk(tools, requested_actions);

      // 3. Layer 7 Probabilistic Checks: Semantic Scorer LLM
      const semanticResult = await scoreSemanticIntent(prompt);

      // 4. Combined Risk Classification Engine
      const classification = classifyRisk({
        deterministicBlocked: injectionResult.blocked,
        blockedReasons: injectionResult.reasons,
        toolMaxRisk: toolRiskResult.maxCategory,
        toolReasons: toolRiskResult.reasons,
        semanticScore: semanticResult.riskScore,
        semanticReasons: semanticResult.reasons
      });

      // 5. Generate secure execution audit token
      const tokenResult = generateExecutionToken({
        riskScore: classification.riskScore,
        policySnapshot: `ZTAN-INTENT-GATEWAY-V1.0.0;DeterministicChecks=Active;ToolMaxRisk=${toolRiskResult.maxCategory};SemanticRisk=${semanticResult.riskLevel}`
      });

      // Embed JWT token inside the policy snapshot to follow downstream execution
      const fullPolicySnapshot = `${tokenResult.payload.policy_snapshot};Token=${tokenResult.token}`;

      logger.info(
        {
          allowed: classification.allowed,
          riskLevel: classification.riskLevel,
          riskScore: classification.riskScore,
          auditId: tokenResult.payload.execution_intent_id
        },
        'Inspection completed'
      );

      res.status(200).json({
        risk_level: classification.riskLevel,
        allowed: classification.allowed,
        reasons: classification.reasons,
        audit_id: tokenResult.payload.execution_intent_id,
        policy_snapshot: fullPolicySnapshot
      });
    } catch (err: any) {
      logger.error({ err: err.message, stack: err.stack }, 'Critical intake inspection failure');
      res.status(500).json({
        error: 'An internal error occurred during intake inspection.',
        code: 'INTENT_INSPECTION_FAILURE'
      });
    }
  });

  return app;
}
