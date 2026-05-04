"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const axios_1 = __importDefault(require("axios"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4003;
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
    apiVersion: '2024-06-20'
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.post('/checkout', async (req, res) => {
    const { userId, plan } = req.body;
    console.log(`Processing checkout for User: ${userId}, Plan: ${plan}`);
    try {
        const session = {
            id: 'sess_' + Math.random().toString(36).substr(2, 9),
            url: `https://checkout.stripe.com/pay/${userId}`
        };
        res.json({ sessionId: session.id, url: session.url });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/webhook', express_1.default.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test');
    }
    catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.metadata.userId;
        console.log(`[Stripe] Payment success for user ${userId}. Upgrading to PRO!`);
        try {
            const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4002';
            await axios_1.default.post(`${AUTH_SERVICE_URL}/internal/upgrade`, { userId, role: 'PRO' });
        }
        catch (upgradeErr) {
            console.error('[BillingService] Failed to upgrade user in AuthService:', upgradeErr instanceof Error ? upgradeErr.message : upgradeErr);
        }
    }
    res.json({ received: true });
});
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'billing-service' });
});
app.listen(PORT, () => {
    console.log(`[BillingService] Running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map