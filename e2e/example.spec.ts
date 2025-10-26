import { test, expect } from '@playwright/test';

/**
 * Example Playwright E2E Test
 * 
 * This demonstrates how to test the app in a real browser.
 * These tests run in Chromium, Firefox, and WebKit.
 */

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/');

  // Wait for the page to be fully loaded
  await expect(page).toHaveTitle(/Tarkov Casino/);
  
  // Check that key UI elements are present
  await expect(page.locator('text=Balance')).toBeVisible();
});

test('can navigate to games', async ({ page }) => {
  await page.goto('/');
  
  // Navigate to roulette
  await page.click('text=Roulette');
  await expect(page).toHaveURL(/.*roulette/);
});

// TODO: Convert the 36 E2E tests from test-utils/e2e-tests.test.ts to Playwright specs

