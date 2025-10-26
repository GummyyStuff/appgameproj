/**
 * Navigation E2E Tests
 * Tests app navigation and UI responsiveness
 */

import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';

test.describe('Navigation and UI', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'TestPassword123!');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate between game pages', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    
    // Navigate to roulette
    await page.goto('/roulette');
    await expect(page).toHaveURL(/.*roulette/);

    // Navigate to case opening
    await page.goto('/cases');
    await expect(page).toHaveURL(/.*cases/);

    // Navigate back to home
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/$/);
  });

  test('should access profile page', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    
    await dashboard.clickProfile();
    
    // Should navigate to profile
    await expect(page).toHaveURL(/.*profile|.*account/i);
  });

  test('should handle logout', async ({ page }) => {
    await page.getByRole('button', { name: /logout|sign out/i }).click();
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });
});

