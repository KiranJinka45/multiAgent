import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createPortalSession } from '@configs/billing';
import logger from '@configs/logger';

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('stripe_customer_id')
            .eq('id', session.user.id)
            .single();

        if (!profile?.stripe_customer_id) {
            return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
        }

        const portalSession = await createPortalSession(
            profile.stripe_customer_id,
            `${req.nextUrl.origin}/billing`
        );

        return NextResponse.json({ url: portalSession.url });
    } catch (err: unknown) {
        const error = err as { message: string };
        logger.error({ err: error.message, userId: session.user.id }, 'Failed to create stripe portal session');
        return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
    }
}
