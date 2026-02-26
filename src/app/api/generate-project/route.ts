import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { ProjectGenerationSchema } from '@/lib/schemas';
import logger from '@/lib/logger';
import { generationQueue } from '@/lib/queue';
import { DistributedExecutionContext as ExecutionContext } from '@/lib/execution-context';
import { getCorrelationId } from '@/lib/tracing';
import { CostGovernanceService, DEFAULT_GOVERNANCE_CONFIG } from '@/lib/governance';

export async function POST(req: Request) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        // Initialize Distributed Execution Context Early for Audit Logging
        const context = new ExecutionContext();
        const executionId = context.getExecutionId();
        const correlationId = getCorrelationId();

        // --- 1. Authentication ---
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

        // --- 2. Stripe Subscription & Role Verification ---
        let { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('membership, role')
            .eq('id', userId)
            .single();

        if (profileError?.code === 'PGRST116' || !profile) {
            // Profile not found - auto-create a basic free profile for the user using Admin client to bypass RLS
            const { supabaseAdmin } = await import('@/lib/supabaseAdmin');
            const { data: newProfile, error: insertError } = await supabaseAdmin
                .from('user_profiles')
                .insert([{ id: userId, role: 'user', membership: 'free' }])
                .select('membership, role')
                .single();

            if (insertError) {
                logger.error({ userId, error: insertError }, 'Failed to auto-create user profile via admin');
                return NextResponse.json({ error: 'Failed to access or create user profile' }, { status: 500 });
            }
            profile = newProfile;
            profileError = null;
        }

        if (profileError || !profile) {
            logger.warn({ userId, error: profileError }, 'User profile lookup failed');
            return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
        }

        const isDev = process.env.NODE_ENV === 'development';
        const isOwner = profile.role === 'owner';
        const governanceBypass = isOwner || isDev;

        if (isDev) {
            logger.info({ userId }, 'Development Mode Bypass Active');
        }

        if (!isDev && !isOwner && profile.membership !== 'pro') {
            logger.warn({ userId }, 'User attempted generation without PRO membership');
            return NextResponse.json({ error: 'Active PRO subscription required for multi-agent generation' }, { status: 403 });
        }

        const govConfig = {
            governanceBypass,
            userId,
            executionId,
            ...DEFAULT_GOVERNANCE_CONFIG
        };

        // --- 3. Global Governance: Kill Switch ---
        const isKilled = await CostGovernanceService.isKillSwitchActive(govConfig);
        if (isKilled) {
            logger.fatal('Attempted generation while GLOBAL KILL SWITCH is active. Rejecting request.');
            return NextResponse.json({ error: 'Service temporarily unavailable due to maintenance.' }, { status: 503 });
        }

        // --- 4. Cost Governance: Daily Execution Limits ---
        const { allowed: executionAllowed, currentCount } = await CostGovernanceService.checkAndIncrementExecutionLimit(userId, govConfig);
        if (!executionAllowed) {
            return NextResponse.json({ error: 'Daily generation limit exceeded.' }, { status: 429 });
        }

        // --- 5. Cost Governance: Monthly Token Limits ---
        const { allowed: tokensAllowed, usedTokens } = await CostGovernanceService.checkTokenLimit(userId, govConfig);
        if (!tokensAllowed) {
            await CostGovernanceService.refundExecution(userId); // Give them their daily ticket back
            return NextResponse.json({ error: 'Monthly AI token budget exceeded.' }, { status: 429 });
        }

        logger.info({ userId, currentCount, usedTokens, isOwner }, 'Cost governance checks passed.');

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
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error({ error: errorMsg }, 'Fatal queuing error');

        if (errorMsg.includes('Connection is closed') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('Redis')) {
            return NextResponse.json({
                error: 'Database connection error. Please ensure Redis is running.',
                details: 'The project generation queue is currently unavailable.'
            }, { status: 503 });
        }

        return NextResponse.json({
            error: errorMsg
        }, { status: 500 });
    }
}
