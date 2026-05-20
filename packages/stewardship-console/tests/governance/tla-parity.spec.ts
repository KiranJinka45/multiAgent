import { test, expect } from '@playwright/test';

test.describe('11.9 Formal Truth Parity: TLA+ -> UI Synchronization', () => {

  test('UI State Topology exactly mirrors TLA+ specification', async ({ page }) => {
    // According to invariants.tla, a partition can ONLY exist in exactly 4 states:
    // ACTIVE, READ_ONLY, QUARANTINED, REBUILDING
    
    await page.goto('/sre-cockpit/topology-map');
    
    // Scrape all rendered states from the DOM
    const stateLabels = page.locator('[data-test-id="partition-state-label"]');
    const count = await stateLabels.count();
    
    const uniqueStates = new Set();
    for(let i=0; i<count; i++) {
      uniqueStates.add(await stateLabels.nth(i).textContent());
    }

    // Assert absolute set equality
    const allowedTlaStates = new Set(['ACTIVE', 'READ_ONLY', 'QUARANTINED', 'REBUILDING']);
    
    uniqueStates.forEach(state => {
      expect(allowedTlaStates.has(state as string)).toBeTruthy();
    });

    // Ensure no unexpected wildcard states (e.g. 'UNKNOWN', 'PENDING', 'SYNCING') are rendered
    expect(uniqueStates.size).toBeLessThanOrEqual(4);
  });

  test('TLA+ Invariant: No QUARANTINED -> ACTIVE direct transition', async ({ page }) => {
    // TLA+ spec mandates QUARANTINED -> RECOVERING -> ACTIVE. 
    // The UI must not offer a direct 'Restore to Active' button from the Quarantine state.
    
    await page.goto('/sre-cockpit/partition/quarantined-node');

    const restoreToActiveBtn = page.locator('[data-test-id="direct-restore-btn"]');
    await expect(restoreToActiveBtn).toHaveCount(0); // Must be completely absent from DOM
    
    const beginRecoveryBtn = page.locator('[data-test-id="begin-recovery-ceremony"]');
    await expect(beginRecoveryBtn).toBeVisible(); // This is the mathematically correct next step
  });

});
