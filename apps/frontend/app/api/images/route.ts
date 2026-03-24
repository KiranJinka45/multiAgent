import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@libs/supabase';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('generated_images')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch images error:', error);
            return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
        }

        return NextResponse.json({ images: data });
    } catch (error) {
        console.error('Internal error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
