import { Request, Response } from 'express';
import { eventBus } from '@packages/events';
import { logger } from '@packages/observability';

/**
 * Controller for operational event management.
 */
export const replayDlqEvents = async (req: Request, res: Response) => {
    let { streamKey = 'platform:mission:events', limit = 500, batchSize = 50, delayMs = 1000, dryRun = false } = req.body;

    // Hard Guardrails (Human-Proofing)
    batchSize = Math.min(100, Math.max(1, batchSize));
    delayMs = Math.max(100, delayMs);
    limit = Math.min(1000, limit);

    try {
        logger.info({ streamKey, limit, batchSize, delayMs, dryRun }, '[Ops] Triggering Safe DLQ replay');
        const count = await eventBus.replayFromDlq(streamKey, { limit, batchSize, delayMs, dryRun });
        
        res.json({
            status: 'success',
            replayedCount: count,
            dryRun,
            message: dryRun 
                ? `[Dry Run] Found ${count} events in DLQ. Ready for recovery.`
                : (count > 0 ? `Successfully replayed ${count} events from DLQ` : 'No events found in DLQ')
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error({ error: msg, streamKey }, '[Ops] DLQ replay failed');
        res.status(500).json({ status: 'error', message: msg });
    }
};

/**
 * Verifies the cryptographic integrity of a mission's execution logs.
 */
export const verifyMissionIntegrity = async (req: Request, res: Response) => {
    const { executionId } = req.params;
    const { db } = require('@packages/db');
    const crypto = require('crypto');

    try {
        const logs = await db.executionLog.findMany({
            where: { executionId },
            orderBy: { createdAt: 'asc' }
        });

        let expectedPrevHash = '0'.repeat(64);
        let isValid = true;
        let brokenAtId: string | null = null;

        for (const log of logs) {
            const hashData = `${log.executionId}|${log.stage}|${log.status}|${log.message || ''}|${log.eventId}|${expectedPrevHash}`;
            const actualHash = crypto.createHash('sha256').update(hashData).digest('hex');

            if (actualHash !== log.hash) {
                isValid = false;
                brokenAtId = log.id;
                break;
            }
            expectedPrevHash = log.hash;
        }

        res.json({
            status: 'success',
            executionId,
            isValid,
            totalLogs: logs.length,
            brokenAtId,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Verification failed' });
    }
};

/**
 * Returns the current intelligence engine state (Policy weights, learning samples).
 */
export const getIntelligenceState = async (req: Request, res: Response) => {
    try {
        const { IntelligenceLoopService } = require('../services/IntelligenceLoopService');
        const { db } = require('@packages/db');
        
        const state = await IntelligenceLoopService.getIntelligenceState();
        
        // Calculate Aggregate ROI from DB Telemetry
        const stats = await db.mission.aggregate({
            _sum: {
                totalCostUsd: true,
                internalOptimizationCost: true,
                margin: true
            },
            _count: { id: true }
        });
        
        const totalRevenue = stats._sum.totalCostUsd || 0;
        const totalInternalCost = stats._sum.internalOptimizationCost || 0;
        const totalMargin = stats._sum.margin || 0;
        const avgRoi = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

        // GLOBAL VISIBILITY
        const { GlobalStateSyncService } = require('@packages/utils');
        const globalHealth = await GlobalStateSyncService.getGlobalHealth();

        res.json({
            ...state,
            roi: {
                totalRevenue: Number(totalRevenue.toFixed(4)),
                totalInternalCost: Number(totalInternalCost.toFixed(4)),
                totalMargin: Number(totalMargin.toFixed(4)),
                avgRoiPct: Number(avgRoi.toFixed(2)),
                missionCount: stats._count.id
            },
            global: globalHealth,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error({ error }, '[Ops] Failed to fetch intelligence state');
        res.status(500).json({ error: 'Failed to fetch intelligence state' });
    }
};
