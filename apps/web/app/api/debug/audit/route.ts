import { NextResponse } from 'next/server';
import { createClient } from '@libs/supabase';
import Redis from 'ioredis';
import {
    plannerQueue, architectureQueue, generatorQueue,
    validatorQueue, dockerQueue, deployQueue,
    supervisorQueue, repairQueue, metaQueue
} from '@lib/agent-queues';

export async function GET() {
    const results: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        redis: 'unknown',
        supabase: 'unknown',
        queues: {} as Record<string, unknown>,
        env: {} as Record<string, string>
    };

    try {
        // standalone Redis
        const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
        results.redis = (await redis.ping()) === 'PONG' ? 'OK' : 'ERROR';
        await redis.quit();

        // standalone Supabase
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const qList: Record<string, unknown> = {
            planner: plannerQueue,
            architecture: architectureQueue,
            generator: generatorQueue,
            validator: validatorQueue,
            docker: dockerQueue,
            deploy: deployQueue,
            supervisor: supervisorQueue,
            repair: repairQueue,
            meta: metaQueue
        };

        for (const [name, q] of Object.entries(qList)) {
            (results.queues as Record<string, unknown>)[name] = await (q as { getJobCounts: () => Promise<unknown> }).getJobCounts();
        }

        const { error } = await supabase.from('projects').select('id').limit(1);
        results.supabase = error ? `ERROR: ${error.message}` : 'OK';

        const sensitiveKeys = ['GROQ_API_KEY', 'REDIS_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
        sensitiveKeys.forEach(k => {
            (results.env as Record<string, string>)[k] = process.env[k] ? 'PRESENT' : 'MISSING';
        });

    } catch (e) {
        results.error = e instanceof Error ? e.message : String(e);
    }

    return NextResponse.json(results);
}
