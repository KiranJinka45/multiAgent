import axios from 'axios';
import { db } from '@libs/db';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4000';
const TEST_TOKEN = process.env.TEST_JWT_TOKEN;

async function runBusinessSmokeTest() {
  console.log('💰 Starting Autonomous Business Funnel Smoke Test...');

  if (!TEST_TOKEN) {
    console.error('❌ Missing TEST_JWT_TOKEN');
    process.exit(1);
  }

  try {
    // 1. Simulate Traffic (Page View Event)
    console.log('📡 Step 1: Simulating traffic (page_view)...');
    await axios.post(`${GATEWAY_URL}/api/events`, {
      type: 'page_view',
      metadata: { path: '/p/ai-newsletter-builder', source: 'seo-sitemap' }
    });

    // 2. Simulate User Activation (Build Started Event)
    console.log('⚡ Step 2: Simulating activation (build_started)...');
    await axios.post(`${GATEWAY_URL}/api/events`, {
      type: 'build_started',
      metadata: { productId: 'test-product-123', prompt: 'Build me a newsletter' }
    }, {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` }
    });

    // 3. Verify Database Persistence
    console.log('🔍 Step 3: Verifying data in DB...');
    const eventCount = await db.event.count({
      where: { type: { in: ['page_view', 'build_started'] } }
    });

    if (eventCount >= 2) {
      console.log(`✅ Verified ${eventCount} events persisted in database.`);
    } else {
      throw new Error('Events not found in database');
    }

    // 4. Test Stripe Checkout Link Generation
    console.log('💳 Step 4: Testing Stripe checkout generation...');
    const checkoutRes = await axios.post(`${GATEWAY_URL}/api/checkout`, {
      productId: 'test-product-123'
    }, {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` }
    });

    if (checkoutRes.data.url && checkoutRes.data.url.includes('stripe.com')) {
      console.log('✅ Stripe Checkout URL generated successfully:', checkoutRes.data.url);
    } else {
      throw new Error('Invalid Stripe Checkout URL');
    }

    console.log('🚀 BUSINESS SMOKE TEST SUCCESSFUL!');
  } catch (error: any) {
    console.error('❌ BUSINESS SMOKE TEST FAILED:', error.response?.data || error.message);
    process.exit(1);
  }
}

runBusinessSmokeTest();

