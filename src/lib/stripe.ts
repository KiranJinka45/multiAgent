import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is missing from environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20', // Using a stable version
    appInfo: {
        name: 'MultiAgent',
        version: '0.1.0',
    },
});

export const stripeService = {
    async createCheckoutSession(userId: string, email: string) {
        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'inr',
                            product_data: {
                                name: 'MultiAgent Pro Build',
                                description: 'High-speed autonomous project engineering',
                            },
                            unit_amount: 50000, // ₹500.00
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
                customer_email: email,
                client_reference_id: userId,
                metadata: {
                    userId,
                },
            });
            return session;
        } catch (error) {
            console.error('[Stripe Service] Error creating checkout session:', error);
            throw error;
        }
    },

    async verifySession(sessionId: string) {
        try {
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            return session.payment_status === 'paid';
        } catch (error) {
            console.error('[Stripe Service] Error verifying session:', error);
            return false;
        }
    }
};
