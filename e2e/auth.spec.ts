/**
 * Authentication E2E Tests
 * Tests user login workflows (registration was removed from the app;
 * the development build uses the test-login form).
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test.describe('Authentication Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // These tests exercise the login form, so start unauthenticated
    await page.context().clearCookies();
  });

  test('should complete user login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Login with test credentials
    await loginPage.login('test@example.com', 'testpassword123');

    // Should redirect away from login
    await expect(page).not.toHaveURL(/.*\/login/, { timeout: 15000 });
  });

  test('should handle invalid login credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Attempt login with invalid credentials
    await loginPage.login('invalid@example.com', 'wrongpassword');

    // Should show an error message
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toMatch(/invalid|incorrect|error|failed/i);
  });
});
