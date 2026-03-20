import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import cors from 'cors';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4003;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
    apiVersion: '2024-06-20' as any
});

app.use(cors());
app.use(express.json());

app.post('/checkout', async (req, res) => {
    const { userId, plan } = req.body;
    
    console.log(`Processing checkout for User: ${userId}, Plan: ${plan}`);

    try {
        const session = {
            id: 'sess_' + Math.random().toString(36).substr(2, 9),
            url: `https://checkout.stripe.com/pay/${userId}`
        };

        res.json({ sessionId: session.id, url: session.url });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test');
    } catch (err: any) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as { metadata: { userId: string }, amount_total: number };
        const userId = session.metadata.userId;
        console.log(`[Stripe] Payment success for user ${userId}. Upgrading to PRO!`);
        
        try {
            const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4002';
            await axios.post(`${AUTH_SERVICE_URL}/internal/upgrade`, { userId, role: 'PRO' });
        } catch (upgradeErr: unknown) {
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
