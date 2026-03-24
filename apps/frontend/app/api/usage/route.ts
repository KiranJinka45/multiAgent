import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@libs/supabase';
import { cookies } from 'next/headers';
import { usageService, logger } from '@libs/utils/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get user profile to find tenantId
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('tenant_id')
            .eq('id', session.user.id)
            .single();

        const tenantId = profile?.tenant_id || session.user.id; // Fallback to userId if tenantId is missing

        const usage = await usageService.getUsage(tenantId);
        const logs = await usageService.getRecentLogs(tenantId, 10);

        return NextResponse.json({
            usage,
            logs
        });
    } catch (err: unknown) {
        const error = err as Error;
        logger.error({ err: error.message, userId: session.user.id }, 'Failed to fetch usage data');
        return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
    }
}
