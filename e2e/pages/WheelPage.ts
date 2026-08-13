/**
 * Wheel of Chance Page Object Model
 */

import { Page, Locator } from '@playwright/test';

export class WheelPage {
  readonly page: Page;
  readonly wheel: Locator;
  readonly spinButton: Locator;
  readonly clearButton: Locator;
  readonly centerSpinButton: Locator;
  readonly resultDisplay: Locator;
  readonly spinningIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.wheel = page.getByTestId('wheel-spinner');
    this.spinButton = page.getByTestId('wheel-spin-button');
    this.clearButton = page.getByTestId('wheel-clear-button');
    this.centerSpinButton = page.getByTestId('wheel-center-spin');
    this.resultDisplay = page.getByTestId('wheel-result');
    this.spinningIndicator = page.getByText('Spinning...').first();
  }

  async goto() {
    await this.page.goto('/wheel', { waitUntil: 'domcontentloaded' });
    await this.wheel.waitFor({ timeout: 15000 });
    await this.page.waitForTimeout(1500);
  }

  denomination(amount: number): Locator {
    return this.page.getByTestId(`denomination-${amount}`);
  }

  multiplierBet(segmentIndex: number): Locator {
    return this.page.getByTestId(`multiplier-bet-${segmentIndex}`);
  }

  async placeBetOnMultiplier(segmentIndex: number, denomination = 100) {
    await this.denomination(denomination).click();
    await this.multiplierBet(segmentIndex).click();
  }

  async spin() {
    await this.spinButton.click();
  }
}
