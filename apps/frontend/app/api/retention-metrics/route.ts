import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@queue/supabase-admin';
import logger from '@config/logger';
import { withObservability } from '@config/api-wrapper';

async function handler() {
    try {
        const { data, error } = await supabaseAdmin.rpc('get_retention_metrics');

        if (error) {
            logger.error({ error }, 'Failed to fetch retention metrics via RPC');
            return NextResponse.json({ error: 'Failed to calculate retention metrics' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        logger.error({ error }, 'Unexpected error in retention-metrics API');
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export const GET = withObservability(handler);
