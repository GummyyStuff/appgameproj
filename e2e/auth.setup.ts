/**
 * Global authentication setup for E2E tests.
 * Logs in once via the test-login form and stores the session so
 * individual specs don't hit auth rate limits.
 */

import { test as setup, expect } from '@playwright/test';
import { STORAGE_STATE_PATH } from './auth-state';

setup('authenticate', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  await page.locator('#test-email').fill('test@example.com');
  await page.locator('#test-password').fill('testpassword123');
  await page.getByRole('button', { name: 'Test Login' }).click();

  // Wait for the app to navigate away from /login
  await expect(page).not.toHaveURL(/.*\/login/, { timeout: 15000 });
  await page.waitForTimeout(2000);

  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
