import Stripe from 'stripe';
export declare class StripeService {
    static createCheckoutSession(userId: string, tenantId: string, productId: string): Promise<string | null>;
    static constructEvent(payload: Buffer, signature: string): Promise<Stripe.Event>;
    static handleWebhook(payload: Buffer, signature: string): Promise<{
        received: boolean;
    }>;
}
