import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import logger from '@configs/logger';
import { withObservability } from '@configs/api-wrapper';

async function handler(req: Request) {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { message, url_path } = await req.json();

        if (!message || typeof message !== 'string') {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('user_feedback')
            .insert([{
                user_id: session.user.id,
                message: message.trim(),
                url_path: url_path || '/'
            }]);

        if (error) {
            logger.error({ error, userId: session.user.id }, 'Failed to insert feedback');
            return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 });
        }

        logger.info({ userId: session.user.id, url_path }, 'User feedback received');
        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error({ error }, 'Error processing feedback API request');
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export const POST = withObservability(handler);
