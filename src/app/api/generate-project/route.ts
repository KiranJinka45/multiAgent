import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { ProjectGenerationSchema } from '@configs/schemas';
import logger from '@configs/logger';
import { freeQueue, proQueue } from '@queue/build-queue';
import { TenantService } from '@services/tenant-service';
import { DistributedExecutionContext as ExecutionContext } from '@services/execution-context';
import { getCorrelationId } from '@configs/tracing';
import { CostGovernanceService, DEFAULT_GOVERNANCE_CONFIG } from '@configs/governance';
import { RateLimiter } from '@configs/rate-limiter';
import { withObservability } from '@configs/api-wrapper';

async function handler(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
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
        const passedExecutionId = body.executionId; // Accept pre-generated ID from client for strict SSE sync
        const userId = session.user.id;

        // Initialize Distributed Execution Context
        const context = new ExecutionContext(passedExecutionId);
        const executionId = context.getExecutionId();
        const correlationId = getCorrelationId();

        // --- 2. Stripe Subscription & Role Verification ---
        let { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('membership, role')
            .eq('id', userId)
            .single();

        if (profileError?.code === 'PGRST116' || !profile) {
            // Profile not found - auto-create a basic free profile for the user using Admin client to bypass RLS
            const { supabaseAdmin } = await import('@queue/supabase-admin');
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

        // TEMPORARY BYPASS: Allow testing the generation engine without a Pro subscription.
        // if (!isDev && !isOwner && profile.membership !== 'pro') {
        //     logger.warn({ userId }, 'User attempted generation without PRO membership');
        //     return NextResponse.json({ error: 'Active PRO subscription required for multi-agent generation' }, { status: 403 });
        // }

        // --- 2b. Private Beta: 50 User Limit ---
        const { count: betaCount } = await supabase
            .from('user_profiles')
            .select('id', { count: 'exact', head: true })
            .eq('is_beta_user', true);

        const currentBetaUsers = betaCount || 0;
        if (!isOwner && currentBetaUsers >= 50) {
            return NextResponse.json({
                error: 'Private Beta is Full',
                details: 'We have reached our 50-user limit for the private beta. Please join the waitlist.'
            }, { status: 403 });
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

        // --- 4. Cost Governance: Daily Execution Limits (Tiered) ---
        const { allowed: executionAllowed } = await CostGovernanceService.checkAndIncrementExecutionLimit(userId);
        if (!executionAllowed) {
            return NextResponse.json({
                error: 'Daily limit reached. Upgrade to continue.',
                details: 'You have used all 3 builds for today. Pro users get 50 builds/day.',
                limitReached: true
            }, { status: 403 });
        }

        // --- 5. Distributed Rate Limiting: Hourly Burst Control ---
        const rateLimit = await RateLimiter.checkBuildLimit(userId, profile.membership === 'pro');
        if (!rateLimit.allowed && !isDev) {
            return NextResponse.json({
                error: 'Too many build requests. Please try again later.',
                retryAfter: rateLimit.retryAfter
            }, {
                status: 429,
                headers: { 'Retry-After': (rateLimit.retryAfter || 60).toString() }
            });
        }

        // --- 6. Cost Governance: Monthly Token Limits ---
        const { allowed: tokensAllowed } = await CostGovernanceService.checkTokenLimit(userId, govConfig);
        if (!tokensAllowed) {
            await CostGovernanceService.refundExecution(userId); // Give them their daily ticket back
            return NextResponse.json({ error: 'Monthly AI token budget exceeded.' }, { status: 429 });
        }

        logger.info({ userId, currentCount: 0, usedTokens: 0, isOwner }, 'Cost governance checks passed.');

        // Update Retention Metrics (First/Last Build Timestamps)
        const { supabaseAdmin } = await import('@queue/supabase-admin');
        await supabaseAdmin.rpc('update_user_retention_timestamps', { user_id_param: userId });

        // --- 7. Multi-Tenant: Fetch Tenant & Routing ---
        const tenant = await TenantService.getTenantForUser(userId);
        const plan = tenant?.plan || 'free';

        await context.init(userId, projectId, prompt, correlationId, plan);

        // 3. Add to BullMQ with tiered queue based on plan
        const jobId = `gen:${projectId}:${executionId}`;
        const queueToUse = plan === 'pro' || plan === 'enterprise' ? proQueue : freeQueue;
        const priority = plan === 'pro' || plan === 'enterprise' || isOwner ? 1 : 10; // Pro = High Priority, Free = Low

        logger.info({ userId, projectId, executionId, jobId, priority, queueType: plan }, 'Queuing project generation job to tiered queue');

        await queueToUse.add(
            'generate-project',
            {
                prompt,
                userId,
                projectId,
                executionId
            },
            {
                jobId,
                priority,
                removeOnComplete: true
            }
        );

        // 4. Update project status
        try {
            const { error: updateError } = await supabase.from('projects').update({
                status: 'generating',
                last_execution_id: executionId
            }).eq('id', projectId);

            if (updateError) {
                logger.warn({ projectId, error: updateError }, 'Initial project update failed, retrying without last_execution_id');
                await supabase.from('projects').update({
                    status: 'generating'
                }).eq('id', projectId);
            }
        } catch (err) {
            logger.error({ projectId, err }, 'Failed to update project status');
        }

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

export const POST = withObservability(handler);
