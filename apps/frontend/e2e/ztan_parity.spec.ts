import { test, expect } from '@playwright/test';

test.describe('ZTAN Cross-Runtime Parity', () => {
  test('should match backend hash for RFC v1.4 complex vector', async ({ page }) => {
    await page.goto('/console');
    
    // 1. Load RFC Vector
    await page.click('button:has-text("Load RFC v1.4 Vector")');
    
    // 2. Run Local Pipeline
    await page.click('button:has-text("Run Pipeline")');
    
    // 3. Verify Local Hash (Wait for it to appear in UI)
    const localHashEl = page.locator('.hash-value').first();
    await expect(localHashEl).toContainText('a2d7ef15');
    
    // 4. Verify with Backend
    await page.click('button:has-text("Verify with Backend")');
    
    // 5. Check logs for success message
    const logConsole = page.locator('app-log-console');
    await expect(logConsole).toContainText('✔ CROSS-RUNTIME MATCH', { timeout: 10000 });
  });

  test('should detect replay attack in backend', async ({ page }) => {
    await page.goto('/console');
    await page.click('button:has-text("Load RFC v1.4 Vector")');
    
    // First verification (Record)
    await page.click('button:has-text("Verify with Backend")');
    await expect(page.locator('app-log-console')).toContainText('✔ CROSS-RUNTIME MATCH');

    // Second verification (Replay)
    await page.click('button:has-text("Verify with Backend")');
    await expect(page.locator('app-log-console')).toContainText('[REPLAY DETECTED]');
  });
});
