import { test, expect } from '@playwright/test';

test.describe('11.4 Freeze: Alert Cardinality Limits', () => {

  test('Enforces strict UI budgets for observability sprawl', async ({ page }) => {
    // Mock the backend to return an overwhelming number of alerts
    await page.route('**/api/v1/telemetry/alerts', route => 
      route.fulfill({
        status: 200,
        json: {
          alerts: Array.from({ length: 50 }, (_, i) => ({ id: i, msg: `Alert ${i}` }))
        }
      })
    );

    await page.goto('/sre-cockpit');

    // Constraint: Top-Level Dashboard Alerts Max 7
    const dashboardAlerts = page.locator('[data-test-id="top-level-alert"]');
    await expect(dashboardAlerts).toHaveCount(7); // It must cap at 7

    // Constraint: Simultaneous Warning Banners Max 1
    const warningBanners = page.locator('.global-warning-banner');
    await expect(warningBanners).toHaveCount(1); // Capped at 1

    // Constraint: Incident Feed Visible Rows Max 25
    const incidentRows = page.locator('[data-test-id="incident-feed-row"]');
    await expect(incidentRows).toHaveCount(25); // Truncated to 25
  });

});
