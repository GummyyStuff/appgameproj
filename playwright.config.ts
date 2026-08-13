import { defineConfig, devices } from '@playwright/test';
import { STORAGE_STATE_PATH } from './e2e/auth-state';

/**
 * Playwright Configuration for E2E Testing
 */

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE_PATH,
      },
      dependencies: ['setup'],
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: STORAGE_STATE_PATH,
      },
      dependencies: ['setup'],
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: STORAGE_STATE_PATH,
      },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !process.env.CI,
  },
});
