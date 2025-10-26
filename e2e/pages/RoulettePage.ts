/**
 * Roulette Page Object Model
 * Encapsulates roulette game interactions
 */

import { Page, Locator } from '@playwright/test';

export class RoulettePage {
  readonly page: Page;
  readonly betAmountInput: Locator;
  readonly placeBetButton: Locator;
  readonly rouletteWheel: Locator;
  readonly quickBetButtons: Locator;
  readonly betTypeSelect: Locator;

  constructor(page: Page) {
    this.page = page;
    this.betAmountInput = page.locator('input[type="number"]');
    this.placeBetButton = page.getByRole('button', { name: /place bet|spin/i });
    this.rouletteWheel = page.locator('[data-testid="roulette-wheel"]');
    this.quickBetButtons = page.locator('button').filter({ hasText: /₽/ });
    this.betTypeSelect = page.locator('select, [role="radiogroup"]');
  }

  async goto() {
    await this.page.goto('/roulette');
    await this.page.waitForLoadState('networkidle');
  }

  async setBetAmount(amount: number) {
    await this.betAmountInput.fill(amount.toString());
  }

  async useQuickBet(amount: number) {
    await this.quickBetButtons.filter({ hasText: `₽${amount}` }).first().click();
  }

  async selectBetType(type: string) {
    await this.betTypeSelect.locator(`text=${type}`).click();
  }

  async placeBet() {
    await this.placeBetButton.click();
  }

  async waitForSpinComplete() {
    await this.page.waitForTimeout(3000); // Wait for spin animation
  }
}

