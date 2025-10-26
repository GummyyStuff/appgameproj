/**
 * Dashboard Page Object Model
 * Represents the authenticated user dashboard
 */

import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly balanceDisplay: Locator;
  readonly profileButton: Locator;
  readonly gamesMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.balanceDisplay = page.locator('[data-testid="balance"]');
    this.profileButton = page.getByRole('button', { name: /profile|account/i });
    this.gamesMenu = page.getByRole('navigation').getByText(/games|casino/i);
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async getBalance(): Promise<string | null> {
    return await this.balanceDisplay.textContent();
  }

  async clickProfile() {
    await this.profileButton.click();
  }

  async navigateToGames() {
    await this.gamesMenu.click();
  }
}

