import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import logger from '@/lib/logger';
import { stripeWebhookEventsTotal } from '@/lib/metrics';

export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
        logger.error('Missing Stripe signature or webhook secret');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 400 });
    }

    try {
        const event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        stripeWebhookEventsTotal.inc({ event_type: event.type });
        logger.info({ eventType: event.type, eventId: event.id }, 'Received Stripe Webhook');

        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object as any;
                const userId = session.client_reference_id;

                if (userId) {
                    logger.info({ userId, sessionId: session.id }, 'Payment verified for user');
                    // Mark user as pro or update credits in Supabase
                    await supabaseAdmin.from('user_profiles').update({
                        membership: 'pro',
                        last_payment_at: new Date().toISOString()
                    }).eq('id', userId);
                }
                break;

            case 'invoice.payment_failed':
                // Handle failed payment
                break;

            default:
                logger.debug({ eventType: event.type }, 'Unhandled stripe event');
        }

        return NextResponse.json({ received: true });

    } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Webhook construction failed');
        return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
    }
}
