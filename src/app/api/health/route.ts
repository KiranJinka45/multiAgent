import { NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            database: 'unknown',
            llm: 'unknown',
        }
    };

    try {
        // Check database
        const { error } = await supabase.from('projects').select('count', { count: 'exact', head: true });
        health.services.database = error ? 'error' : 'ok';
    } catch (e) {
        health.services.database = 'error';
    }

    // LLM check could be a simple model list call
    // but for now we'll mark it as OK if env key exists
    health.services.llm = process.env.GROQ_API_KEY ? 'ok' : 'missing_key';

    if (health.services.database !== 'ok') {
        health.status = 'degraded';
        logger.warn(health, 'Health check degraded');
    }

    return NextResponse.json(health, { status: health.status === 'ok' ? 200 : 503 });
}
