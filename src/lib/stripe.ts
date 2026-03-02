import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is missing from environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover', // Use latest stable or compatible version
    appInfo: {
        name: 'MultiAgent Platform',
        version: '1.0.0',
    },
});

export const STRIPE_CONFIG = {
    plans: {
        pro: process.env.STRIPE_PRO_PLAN_ID || (process.env.NODE_ENV === 'production' ? '' : 'price_pro_default'),
        scale: process.env.STRIPE_SCALE_PLAN_ID || (process.env.NODE_ENV === 'production' ? '' : 'price_scale_default'),
    },
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
};

export async function createPortalSession(customerId: string, returnUrl: string) {
    return await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
    });
}
