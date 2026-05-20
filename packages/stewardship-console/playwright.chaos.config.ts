import { defineConfig, devices } from '@playwright/test';

/**
 * ZTAN Governance Console - Chaos Validation Configuration
 * 
 * Phase 2 execution. This config is intentionally hostile.
 * It simulates operational reality: degraded hardware, 
 * saturated networks, and aggressive operator multi-tabbing.
 */
export default defineConfig({
  testDir: './tests/chaos',
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  fullyParallel: true,
  retries: 0,
  workers: process.env.CI ? 2 : 4,
  reporter: 'list',
  use: {
    actionTimeout: 0,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'Hostile Network (3G, High Latency)',
      use: {
        ...devices['Desktop Chrome'],
        // Emulating hostile connectivity conditions natively via CDP in the tests
      },
    },
    {
      name: 'Exhausted Hardware (CPU Throttled)',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
