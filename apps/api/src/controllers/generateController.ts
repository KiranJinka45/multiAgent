import { Request, Response } from 'express';
import { logger } from '@packages/observability';
import { commandGateway } from '../services/command-gateway';
import { AuthenticatedRequest } from '../middleware/auth';

export const generateApp = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  let { prompt, structuredData, projectId, userId } = req.body;

  // Prioritize authenticated user context for security
  const finalUserId = authReq.user?.id || userId || 'anonymous';
  const finalTenantId = authReq.user?.tenantId || 'default_tenant';
  const finalProjectId = projectId || 'default_project';

  // 🔥 COMMERCIAL ENFORCEMENT LAYER
  const { BillingEnforcer } = await import('@packages/billing');
  const enforcement = await BillingEnforcer.check(finalTenantId);
  
  if (!enforcement.allowed) {
    logger.warn({ finalTenantId, reason: enforcement.reason }, '[API] Mission rejected by enforcement engine');
    return res.status(403).json({ 
      error: 'Mission Submission Rejected', 
      reason: enforcement.reason,
      code: 'ENFORCEMENT_VIOLATION',
      enforcement: {
        resetInMs: enforcement.resetInMs,
        suggestedAction: enforcement.suggestedAction,
        quotaRemaining: enforcement.quotaRemaining
      }
    });
  }

  if (structuredData) {
    prompt = `Build a ${structuredData.vibe} ${structuredData.type}. Key features: ${structuredData.features?.join(', ')}. Goal: ${structuredData.customGoal}`;
  }

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const result = await commandGateway.submitMission(
    finalUserId,
    finalProjectId,
    prompt,
    { 
      template: structuredData?.type,
      tenantId: finalTenantId
    }
  );

  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  res.json({ missionId: result.missionId });
};

export const generateDAG = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { steps, title, projectId, userId } = req.body;

  const finalUserId = authReq.user?.id || userId || 'anonymous';
  const finalTenantId = authReq.user?.tenantId || 'default_tenant';
  const finalProjectId = projectId || 'default_project';

  if (!steps || !Array.isArray(steps) || steps.length === 0) {
    return res.status(400).json({ error: 'Steps array is required for DAG generation' });
  }

  const result = await commandGateway.submitMission(
    finalUserId,
    finalProjectId,
    `DAG Mission: ${title || 'Untitled'}`,
    { 
      steps,
      title: title || 'Agentic DAG Mission',
      tenantId: finalTenantId
    }
  );

  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  res.json({ missionId: result.missionId });
};


