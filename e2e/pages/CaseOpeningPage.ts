/**
 * Case Opening Page Object Model
 * Encapsulates case opening game interactions
 */

import { Page, Locator } from '@playwright/test';

export class CaseOpeningPage {
  readonly page: Page;
  readonly caseCard: Locator;
  readonly openCaseButton: Locator;
  readonly balanceDisplay: Locator;
  readonly confirmationModal: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.caseCard = page.locator('[data-testid="case-card"]');
    this.openCaseButton = page.locator('[data-testid="open-case-button"]');
    this.balanceDisplay = page.locator('[data-testid="balance-display"]');
    this.confirmationModal = page.locator('[data-testid="case-confirmation-modal"]');
    this.confirmButton = this.confirmationModal.getByRole('button', { name: /open case/i });
    this.cancelButton = this.confirmationModal.getByRole('button', { name: /cancel/i });
  }

  async goto() {
    await this.page.goto('/case-opening');
    await this.page.waitForLoadState('networkidle');
  }

  async selectCase(index: number = 0) {
    await this.caseCard.nth(index).click();
  }

  async openCase(index: number = 0) {
    await this.selectCase(index);
    await this.confirmButton.click();
  }

  async cancelCaseOpening() {
    await this.cancelButton.click();
  }

  async getBalance() {
    const balanceText = await this.balanceDisplay.textContent();
    if (!balanceText) return 0;
    return parseInt(balanceText.replace(/\D/g, '')) || 0;
  }

  async waitForCaseToOpen() {
    await this.page.waitForTimeout(5000); // Wait for animation to complete
  }

  async getOpenedItem() {
    return await this.page.locator('[data-testid="opened-item"]').textContent();
  }
}

