import { test, expect } from '@playwright/test';

test.describe('SRE Control Plane: Proof of Truth', () => {
  const state = {
    apiHealthy: true
  };

  test.beforeEach(async ({ page }) => {
    state.apiHealthy = true;
    
    // Intercept API calls to simulate system health telemetry
    await page.route('**/system-health', async route => {
      if (state.apiHealthy) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              activeWorkers: 12,
              totalWorkers: 15,
              errorRate: 0.5,
              confidence: 98,
              avgLatency: 120,
              mode: 'NORMAL',
              events: { streamLength: 100, pelSize: 5, dlqSize: 0, latencyMs: 45 },
              log: [
                { timestamp: 1714322400000, type: 'INFO', message: 'System healthy' }
              ]
            }
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              activeWorkers: 15,
              totalWorkers: 15,
              errorRate: 8.5,
              confidence: 42,
              avgLatency: 2500,
              mode: 'INCIDENT',
              events: { streamLength: 500, pelSize: 150, dlqSize: 12, latencyMs: 3200 },
              log: [
                { timestamp: 1714322400000, type: 'ERROR', message: 'High latency detected' },
                { timestamp: 1714322401000, type: 'INCIDENT', message: 'Breached Error Budget' }
              ]
            }
          })
        });
      }
    });

    // Mock WebSocket to prevent 'Offline' state
    await page.addInitScript(() => {
      (window as any).WebSocket = class {
        onopen = () => {};
        onmessage = () => {};
        onclose = () => {};
        onerror = () => {};
        send = () => {};
        close = () => {};
        addEventListener = (type, listener) => {
          if (type === 'open') setTimeout(() => listener({}), 100);
        };
      } as any;
    });
  });

  async function resetApp(page) {
    await page.goto('/health');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.sre-dashboard', { timeout: 30000 });
  }

  test('Truth Test: Should transition to INCIDENT when telemetry degrades', async ({ page }) => {
    await resetApp(page);
    await expect(page.getByTestId('status-pill')).toBeVisible({ timeout: 25000 });

    state.apiHealthy = false;
    await expect(page.locator('.status-pill.incident, .status-pill.emergency')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.incident-card')).toBeVisible();
  });

  test('Hysteresis Test: Should stay in RECOVERING for a period after failure', async ({ page }) => {
    await resetApp(page);
    
    // 1. Trigger Failure
    state.apiHealthy = false;
    await expect(page.locator('.status-pill.incident')).toBeVisible({ timeout: 20000 });

    // 2. Resolve Failure
    state.apiHealthy = true;
    await page.waitForTimeout(3000); // Wait for poll

    // 3. Verify Hysteresis State
    await expect(page.locator('.status-pill.recovering, .status-pill.warning')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.status-pill')).toContainText('RECOVERING');
    
    // 4. Verify it doesn't flip back to NORMAL immediately
    await page.waitForTimeout(3000);
    await expect(page.locator('.status-pill.operational')).not.toBeVisible();
  });

  test('Safe-Mode Test: Should lock destructive actions during Incident', async ({ page }) => {
    await resetApp(page);
    state.apiHealthy = false;
    await expect(page.locator('.incident-card')).toBeVisible({ timeout: 20000 });

    const warning = page.locator('.safe-mode-warning');
    await expect(warning).toBeVisible();

    const drainBtn = page.locator('button:has-text("Drain")');
    await expect(drainBtn).toBeDisabled();
  });

  test('Durability Test: Should persist state after refresh', async ({ page }) => {
    await resetApp(page);
    state.apiHealthy = false;
    await expect(page.locator('.status-pill.incident')).toBeVisible({ timeout: 20000 });
    
    // Refresh page
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.sre-dashboard', { timeout: 20000 });

    // Verify state persistence (initial state from localStorage)
    await expect(page.locator('.status-pill.incident')).toBeVisible({ timeout: 15000 });
  });
});
