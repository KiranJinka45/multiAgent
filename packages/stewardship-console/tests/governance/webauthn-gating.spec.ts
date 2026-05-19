import { test, expect } from '@playwright/test';

test.describe('Phase 1: WebAuthn Gating', () => {

  test('Quorum mutation strictly blocked without hardware attestation', async ({ page, request }) => {
    // Navigate to a Quarantined partition
    await page.goto('/sre-cockpit/partition/prt-003');

    // Ensure state is QUARANTINED
    await expect(page.locator('[data-test-id="partition-state-label"]')).toHaveText('QUARANTINED');

    // Mock WebAuthn navigator API to simulate an environment where hardware key is missing or canceled
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'credentials', {
        value: {
          get: async () => { throw new Error('NotAllowedError: Hardware attestation denied'); }
        }
      });
    });

    const initiateBtn = page.locator('[data-test-id="begin-recovery-ceremony"]');
    await initiateBtn.click();

    // The system should attempt the hardware challenge, fail, and render the exact rejection
    const errorBanner = page.locator('[data-test-id="webauthn-error-banner"]');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('Hardware attestation denied');

    // State MUST remain QUARANTINED
    await expect(page.locator('[data-test-id="partition-state-label"]')).toHaveText('QUARANTINED');
  });

});
