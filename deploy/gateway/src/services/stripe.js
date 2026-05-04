"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = void 0;
const stripe_1 = __importDefault(require("stripe"));
const db_1 = require("@packages/db");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});
class StripeService {
    static async createCheckoutSession(userId, tenantId, productId) {
        const product = await db_1.db.product.findUnique({
            where: { id: productId },
        });
        if (!product)
            throw new Error('Product not found');
        const user = await db_1.db.user.findUnique({
            where: { id: userId },
        });
        if (!user)
            throw new Error('User not found');
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: product.name,
                            description: product.description || undefined
                        },
                        unit_amount: product.price,
                        recurring: { interval: 'month' },
                    },
                    quantity: 1,
                },
            ],
            success_url: `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.APP_URL}/cancel`,
            customer_email: user.email,
            client_reference_id: userId,
            metadata: {
                tenantId,
                productId,
            },
        });
        return session.url;
    }
    static async constructEvent(payload, signature) {
        return stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
    }
    static async handleWebhook(payload, signature) {
        let event;
        try {
            event = await this.constructEvent(payload, signature);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new Error(`Webhook Error: ${message}`);
        }
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            // const userId = session.client_reference_id!;
            const metadata = session.metadata;
            await db_1.db.subscription.create({
                data: {
                    tenantId: metadata.tenantId,
                    productId: metadata.productId,
                    stripeId: session.subscription,
                    status: 'active',
                },
            });
        }
        return { received: true };
    }
}
exports.StripeService = StripeService;
//# sourceMappingURL=stripe.js.map