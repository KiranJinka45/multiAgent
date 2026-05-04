import Stripe from 'stripe';
import { db } from '@packages/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export class StripeService {
  static async createCheckoutSession(userId: string, tenantId: string, productId: string) {
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product) throw new Error('Product not found');

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error('User not found');

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

  static async constructEvent(payload: Buffer, signature: string) {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  }

  static async handleWebhook(payload: Buffer, signature: string) {
    let event: Stripe.Event;

    try {
      event = await this.constructEvent(payload, signature);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Webhook Error: ${message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      // const userId = session.client_reference_id!;
      const metadata = session.metadata as Record<string, string>;

      await db.subscription.create({
        data: {
          tenantId: metadata.tenantId,
          productId: metadata.productId,
          stripeId: session.subscription as string,
          status: 'active',
        },
      });
    }

    return { received: true };
  }
}


