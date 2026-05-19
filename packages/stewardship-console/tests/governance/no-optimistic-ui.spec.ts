import { test, expect } from '@playwright/test';

test.describe('11.3 Freeze: "No Optimistic UI" Governance Enforcement', () => {

  test('UI waits for authoritative confirmation before rendering state change', async ({ page, request }) => {
    // Intercept mutation API to mock latency
    await page.route('**/api/v1/mutations/quarantine-release', async (route) => {
      // Intentionally delay the backend response by 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({ status: 200, json: { status: 'ACTIVE' } });
    });

    await page.goto('/sre-cockpit');
    
    // Assume we're authenticated and looking at a QUARANTINED partition
    const releaseBtn = page.locator('[data-test-id="submit-quorum-release"]');
    const partitionStatus = page.locator('[data-test-id="prt-003-status"]');

    await expect(partitionStatus).toHaveText('QUARANTINED');

    // Trigger the mutation
    await releaseBtn.click();

    // 1. Immediately after click, the status MUST REMAIN QUARANTINED. No optimistic success.
    await expect(partitionStatus).toHaveText('QUARANTINED');
    
    // 2. The button MUST enter a loading/pending state (not success state).
    await expect(releaseBtn).toBeDisabled();
    await expect(page.locator('[data-test-id="global-pending-indicator"]')).toBeVisible();

    // 3. Wait for the 2-second mocked network response to complete
    await page.waitForResponse('**/api/v1/mutations/quarantine-release');

    // 4. ONLY NOW should the UI transition
    await expect(partitionStatus).toHaveText('ACTIVE');
  });

});
