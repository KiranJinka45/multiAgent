import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { stripe, STRIPE_CONFIG } from '@/lib/stripe';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { plan } = body;
        const price = plan === 'scale' ? STRIPE_CONFIG.plans.scale : STRIPE_CONFIG.plans.pro;

        const checkoutSession = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${req.nextUrl.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.nextUrl.origin}/pricing`,
            client_reference_id: session.user.id,
            customer_email: session.user.email,
        });

        return NextResponse.json({ url: checkoutSession.url });
    } catch (err: unknown) {
        const error = err as { message: string };
        logger.error({ err: error.message, userId: session.user.id }, 'Failed to create stripe checkout session');
        return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }
}
