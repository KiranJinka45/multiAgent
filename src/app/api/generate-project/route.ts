import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { ProjectGenerationSchema } from '@/lib/schemas';
import logger from '@/lib/logger';
import { generationQueue } from '@/lib/queue';
import { DistributedExecutionContext as ExecutionContext } from '@/lib/execution-context';
import { getCorrelationId } from '@/lib/tracing';
import { CostGovernanceService } from '@/lib/governance';

export async function POST(req: Request) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        // --- 1. Global Governance: Kill Switch ---
        // If the system is under attack or costs are spiraling, admins can set `system:kill_switch` in Redis.
        const isKilled = await CostGovernanceService.isKillSwitchActive();
        if (isKilled) {
            logger.fatal('Attempted generation while GLOBAL KILL SWITCH is active. Rejecting request.');
            return NextResponse.json({ error: 'Service temporarily unavailable due to maintenance.' }, { status: 503 });
        }

        // --- 2. Authentication ---
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const body = await req.json();
        const validation = ProjectGenerationSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({
                error: 'Invalid request data',
                details: validation.error.format()
            }, { status: 400 });
        }

        const { projectId, prompt } = validation.data;
        const userId = session.user.id;

        // --- 3. Stripe Subscription / Membership Verification ---
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('membership')
            .eq('id', userId)
            .single();

        if (profileError || !profile || profile.membership !== 'pro') {
            logger.warn({ userId }, 'User attempted generation without PRO membership');
            return NextResponse.json({ error: 'Active PRO subscription required for multi-agent generation' }, { status: 403 });
        }

        // --- 4. Cost Governance: Daily Execution Limits ---
        const { allowed: executionAllowed, currentCount } = await CostGovernanceService.checkAndIncrementExecutionLimit(userId);
        if (!executionAllowed) {
            return NextResponse.json({ error: 'Daily generation limit exceeded.' }, { status: 429 });
        }

        // --- 5. Cost Governance: Monthly Token Limits ---
        const { allowed: tokensAllowed, usedTokens } = await CostGovernanceService.checkTokenLimit(userId);
        if (!tokensAllowed) {
            await CostGovernanceService.refundExecution(userId); // Give them their daily ticket back
            return NextResponse.json({ error: 'Monthly AI token budget exceeded.' }, { status: 429 });
        }

        logger.info({ userId, currentCount, usedTokens }, 'Cost governance checks passed.');

        // 2. Initialize Distributed Execution Context
        const context = new ExecutionContext();
        const executionId = context.getExecutionId();
        const correlationId = getCorrelationId();

        await context.init(userId, projectId, prompt, correlationId);

        // 3. Add to BullMQ with idempotency (using projectId as jobId prefix or key)
        // BullMQ natively supports unique job IDs to prevent duplicates
        const jobId = `gen:${projectId}:${executionId}`;

        logger.info({ userId, projectId, executionId, jobId }, 'Queuing project generation job');

        await generationQueue.add(
            'generate-project',
            {
                prompt,
                userId,
                projectId,
                executionId
            },
            {
                jobId, // idempotent: same jobId cannot be added while active
                removeOnComplete: true
            }
        );

        // 4. Update project status
        await supabase.from('projects').update({
            status: 'generating',
            last_execution_id: executionId
        }).eq('id', projectId);

        // 5. Return executionId immediately
        return NextResponse.json({
            success: true,
            executionId,
            message: 'Project generation queued'
        });

    } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Fatal queuing error');
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Internal server error'
        }, { status: 500 });
    }
}
