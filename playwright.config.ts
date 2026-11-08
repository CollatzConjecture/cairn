/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

/** End-to-end specs live in e2e/. The suite starts its own dev server on 5180, or runs against one you already have through E2E_URL. */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_URL ?? 'http://localhost:5180',
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: process.env.E2E_URL
    ? undefined
    : {
        command: 'npx vite --port 5180 --strictPort',
        url: 'http://localhost:5180',
        reuseExistingServer: !process.env.CI,
      },
});
