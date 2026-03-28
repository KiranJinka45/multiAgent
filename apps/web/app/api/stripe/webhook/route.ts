import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_CONFIG } from '@packages/utils/server';
import { supabaseAdmin } from '@packages/utils/server';
import { logger } from '@packages/utils/server';

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') as string;

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            STRIPE_CONFIG.webhookSecret!
        );
    } catch {
        logger.error('Webhook signature verification failed (invalid or missing secret)');
        return NextResponse.json({ error: `Webhook Error: Signature verification failed` }, { status: 400 });
    }

    const session = event.data.object as {
        client_reference_id?: string;
        customer?: string;
        subscription?: string;
        status?: string;
    };

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(session as { client_reference_id?: string; customer?: string; subscription?: string });
                break;
            case 'invoice.paid':
                await handleInvoicePaid(event.data.object as { customer: string; subscription: string });
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(session as { customer: string });
                break;
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object as { customer: string; status: string; items: { data: { price: { id: string } }[] } });
                break;
            default:
                logger.info({ type: event.type }, 'Unhandled webhook event type');
        }
    } catch (err: unknown) {
        const error = err as { message: string };
        logger.error({ err: error.message, type: event.type }, 'Failed to process webhook event');
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}

function mapPriceToPlan(priceId: string): string {
    if (priceId === STRIPE_CONFIG.plans.pro) return 'pro';
    if (priceId === STRIPE_CONFIG.plans.scale) return 'scale';
    return 'free';
}

async function handleInvoicePaid(invoice: { customer: string; subscription: string }) {
    await supabaseAdmin
        .from('user_profiles')
        .update({ subscription_status: 'active' })
        .eq('stripe_customer_id', invoice.customer);

    logger.info({ customerId: invoice.customer }, 'Invoice paid, subscription marked active');
}

async function handleCheckoutCompleted(session: {
    client_reference_id?: string;
    customer?: string;
    subscription?: string;
}) {
    const userId = session.client_reference_id;
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    if (!userId) {
        logger.error({ session }, 'No userId found in checkout session');
        return;
    }

    await supabaseAdmin
        .from('user_profiles')
        .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: 'active',
            membership: 'pro', // Legacy sync
            plan_type: 'pro',   // New standard
            is_beta_user: true
        })
        .eq('id', userId);

    logger.info({ userId, subscriptionId }, 'Provisioned PRO subscription via webhook');
}

async function handleSubscriptionDeleted(subscription: { customer: string }) {
    const customerId = subscription.customer;

    await supabaseAdmin
        .from('user_profiles')
        .update({
            subscription_status: 'canceled',
            membership: 'free',
            plan_type: 'free'
        })
        .eq('stripe_customer_id', customerId);

    logger.info({ customerId }, 'Canceled PRO subscription via webhook');
}

async function handleSubscriptionUpdated(subscription: {
    customer: string;
    status: string;
    items: {
        data: {
            price: {
                id: string;
            };
        }[];
    };
}) {
    const customerId = subscription.customer;
    const status = subscription.status;
    const priceId = subscription.items.data[0].price.id;
    const plan = mapPriceToPlan(priceId);

    await supabaseAdmin
        .from('user_profiles')
        .update({
            subscription_status: status,
            membership: status === 'active' ? plan : 'free',
            plan_type: status === 'active' ? plan : 'free'
        })
        .eq('stripe_customer_id', customerId);

    logger.info({ customerId, status }, 'Updated subscription status via webhook');
}

export const dynamic = 'force-dynamic';
