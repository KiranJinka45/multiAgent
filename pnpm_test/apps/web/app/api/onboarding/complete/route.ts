import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import logger from '@config/logger';
import { withObservability } from '@config/api-wrapper';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handler(_req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { error } = await supabase
            .from('user_profiles')
            .update({ has_completed_onboarding: true })
            .eq('id', session.user.id);

        if (error) {
            logger.error({ error, userId: session.user.id }, 'Failed to update onboarding status');
            return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error({ error }, 'Error in onboarding API');
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export const POST = withObservability(handler);
