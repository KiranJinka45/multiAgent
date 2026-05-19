import { test, expect } from '@playwright/test';

test.describe('Phase 2 Chaos: Resource Exhaustion', () => {

  test('UI recovers polling after CPU throttling and tab suspension', async ({ page, context }) => {
    // Connect to CDP to throttle CPU to simulate an operator with 200 tabs open
    const client = await context.newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 6 }); // 6x slowdown

    await page.goto('/sre-cockpit');

    // Verify UI renders eventually despite massive CPU constraints
    const telemetryPanel = page.locator('[data-test-id="telemetry-panel"]');
    await expect(telemetryPanel).toBeVisible({ timeout: 30000 });

    // Simulate Background Tab Suspension (Visibility API)
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Wait a moment in "background"
    await page.waitForTimeout(5000);

    // Wake the tab back up
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Polling must safely resume and surface the stale timestamp indicator
    const staleIndicator = page.locator('.stale-data-indicator');
    await expect(staleIndicator).toBeVisible();

    // Verify NO phantom ACTIVE states persist without fresh backend confirmation
    const stateLabel = page.locator('[data-test-id="partition-state-label"]').first();
    // Assuming the mocked state was anything but ACTIVE during the background sleep
    await expect(stateLabel).not.toHaveText('ACTIVE'); 
  });

});
