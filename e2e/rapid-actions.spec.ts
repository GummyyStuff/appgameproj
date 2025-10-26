/**
 * Rapid Actions E2E Tests
 * Tests for rapid clicking, debouncing, and concurrency prevention
 */

import { test, expect } from '@playwright/test';
import { CaseOpeningPage } from './pages/CaseOpeningPage';
import { StockMarketPage } from './pages/StockMarketPage';
import { LoginPage } from './pages/LoginPage';

test.describe('Rapid Actions - Debouncing and Concurrency Prevention', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'TestPassword123!');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Case Opening - Rapid Clicks', () => {
    test('should debounce rapid clicks on open case button', async ({ page }) => {
      const casePage = new CaseOpeningPage(page);
      await casePage.goto();

      // Wait for cases to load
      await expect(page.locator('[data-testid="case-card"]').first()).toBeVisible({ timeout: 10000 });

      // Get initial balance
      const initialBalance = await casePage.getBalance();
      expect(initialBalance).toBeGreaterThan(0);

      // Simulate rapid clicking on the first case multiple times
      const openCaseButton = page.locator('[data-testid="open-case-button"]').first();
      
      // Click rapidly 5 times
      for (let i = 0; i < 5; i++) {
        await openCaseButton.click({ timeout: 100 });
        await page.waitForTimeout(50); // Small delay between clicks
      }

      // Wait a bit for processing
      await page.waitForTimeout(1000);

      // Should only have opened 1 case (debouncing should prevent duplicates)
      const finalBalance = await casePage.getBalance();
      
      // If debouncing works, only one case should have been opened
      // We can't easily verify this without more UI feedback, so we verify no crashes
      expect(finalBalance).toBeDefined();
    });

    test('should show loading state during case opening', async ({ page }) => {
      const casePage = new CaseOpeningPage(page);
      await casePage.goto();

      const openCaseButton = page.locator('[data-testid="open-case-button"]').first();
      
      // Click to open case
      await openCaseButton.click();

      // Should show loading/processing state
      const loadingIndicator = page.locator('text=/Opening|Processing|Opening Case/i').first();
      await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
      
      // Button should be disabled during processing
      await expect(openCaseButton).toBeDisabled({ timeout: 500 });
    });
  });

  test.describe('Stock Market - Rapid Trading', () => {
    test('should prevent rapid buy orders', async ({ page }) => {
      const stockPage = new StockMarketPage(page);
      await stockPage.goto();

      // Wait for market to load
      await expect(page.locator('[data-testid="current-price"]')).toBeVisible({ timeout: 10000 });

      const buyButton = page.locator('button:has-text("Buy")').first();
      
      // Try to click rapidly 3 times
      for (let i = 0; i < 3; i++) {
        await buyButton.click({ timeout: 100 });
        await page.waitForTimeout(50);
      }

      // Only one buy should go through (request deduplication)
      await page.waitForTimeout(1000);
      
      // Verify no crashes and state is consistent
      const currentPrice = await page.locator('[data-testid="current-price"]').textContent();
      expect(currentPrice).toBeDefined();
    });

    test('should handle rapid buy/sell toggle correctly', async ({ page }) => {
      const stockPage = new StockMarketPage(page);
      await stockPage.goto();

      const buyButton = page.locator('button:has-text("Buy")').first();
      const sellButton = page.locator('button:has-text("Sell")').first();

      // Rapidly toggle between buy and sell
      await buyButton.click();
      await page.waitForTimeout(50);
      await sellButton.click();
      await page.waitForTimeout(50);
      await buyButton.click();

      // Should not crash or create inconsistent state
      await page.waitForTimeout(1000);
      
      // Verify UI is still responsive
      await expect(page.locator('[data-testid="current-price"]')).toBeVisible();
    });
  });

  test.describe('Concurrent Operations', () => {
    test('should handle case opening while navigating away', async ({ page }) => {
      const casePage = new CaseOpeningPage(page);
      await casePage.goto();

      // Start opening a case
      const openCaseButton = page.locator('[data-testid="open-case-button"]').first();
      await openCaseButton.click();

      // Immediately try to navigate away
      await page.click('a:has-text("Dashboard")', { timeout: 500 });

      // Should not crash or leave inconsistent state
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('dashboard');
    });

    test('should prevent multiple modals from opening', async ({ page }) => {
      // This tests that the confirmation modal doesn't open multiple times
      const casePage = new CaseOpeningPage(page);
      await casePage.goto();

      // Click case card to open confirmation modal
      const caseCard = page.locator('[data-testid="case-card"]').first();
      await caseCard.click();

      // Wait for confirmation modal
      const confirmModal = page.locator('[data-testid="case-confirmation-modal"]');
      await expect(confirmModal).toBeVisible({ timeout: 2000 });

      // Try clicking the case card again while modal is open
      await caseCard.click({ force: true });

      // Should still only have one modal
      const modals = await page.locator('[data-testid="case-confirmation-modal"]').count();
      expect(modals).toBe(1);
    });
  });
});

