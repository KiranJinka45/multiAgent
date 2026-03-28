import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

export const stripe = STRIPE_SECRET_KEY 
    ? new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16', // Compatible with Stripe 14.x
        appInfo: {
            name: 'MultiAgent Platform',
            version: '1.0.0',
        },
    })
    : null;

export const STRIPE_CONFIG = {
    plans: {
        pro: process.env.STRIPE_PRO_PLAN_ID || (process.env.NODE_ENV === 'production' ? '' : 'price_pro_default'),
        scale: process.env.STRIPE_SCALE_PLAN_ID || (process.env.NODE_ENV === 'production' ? '' : 'price_scale_default'),
    },
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
};

export async function createPortalSession(customerId: string, returnUrl: string) {
    if (!stripe) {
        throw new Error('Stripe is not configured. STRIPE_SECRET_KEY is missing.');
    }
    return await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
    });
}
