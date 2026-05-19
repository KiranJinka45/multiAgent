import { test, expect } from '@playwright/test';

test.describe('Phase 1: Polling Behavior & Adaptive Backoff', () => {

  test('HTTP polling uses 2.0s interval and backs off on failure', async ({ page }) => {
    let requestCount = 0;
    const requestTimes: number[] = [];

    // Intercept telemetry route
    await page.route('**/api/v1/telemetry', async (route) => {
      requestCount++;
      requestTimes.push(Date.now());
      
      // Simulate backend failure after the first successful request
      if (requestCount > 1) {
        await route.fulfill({ status: 503, body: 'Service Unavailable' });
      } else {
        await route.fulfill({ status: 200, json: { status: 'OK' } });
      }
    });

    await page.goto('/sre-cockpit');

    // Wait for the first 3 requests
    await page.waitForResponse('**/api/v1/telemetry');
    await page.waitForResponse('**/api/v1/telemetry');
    await page.waitForResponse('**/api/v1/telemetry');

    expect(requestTimes.length).toBeGreaterThanOrEqual(3);

    // Calculate intervals
    const interval1 = requestTimes[1] - requestTimes[0];
    const interval2 = requestTimes[2] - requestTimes[1];

    // First interval should be ~2000ms (default polling rate)
    expect(interval1).toBeGreaterThanOrEqual(1900);
    expect(interval1).toBeLessThan(2500);

    // Second interval should demonstrate adaptive exponential backoff (e.g. > 3000ms)
    // because requestCount=2 returned a 503
    expect(interval2).toBeGreaterThan(interval1);
    expect(interval2).toBeGreaterThan(3000); 
  });

});
