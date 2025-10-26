/**
 * Roulette Game E2E Tests
 * Tests roulette game interactions and betting workflows
 */

import { test, expect } from '@playwright/test';
import { RoulettePage } from './pages/RoulettePage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';

test.describe('Roulette Game Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'TestPassword123!');
    await page.waitForLoadState('networkidle');
  });

  test('should load roulette game', async ({ page }) => {
    const roulettePage = new RoulettePage(page);
    await roulettePage.goto();

    // Verify roulette wheel is visible
    await expect(roulettePage.rouletteWheel).toBeVisible();
    
    // Verify betting controls are present
    await expect(roulettePage.betAmountInput).toBeVisible();
    await expect(roulettePage.placeBetButton).toBeVisible();
  });

  test('should place a bet on red', async ({ page }) => {
    const roulettePage = new RoulettePage(page);
    await roulettePage.goto();

    // Set bet amount
    await roulettePage.setBetAmount(100);

    // Select red bet type
    await roulettePage.selectBetType('Red');

    // Place bet
    await roulettePage.placeBet();

    // Wait for spin
    await roulettePage.waitForSpinComplete();

    // Verify result is shown
    await expect(page.locator('text=/Winner|Result|✓/i')).toBeVisible();
  });

  test('should handle quick bet buttons', async ({ page }) => {
    const roulettePage = new RoulettePage(page);
    await roulettePage.goto();

    // Use quick bet button
    await roulettePage.useQuickBet(100);

    // Verify bet amount is set
    const betAmount = await roulettePage.betAmountInput.inputValue();
    expect(parseInt(betAmount)).toBe(100);
  });

  test('should prevent betting with insufficient balance', async ({ page }) => {
    const roulettePage = new RoulettePage(page);
    await roulettePage.goto();

    // Try to bet more than balance
    await roulettePage.setBetAmount(999999);
    await roulettePage.selectBetType('Red');

    // Place bet button should be disabled or show error
    const errorMessage = await page.locator('text=/insufficient|not enough|balance/i').first();
    await expect(errorMessage).toBeVisible();
  });
});

