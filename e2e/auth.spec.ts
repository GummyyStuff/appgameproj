/**
 * Authentication E2E Tests
 * Tests user registration and login workflows
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Authentication Workflows', () => {
  test('should complete user registration', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    // Navigate to sign up
    await loginPage.navigateToSignUp();
    await page.waitForLoadState('networkidle');

    // Fill registration form
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('TestPassword123!');
    
    // Submit registration
    await page.getByRole('button', { name: /sign up|register/i }).click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard|.*\/$/);
    
    // Verify logged in state
    const dashboard = new DashboardPage(page);
    const balance = await dashboard.getBalance();
    expect(balance).toBeTruthy();
  });

  test('should complete user login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Login with credentials
    await loginPage.login('test@example.com', 'TestPassword123!');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard|.*\/$/);

    // Verify logged in
    const dashboard = new DashboardPage(page);
    await expect(dashboard.balanceDisplay).toBeVisible();
  });

  test('should handle invalid login credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Attempt login with invalid credentials
    await loginPage.login('invalid@example.com', 'wrongpassword');

    // Should show error message
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain(/invalid|incorrect|error/i);
  });
});

