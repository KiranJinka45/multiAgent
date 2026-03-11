import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import {
    plannerQueue, architectureQueue, generatorQueue,
    validatorQueue, dockerQueue, deployQueue,
    supervisorQueue, repairQueue, metaQueue
} from '../../../../lib/queue/agent-queues';

export async function GET() {
    const results: any = {
        timestamp: new Date().toISOString(),
        redis: 'unknown',
        supabase: 'unknown',
        queues: {},
        env: {}
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

        const qList: any = {
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
            results.queues[name] = await (q as any).getJobCounts();
        }

        const { error } = await supabase.from('projects').select('id').limit(1);
        results.supabase = error ? `ERROR: ${error.message}` : 'OK';

        const sensitiveKeys = ['GROQ_API_KEY', 'REDIS_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
        sensitiveKeys.forEach(k => {
            results.env[k] = process.env[k] ? 'PRESENT' : 'MISSING';
        });

    } catch (e: any) {
        results.error = e.message;
    }

    return NextResponse.json(results);
}
