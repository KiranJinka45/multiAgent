import { test, expect } from '@playwright/test';

test.describe('Phase 1: SSE Fallback Isolation', () => {

  test('SSE stream is strictly limited to urgent incident alerts', async ({ page }) => {
    // Listen for EventSource connections
    let sseUrl = '';
    page.on('request', request => {
      if (request.resourceType() === 'eventsource') {
        sseUrl = request.url();
      }
    });

    await page.goto('/sre-cockpit');

    // Wait 3 seconds to observe network behavior
    await page.waitForTimeout(3000);

    // Assert that if an SSE connection is made, it MUST be scoped specifically to incidents
    // Broad 'sync' or 'state' SSE streams are banned by governance.
    if (sseUrl !== '') {
      expect(sseUrl).toContain('/api/v1/incidents/stream');
      expect(sseUrl).not.toContain('/state');
      expect(sseUrl).not.toContain('/sync');
    }
  });

});
