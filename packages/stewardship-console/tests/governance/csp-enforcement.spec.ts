import { test, expect } from '@playwright/test';

test.describe('Phase 1: CSP Enforcement', () => {

  test('Inline script execution is completely blocked by CSP', async ({ page }) => {
    const cspViolations: string[] = [];

    // Capture CSP violation reports from the browser console
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
        cspViolations.push(msg.text());
      }
    });

    await page.goto('/sre-cockpit');

    // Attempt to inject an inline script
    try {
      await page.evaluate(() => {
        const script = document.createElement('script');
        script.innerHTML = 'window.__MALICIOUS_FLAG__ = true;';
        document.body.appendChild(script);
      });
    } catch (e) {
      // Evaluation might fail immediately due to Trusted Types or CSP
    }

    // Verify the malicious flag was NOT set
    const maliciousFlagSet = await page.evaluate(() => (window as any).__MALICIOUS_FLAG__);
    expect(maliciousFlagSet).toBeFalsy();

    // Verify a CSP violation was logged by the browser
    expect(cspViolations.length).toBeGreaterThan(0);
    expect(cspViolations.some(msg => msg.includes('script-src') || msg.includes('unsafe-inline'))).toBeTruthy();
  });

});
