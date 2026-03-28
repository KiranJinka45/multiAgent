import { createRouteHandlerClient } from '@packages/supabase';
import { cookies } from 'next/headers';
import { NextResponse, NextRequest } from 'next/server';
import { TaskCreateSchema, RateLimiter } from '@packages/utils/server';

export async function GET() {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate Limiting
    const rateLimiter = new RateLimiter();
    const { allowed } = await rateLimiter.checkLimit(session.user.id, 'task-create');
    if (!allowed) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    try {
        const body = await req.json();
        const validation = TaskCreateSchema.safeParse(body);
        
        if (!validation.success) {
            return NextResponse.json({ 
                error: 'Invalid task data', 
                details: validation.error.format() 
            }, { status: 400 });
        }

        const { title } = validation.data;

        const { data, error } = await supabase
            .from('tasks')
            .insert([{ title, user_id: session.user.id }])
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    } catch (err) {
        logger.error({ err }, 'Failed to create task');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
