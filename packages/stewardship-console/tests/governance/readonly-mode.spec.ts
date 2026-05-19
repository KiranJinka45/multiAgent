import { test, expect } from '@playwright/test';

test.describe('11.1 Freeze: "Read-Only Means Read-Only" Governance Enforcement', () => {

  test.beforeEach(async ({ page }) => {
    // Simulate a degraded backend / partition
    await page.route('**/api/v1/telemetry', route => 
      route.fulfill({ status: 503, body: 'Authoritative Backend Unreachable' })
    );
    await page.goto('/sre-cockpit');
  });

  test('UI transitions to READ-ONLY LOCAL CACHE MODE banner', async ({ page }) => {
    const banner = page.locator('text=AUTHORITATIVE BACKEND UNREACHABLE');
    await expect(banner).toBeVisible();
    await expect(page.locator('text=READ-ONLY LOCAL CACHE MODE')).toBeVisible();
  });

  test('All mutation endpoints and buttons are hard-disabled', async ({ page }) => {
    // Force a degraded state
    const overrideButton = page.locator('[data-test-id="ceremony-override-btn"]');
    const rollbackButton = page.locator('[data-test-id="rollback-execution-btn"]');
    
    // Assert strictly disabled state
    await expect(overrideButton).toBeDisabled();
    await expect(rollbackButton).toBeDisabled();
  });

  test('Cached telemetry is visually timestamped as stale', async ({ page }) => {
    const telemetryContainer = page.locator('[data-test-id="telemetry-panel"]');
    await expect(telemetryContainer).toHaveClass(/stale-data-indicator/);
    await expect(telemetryContainer.locator('text=Telemetry freshness degraded')).toBeVisible();
  });

  test('Quorum signature submission is blocked at the component level', async ({ page }) => {
    // Attempting to open the HSM ceremony modal should be blocked
    const openCeremonyBtn = page.locator('[data-test-id="open-ceremony-modal"]');
    await expect(openCeremonyBtn).toBeDisabled();
  });
});
