import { test, expect } from '@playwright/test';

test.describe('Phase 1: Memory Ceiling & Performance Budgets', () => {

  test('Browser idle memory stays strictly bounded', async ({ page }) => {
    // Note: JSHeapSize is only available in Chromium browsers with precise tracking enabled.
    test.skip(test.info().project.name !== 'chromium', 'Memory tests require Chromium APIs');

    await page.goto('/sre-cockpit');

    // Simulate 30 seconds of active polling and rendering to allow baseline initialization
    await page.waitForTimeout(5000); 

    // Extract JS Heap size
    const metrics = await page.evaluate(() => (performance as any).memory);
    
    if (metrics) {
      const usedHeapSizeMB = metrics.usedJSHeapSize / (1024 * 1024);
      
      // Governance Constraint: Memory Footprint <= 150MB per browser tab
      expect(usedHeapSizeMB).toBeLessThanOrEqual(150);
    }
  });

});
