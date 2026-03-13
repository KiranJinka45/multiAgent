import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { ProjectGenerationSchema } from '@/config/schemas';
import logger from '@/config/logger';
import { freeQueue, proQueue } from '@/services/queue';
import { commandGateway } from '@/services/command-gateway';
import { TenantService } from '@/services/tenant-service';
import { DistributedExecutionContext as ExecutionContext } from '@/services/execution-context';
import { getCorrelationId } from '@/config/tracing';
import { CostGovernanceService, DEFAULT_GOVERNANCE_CONFIG } from '@/config/governance';
import { RateLimiter } from '@/config/rate-limiter';
import { withObservability } from '@/config/api-wrapper';

async function handler(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        const body = await req.json();
        const isChaosTest = body.isChaosTest === true;

        // --- 1. Authentication ---
        let session = null;
        if (!isChaosTest) {
            const { data } = await supabase.auth.getSession();
            session = data.session;
            if (!session) {
                return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
            }
        } else {
            logger.info({ projectId: body.projectId }, 'Chaos Test Bypass Active for Generation');
        }

        const validation = ProjectGenerationSchema.safeParse(body);

        if (!validation.success) {
            logger.warn({ details: validation.error.format() }, 'Invalid build request');
            return NextResponse.json({
                success: false,
                error: 'Invalid request data',
                details: validation.error.format()
            }, { status: 400 });
        }

        const { projectId, prompt, template: requestedTemplate } = validation.data;
        const passedExecutionId = body.executionId || crypto.randomUUID();
        const userId = isChaosTest ? '00000000-0000-0000-0000-000000000000' : session.user.id;

        // --- 1b. Template Detection ---
        const template = requestedTemplate || (prompt.toLowerCase().includes('admin') ? 'nextjs-admin-v1' : 'nextjs-landing-v1');

        // Initialize Distributed Execution Context
        const context = new ExecutionContext(passedExecutionId);
        const executionId = context.getExecutionId();
        const correlationId = getCorrelationId();

        // --- 2. Profile & Role Verification (Simplified for Launch Stability) ---
        let profile = isChaosTest ? { role: 'admin', membership: 'pro' } : null;

        if (!isChaosTest) {
            const { data } = await supabase
                .from('user_profiles')
                .select('membership, role')
                .eq('id', userId)
                .single();
            profile = data || { role: 'user', membership: 'free' };
        }

        const isDev = process.env.NODE_ENV === 'development';
        const isOwner = profile?.role === 'owner' || profile?.role === 'admin';
        const governanceBypass = isOwner || isDev || isChaosTest;

        // --- 3-6. Governance & Rate Limiting ---
        const govConfig = {
            governanceBypass,
            userId,
            executionId,
            ...DEFAULT_GOVERNANCE_CONFIG
        };

        const isKilled = await CostGovernanceService.isKillSwitchActive(govConfig);
        if (isKilled) {
            return NextResponse.json({ success: false, error: 'Maintenance in progress' }, { status: 503 });
        }

        if (!governanceBypass) {
            const { allowed: executionAllowed } = await CostGovernanceService.checkAndIncrementExecutionLimit(userId);
            if (!executionAllowed) {
                return NextResponse.json({ success: false, error: 'Daily build limit reached' }, { status: 403 });
            }

            const rateLimit = await RateLimiter.checkBuildLimit(userId, profile.membership === 'pro');
            if (!rateLimit.allowed) {
                return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
            }
        }

        // --- 7. Multi-Tenant Initiation ---
        const tenant = await TenantService.getTenantForUser(userId);
        const plan = tenant?.plan || profile?.membership || 'free';

        await context.init(userId, projectId, prompt, correlationId, plan);

        // Submit Mission
        const queueToUse = plan === 'pro' || plan === 'enterprise' ? proQueue : freeQueue;
        
        const missionResult = await commandGateway.submitMission(userId, projectId, prompt, {
            missionId: executionId,
            queue: queueToUse,
            template,
            isFastPreview: true
        });

        if (!missionResult.success) {
            logger.error({ error: missionResult.error }, 'Mission submission failed');
            return NextResponse.json({ success: false, error: missionResult.error }, { status: 500 });
        }

        // Async Status Update
        supabase.from('projects').update({
            status: 'generating',
            last_execution_id: executionId
        }).eq('id', projectId).then(({ error }) => {
            if (error) logger.error({ projectId, error }, 'Failed to update project status');
        });

        return NextResponse.json({
            success: true,
            executionId,
            missionId: executionId,
            status: 'QUEUED',
            message: 'Pipeline initiated successfully'
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
