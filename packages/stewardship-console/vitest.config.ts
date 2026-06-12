import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exclude all tests because this package contains Playwright specs only
    exclude: ['**/*'],
  },
});
