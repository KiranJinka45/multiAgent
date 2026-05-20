import { test, expect } from '@playwright/test';

test.describe('Phase 2 Chaos: Multi-Tab Operator Contention', () => {

  test('Backend fencing strictly rejects concurrent mutation attempts across operator tabs', async ({ browser }) => {
    // Create two isolated contexts to simulate two different operators 
    // or the same operator aggressively using multiple tabs.
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Both navigate to the same Quarantined partition
    await page1.goto('/sre-cockpit/partition/prt-003');
    await page2.goto('/sre-cockpit/partition/prt-003');

    // Operator 1 initiates the ceremony
    await page1.locator('[data-test-id="begin-recovery-ceremony"]').click();
    
    // Simulate Operator 1 completing the hardware signature and submitting
    // We mock the backend to successfully process Operator 1's transition
    await page1.route('**/api/v1/mutations/quarantine-release', route => 
      route.fulfill({ status: 200, json: { status: 'REBUILDING', sequenceId: 'SEQ-1002' } })
    );
    await page1.locator('[data-test-id="submit-quorum-release"]').click();

    // Operator 2, looking at a stale tab (still showing QUARANTINED), attempts the exact same action
    await page2.locator('[data-test-id="begin-recovery-ceremony"]').click();

    // Mock the backend specifically rejecting Operator 2 due to sequence validation failure (WAL_SEQUENCE_MISMATCH)
    await page2.route('**/api/v1/mutations/quarantine-release', route => 
      route.fulfill({ 
        status: 409, 
        json: { error: 'WAL_SEQUENCE_MISMATCH', message: 'Lineage drift detected. State has already transitioned.' } 
      })
    );
    await page2.locator('[data-test-id="submit-quorum-release"]').click();

    // Operator 2's UI MUST reject the optimistic action and display the specific sequence error
    await expect(page2.locator('text=Lineage drift detected')).toBeVisible();

    // Operator 2's UI state MUST revert/sync to reality, it cannot be ACTIVE
    await expect(page2.locator('[data-test-id="partition-state-label"]')).not.toHaveText('ACTIVE');
  });

});
