import { test, expect } from '@playwright/test';

/**
 * Example Playwright E2E Test
 */

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Wait for the page to be fully loaded
  await expect(page).toHaveTitle(/Tarkov Casino/);

  // Check that key UI elements are present
  await expect(page.getByText('Wheel', { exact: true }).first()).toBeVisible();
});

test('can navigate to games', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Navigate to wheel of chance
  await page.getByText('Wheel', { exact: true }).first().click();
  await expect(page).toHaveURL(/.*wheel/);
});
