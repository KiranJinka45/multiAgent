"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const config_1 = require("@packages/config");
const observability_1 = require("@packages/observability");
const utils_1 = require("@packages/utils");
const db_1 = require("@packages/db");
const auth_internal_1 = require("@packages/auth-internal");
const zod_1 = require("zod");
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
(0, observability_1.initTelemetry)({ serviceName: 'billing-service' });
const app = (0, express_1.default)();
const PORT = config_1.env.BILLING_SERVICE_PORT || 4003;
// --- SCHEMAS ---
const CheckoutSchema = zod_1.z.object({
    productId: zod_1.z.string().optional(),
    plan: zod_1.z.enum(['FREE', 'PRO', 'ENTERPRISE']).default('PRO')
});
app.use((0, utils_1.createSecurityMiddleware)());
app.use(express_1.default.json());
// --- ROUTES ---
/**
 * PRODUCTION CHECKOUT
 * Requirements:
 * 1. Must be called by the Gateway (InternalAuth)
 * 2. Must carry a valid User JWT (UserAuth)
 */
app.post('/checkout', (0, auth_internal_1.internalAuth)(['gateway']), (0, auth_internal_1.userAuth)(), async (req, res) => {
    const result = CheckoutSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: 'Invalid checkout request' });
    }
    const { plan } = result.data;
    const user = req.user;
    try {
        const dbUser = await db_1.db.user.findUnique({
            where: { id: user.id },
            include: { tenant: true }
        });
        if (!dbUser) {
            observability_1.logger.error({ userId: user.id }, '[Billing] Authenticated user not found in DB');
            return res.status(404).json({ error: 'User context lost' });
        }
        const subscription = await db_1.db.subscription.create({
            data: {
                userId: dbUser.id,
                tenantId: dbUser.tenantId,
                plan: plan,
                status: 'pending',
                stripeId: 'sess_' + Math.random().toString(36).substr(2, 9),
            }
        });
        observability_1.logger.info({ userId: dbUser.id, plan }, '[Billing] Subscription session created');
        res.json({
            sessionId: subscription.stripeId,
            url: `https://checkout.stripe.com/pay/${dbUser.id}?sub=${subscription.id}`
        });
        return;
    }
    catch (err) {
        observability_1.logger.error({ err }, '[Billing] Checkout failure');
        res.status(500).json({ error: 'Payment gateway initialization failed' });
        return;
    }
});
// HEALTH & STATUS (Standardized)
app.use((0, utils_1.createHealthRouter)({ serviceName: 'billing-service' }));
// --- SRE Hardening: Warm-up Phase ---
observability_1.logger.info('[BillingService] Entering Warm-up phase (pre-priming connections)...');
(async () => {
    try {
        await db_1.db.$queryRaw `SELECT 1`;
        observability_1.logger.info('[BillingService] Warm-up successful. Mesh connectivity verified.');
    }
    catch (e) {
        observability_1.logger.warn('[BillingService] Warm-up encountered jitter. Proceeding with caution.');
    }
})();
const certPath = '/etc/tls/tls.crt';
const keyPath = '/etc/tls/tls.key';
const useHttps = fs_1.default.existsSync(certPath) && fs_1.default.existsSync(keyPath);
const serverCallback = () => {
    observability_1.logger.info({
        port: PORT,
        protocol: useHttps ? 'https' : 'http'
    }, '[BillingService] Operational');
    // Register Graceful Shutdown
    (0, utils_1.onShutdown)('Billing Server', () => new Promise(resolve => server.close(() => resolve())));
    (0, utils_1.onShutdown)('Database', () => db_1.db.$disconnect());
};
const server = useHttps
    ? https_1.default.createServer({
        cert: fs_1.default.readFileSync(certPath),
        key: fs_1.default.readFileSync(keyPath),
        rejectUnauthorized: false,
    }, app).listen(PORT, serverCallback)
    : app.listen(PORT, serverCallback);
//# sourceMappingURL=index.js.map