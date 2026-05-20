import { test, expect } from '@playwright/test';

test.describe('Phase 5: Real PostgreSQL Chaos Coupling', () => {

  test('UI converges to reality during a forced PostgreSQL partition failover', async ({ page }) => {
    // 1. Initial State: Everything is ACTIVE and polling normally
    await page.route('**/api/v1/telemetry', route => 
      route.fulfill({ status: 200, json: { status: 'ACTIVE', sequenceId: 'SEQ-1000' } })
    );

    await page.goto('/sre-cockpit');
    await expect(page.locator('[data-test-id="partition-state-label"]').first()).toHaveText('ACTIVE');

    // 2. Inject DB Chaos: Primary DB crashes, Gateway loses connection
    // We simulate this by changing the route response to a 503 gateway timeout
    await page.route('**/api/v1/telemetry', route => 
      route.fulfill({ status: 503, body: 'Database connection refused' })
    );

    // The polling agent should hit the 503 and immediately degrade the UI
    const warningBanner = page.locator('text=AUTHORITATIVE BACKEND UNREACHABLE');
    await expect(warningBanner).toBeVisible({ timeout: 5000 });
    
    // Assert all mutation controls vanish or disable
    await expect(page.locator('[data-test-id="ceremony-override-btn"]')).toBeDisabled();
    
    // 3. Resolve Chaos: Failover completes, Replica promoted to Primary
    // The Gateway reconnects. Sequence jumps forward.
    await page.route('**/api/v1/telemetry', route => 
      route.fulfill({ status: 200, json: { status: 'ACTIVE', sequenceId: 'SEQ-1050' } })
    );

    // 4. Assert Recovery: The UI must organically recover without human refresh
    // The polling agent should successfully re-sync with the new primary
    await expect(warningBanner).not.toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-test-id="partition-state-label"]').first()).toHaveText('ACTIVE');
    
    // Assert the new sequence is rendered
    await expect(page.locator('[data-test-id="current-sequence-id"]')).toHaveText('SEQ-1050');
  });

  test('UI correctly blocks recovery when WAL lineage drift is detected during Quorum', async ({ page }) => {
    // Navigate to a quarantined node
    await page.goto('/sre-cockpit/partition/prt-003');
    
    // Attempt ceremony
    await page.locator('[data-test-id="begin-recovery-ceremony"]').click();
    
    // Simulate: Operator submits hardware quorum, but underneath, PostgreSQL detects
    // that the node's WAL is fatally out of sync (diverged). 
    // The backend throws a GovernanceError (WAL_SEQUENCE_MISMATCH).
    await page.route('**/api/v1/mutations/quarantine-release', route => 
      route.fulfill({ 
        status: 409, 
        json: { error: 'WAL_SEQUENCE_MISMATCH', message: 'Fatal lineage drift detected. Recovery aborted.' } 
      })
    );

    await page.locator('[data-test-id="submit-quorum-release"]').click();

    // The UI must NOT transition to REBUILDING or ACTIVE.
    await expect(page.locator('[data-test-id="partition-state-label"]')).toHaveText('QUARANTINED');

    // The specific WAL divergence error must be surfaced to the operator
    const errorBanner = page.locator('.error-banner');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('Fatal lineage drift detected');

    // The Runbook guidance should appear, instructing them to Destroy-and-Rebuild
    await expect(page.locator('text=Refer to RUNBOOK_WAL_DIVERGENCE.md: Destroy and rebuild is the only mathematically sound path.')).toBeVisible();
  });

});
