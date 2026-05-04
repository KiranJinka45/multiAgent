"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usageTracker = void 0;
const stripe_1 = __importDefault(require("stripe"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
    apiVersion: '2023-10-16',
});
/**
 * Usage Tracker: Reports metered usage to Stripe.
 */
exports.usageTracker = {
    /**
     * Records usage event for an organization.
     */
    async recordUsage(orgId, type, amount) {
        console.log(`[Usage] Recording ${amount} ${type} for ${orgId}`);
        // In a real implementation, we'd look up the Stripe Customer ID for the Org
        const stripeCustomerId = `cus_${orgId}`;
        try {
            await stripe.billing.meterEvents.create({
                event_name: type,
                payload: {
                    value: amount.toString(),
                    stripe_customer_id: stripeCustomerId,
                },
            });
        }
        catch (err) {
            console.error('[Usage] Failed to report usage to Stripe:', err);
            // Fallback: Store locally if Stripe is down
        }
    },
    /**
     * Checks if an organization has exceeded its usage limits.
     */
    async checkLimits(orgId) {
        // Mock limit check
        return true;
    }
};
//# sourceMappingURL=usage.js.map