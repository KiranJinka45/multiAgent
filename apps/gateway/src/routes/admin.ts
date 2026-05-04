import { Router, Request, Response } from 'express';
import { ROITracker, PolicyManager } from '@packages/self-evolution';
import { db } from '@packages/db';
import { logger } from '@packages/observability';
import { AuditLogger } from '@packages/utils';

const router: any = Router();

/**
 * GET /api/admin/intelligence/roi
 * Exposes ROI metrics for the platform or a specific tenant.
 */
router.get('/roi', async (req: Request, res: Response) => {
  const tenantId = (req.query.tenantId as string) || 'platform-admin';
  
  try {
    const metrics = await ROITracker.getMetrics(tenantId);
    res.json({
      success: true,
      data: metrics || { optimizations: 0, failureRate: 0, estimatedSavings: 0, efficiencyGain: 0 }
    });
  } catch (err) {
    logger.error({ err, tenantId }, '[Admin] Failed to fetch ROI metrics');
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * GET /api/admin/intelligence/policy
 * Retrieves current self-optimization policy weights.
 */
router.get('/policy', async (req: Request, res: Response) => {
  const tenantId = (req.query.tenantId as string) || 'platform-admin';
  
  try {
    const policy = await PolicyManager.getPolicy(tenantId);
    res.json({ success: true, data: policy });
  } catch (err) {
    logger.error({ err, tenantId }, '[Admin] Failed to fetch policy');
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * PATCH /api/admin/intelligence/policy
 * Updates self-optimization policy weights.
 */
router.patch('/policy', async (req: Request, res: Response) => {
  const tenantId = (req.query.tenantId as string) || 'platform-admin';
  const updates = req.body;
  const authReq = req as any;

  try {
    const updated = await PolicyManager.updatePolicy(tenantId, updates);
    
    // Immutable Audit Log
    await AuditLogger.logAction('UPDATE_INTELLIGENCE_POLICY', 'SUCCESS', {
      tenantId,
      userId: authReq.user?.id,
      updates,
      result: updated
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    logger.error({ err, tenantId }, '[Admin] Failed to update policy');
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/intelligence/timeline
 * Returns historical scaling decisions for visualization.
 */
router.get('/timeline', async (req: Request, res: Response) => {
  try {
    const decisions = await db.scalingDecision.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ success: true, data: decisions });
  } catch (err) {
    logger.error(err, '[Admin] Failed to fetch scaling timeline');
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * GET /api/admin/intelligence/state
 * Returns real-time strategy distribution and system health.
 */
router.get('/state', async (req: Request, res: Response) => {
  try {
    // Note: In a production app, we'd call a dedicated service here.
    // For now, we'll return a stub or proxy to the IntelligenceLoopService logic.
    res.json({
      success: true,
      data: {
        activeStrategies: {
          CONSERVATIVE: 0.8,
          BALANCED: 1.0,
          AGGRESSIVE: 1.5
        },
        systemStatus: 'OPTIMIZED',
        lastScalingEvent: await db.scalingDecision.findFirst({ orderBy: { createdAt: 'desc' } })
      }
    });
  } catch (err) {
    logger.error(err, '[Admin] Failed to fetch intelligence state');
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * GET /api/admin/billing/tenant/:tenantId
 * Returns aggregated billing metrics for a tenant.
 */
router.get('/billing/tenant/:tenantId', async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  
  try {
    const missions = await db.mission.findMany({
      where: { tenantId, status: 'complete' },
      select: {
        totalCostUsd: true,
        computeDurationMs: true,
        queueWaitMs: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const totalCost = missions.reduce((sum: number, m: any) => sum + (m.totalCostUsd || 0), 0);
    const avgCompute = missions.length ? missions.reduce((sum: number, m: any) => sum + (m.computeDurationMs || 0), 0) / missions.length : 0;
    
    res.json({
      success: true,
      data: {
        tenantId,
        totalCost,
        avgComputeTimeMs: avgCompute,
        missionCount: missions.length,
        history: missions
      }
    });
  } catch (err) {
    logger.error({ err, tenantId }, '[Admin] Failed to fetch tenant billing');
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * GET /api/admin/tenants/summary
 * Returns aggregated stats for all tenants (Admin view).
 */
router.get('/tenants/summary', async (req: Request, res: Response) => {
  try {
    const tenants = await db.tenant.findMany({
      include: {
        _count: { select: { missions: true } },
        missions: {
          where: { status: 'complete' },
          select: { totalCostUsd: true, margin: true }
        }
      }
    });

    const summary = tenants.map((t: any) => {
      const totalCost = t.missions.reduce((sum: number, m: any) => sum + (m.totalCostUsd || 0), 0);
      const totalMargin = t.missions.reduce((sum: number, m: any) => sum + (m.margin || 0), 0);
      return {
        id: t.id,
        name: t.name,
        missionCount: t._count.missions,
        totalCost,
        totalMargin,
        avgMarginPct: totalCost > 0 ? (totalMargin / totalCost) * 100 : 0
      };
    }).sort((a: any, b: any) => b.totalCost - a.totalCost);

    res.json({ success: true, data: summary });
  } catch (err) {
    logger.error(err, '[Admin] Failed to fetch tenant summary');
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * GET /api/admin/alerts
 * Returns recent system alerts and SLA breaches.
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const alerts = await db.auditLog.findMany({
      where: {
        OR: [
          { status: 'WARNING' },
          { status: 'CRITICAL' },
          { action: 'SLA_GUARDRAIL_TRIGGER' }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json({ success: true, data: alerts });
  } catch (err) {
    logger.error(err, '[Admin] Failed to fetch alerts');
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * POST /api/admin/provision
 * Bootstraps a new Organization and Tenant.
 */
router.post('/provision', async (req: Request, res: Response) => {
  const { orgName, ownerId } = req.body;
  const authReq = req as any;

  if (!orgName || !ownerId) {
    return res.status(400).json({ success: false, error: 'orgName and ownerId are required' });
  }

  try {
    // @ts-ignore
    const { ProvisioningService } = await import('../services/ProvisioningService');
    const result = await ProvisioningService.provisionTenant(orgName, ownerId);
    
    await AuditLogger.logAction('PROVISION_TENANT', 'SUCCESS', {
      orgName,
      ownerId,
      tenantId: result.tenant.id,
      adminId: authReq.user?.id
    });

    res.json({ success: true, data: result });
  } catch (err: any) {
    logger.error({ err, orgName }, '[Admin] Provisioning failed');
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
