/**
 * Wheel of Chance E2E Tests
 */

import { test, expect } from '@playwright/test';
import { WheelPage } from './pages/WheelPage';
import { LoginPage } from './pages/LoginPage';

test.describe('Wheel of Chance', () => {
  test.beforeEach(async ({ page }) => {
    const wheelPage = new WheelPage(page);
    await wheelPage.goto();
  });

  test('loads the wheel page with a server-provided layout', async ({ page }) => {
    const wheelPage = new WheelPage(page);

    await expect(wheelPage.wheel).toBeVisible();
    await expect(wheelPage.multiplierBet(0)).toBeVisible();
    await expect(wheelPage.spinButton).toBeDisabled();
    await expect(wheelPage.centerSpinButton).toBeVisible();
  });

  test('places a bet and spins the wheel', async ({ page }) => {
    const wheelPage = new WheelPage(page);

    await wheelPage.placeBetOnMultiplier(0, 100);
    await expect(wheelPage.spinButton).toBeEnabled();

    await wheelPage.spin();
    await expect(wheelPage.spinningIndicator).toBeVisible();

    // The wheel spins, then settles and the result modal appears
    await expect(wheelPage.resultDisplay).toBeVisible({ timeout: 20000 });
  });

  test('spins the wheel from the center spin button', async ({ page }) => {
    const wheelPage = new WheelPage(page);

    await wheelPage.placeBetOnMultiplier(2, 100);
    await wheelPage.centerSpinButton.click();

    await expect(wheelPage.resultDisplay).toBeVisible({ timeout: 20000 });
  });

  test('blocks betting while the wheel is spinning', async ({ page }) => {
    const wheelPage = new WheelPage(page);

    await wheelPage.placeBetOnMultiplier(0, 100);
    await wheelPage.spin();

    await expect(wheelPage.spinButton).toBeDisabled();
    await expect(wheelPage.clearButton).toBeDisabled();
  });

  test('clears placed bets', async ({ page }) => {
    const wheelPage = new WheelPage(page);

    await wheelPage.placeBetOnMultiplier(0, 100);
    await expect(wheelPage.spinButton).toBeEnabled();

    await wheelPage.clearButton.click();
    await expect(wheelPage.spinButton).toBeDisabled();
  });

  test('requires login to access the wheel', async ({ page }) => {
    await page.context().clearCookies();
    const loginPage = new LoginPage(page);
    await page.goto('/wheel', { waitUntil: 'domcontentloaded' });

    await expect(loginPage.emailInput).toBeVisible();
  });
});
