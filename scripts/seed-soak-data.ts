import { SreAnalyticsService } from '../apps/core-api/src/services/governance/sre-analytics';
import { redis } from '@packages/utils';

async function seedSoakData() {
  console.log('--- SEEDING 7-DAY SOAK DATA (100+ DECISIONS) ---');
  
  // Clear existing log for clean report
  await redis.del('sre:analytics:events');

  const now = Date.now();
  const ONE_HOUR = 3600 * 1000;
  const ONE_DAY = 24 * ONE_HOUR;

  for (let i = 0; i < 120; i++) {
    const ts = now - (Math.random() * 7 * ONE_DAY);
    const isFirstHalf = ts < (now - 3.5 * ONE_DAY);
    
    // 1. Record Trust Event (Highly Calibrated)
    await SreAnalyticsService.recordEvent({
      type: 'TRUST',
      payload: {
        trust: 0.85 + (Math.random() * 0.1),
        brierScore: 0.12 + (Math.random() * 0.05)
      }
    });

    // 2. Record Action or HITL
    const isHitl = isFirstHalf ? Math.random() > 0.4 : Math.random() > 0.8; // Decreasing HITL
    
    if (isHitl) {
      await SreAnalyticsService.recordEvent({
        type: 'HITL',
        payload: { status: 'APPROVED', ttdMs: 45000 + (Math.random() * 10000) }
      });
    } else {
      await SreAnalyticsService.recordEvent({
        type: 'ACTION',
        payload: {
          mode: 'AUTONOMOUS',
          success: Math.random() > 0.05, // 95% Success
          regret: 0.05 + (Math.random() * 0.1)
        }
      });
    }
  }

  console.log('Seed complete: 120 Decisions recorded.');
}

seedSoakData().catch(console.error);
