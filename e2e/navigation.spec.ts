/**
 * Navigation E2E Tests
 * Tests app navigation and UI responsiveness.
 * Authentication is handled by the global setup (storageState).
 */

import { test, expect } from '@playwright/test';

test.describe('Navigation and UI', () => {
  test.use({ viewport: { width: 1600, height: 900 } });

  test('should navigate between game pages', async ({ page }) => {
    // Navigate to wheel of chance
    await page.goto('/wheel', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/.*wheel/);

    // Navigate to case opening
    await page.goto('/cases', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/.*cases/);

    // Navigate back to home
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/.*\/$/);
  });

  test('should access profile page', async ({ page }) => {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/.*profile|.*account/i);
  });

  test('should handle logout', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Open the profile dropdown, then click Logout
    await page.locator('button', { hasText: /Welcome, / }).first().click();
    const logout = page.getByText('Logout', { exact: true }).first();
    await logout.waitFor({ timeout: 10000 });
    await logout.click();

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/, { timeout: 15000 });
  });
});
