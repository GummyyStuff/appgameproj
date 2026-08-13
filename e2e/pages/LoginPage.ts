/**
 * Login Page Object Model
 * Encapsulates authentication page interactions.
 * The development build exposes a test-login form (#test-email / #test-password).
 */

import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#test-email');
    this.passwordInput = page.locator('#test-password');
    this.submitButton = page.getByRole('button', { name: 'Test Login', exact: true });
    this.errorMessage = page.getByText(/invalid|incorrect|error|failed/i).first();
  }

  async goto() {
    await this.page.goto('/login', { waitUntil: 'domcontentloaded' });
    await this.emailInput.waitFor({ timeout: 15000 });
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async getErrorMessage() {
    return await this.errorMessage.textContent();
  }
}
