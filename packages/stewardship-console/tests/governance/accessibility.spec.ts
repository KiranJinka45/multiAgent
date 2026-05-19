import { test, expect } from '@playwright/test';

test.describe('Phase 1: Incident Accessibility (A11y)', () => {

  test('Full keyboard-only navigation is mandatory', async ({ page }) => {
    await page.goto('/sre-cockpit');

    // Start tab navigation
    await page.keyboard.press('Tab');

    // The first focusable element MUST be the "Skip to main content" link (Accessibility Best Practice)
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeFocused();

    // Press Tab again to focus the next critical operational element
    await page.keyboard.press('Tab');
    
    // Check that focus indicators are highly visible (computed outline style)
    const focusedElement = page.locator(':focus');
    const outlineStyle = await focusedElement.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return computed.outlineStyle;
    });

    // The outline MUST not be 'none', enforcing visible focus states for operators
    expect(outlineStyle).not.toBe('none');
  });

  test('Status colors require explicit text labels', async ({ page }) => {
    await page.goto('/sre-cockpit/topology-map');
    
    // Locate a state badge
    const badge = page.locator('[data-test-id="partition-state-label"]').first();
    
    // Assert that the text content matches formal states, not just a color indicator
    const textContent = await badge.textContent();
    expect(['ACTIVE', 'READ_ONLY', 'REBUILDING', 'QUARANTINED']).toContain(textContent?.trim());
  });

});
