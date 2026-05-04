import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2023-10-16' as any,
});

/**
 * Usage Tracker: Reports metered usage to Stripe.
 */
export const usageTracker = {
  /**
   * Records usage event for an organization.
   */
  async recordUsage(orgId: string, type: 'ai_tokens' | 'build_minutes', amount: number) {
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
    } catch (err) {
      console.error('[Usage] Failed to report usage to Stripe:', err);
      // Fallback: Store locally if Stripe is down
    }
  },

  /**
   * Checks if an organization has exceeded its usage limits.
   */
  async checkLimits(orgId: string): Promise<boolean> {
    // Mock limit check
    return true;
  }
};

