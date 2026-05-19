import { test, expect } from '@playwright/test';

test.describe('11.8 Freeze: Mobile Support Policy Enforcement', () => {

  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test('Mobile viewport completely disables mutation components', async ({ page }) => {
    await page.goto('/sre-cockpit');

    // The entire operations panel should be hidden or render an unsupported message
    const opsPanel = page.locator('[data-test-id="operations-mode-panel"]');
    await expect(opsPanel).not.toBeVisible();

    const unsupportedMessage = page.locator('text=Mobile devices are unsupported for operational mutations');
    await expect(unsupportedMessage).toBeVisible();

    // Ensure buttons don't leak into the DOM
    const releaseBtn = page.locator('[data-test-id="submit-quorum-release"]');
    await expect(releaseBtn).toHaveCount(0);
  });

});

test.describe('Tablet Support Policy Enforcement', () => {

  test.use({ viewport: { width: 768, height: 1024 } }); // iPad size

  test('Tablet viewport limits access to observational only', async ({ page }) => {
    await page.goto('/sre-cockpit');

    // Observational elements should be visible
    const telemetryPanel = page.locator('[data-test-id="telemetry-panel"]');
    await expect(telemetryPanel).toBeVisible();

    // Destructive mutations must be hard-disabled
    const releaseBtn = page.locator('[data-test-id="submit-quorum-release"]');
    await expect(releaseBtn).toBeDisabled();
    
    const tabletWarning = page.locator('text=Tablet View: Observational Mode Only');
    await expect(tabletWarning).toBeVisible();
  });

});
