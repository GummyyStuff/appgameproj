/**
 * Stock Market Page Object Model
 * Encapsulates stock market trading interactions
 */

import { Page, Locator } from '@playwright/test';

export class StockMarketPage {
  readonly page: Page;
  readonly currentPrice: Locator;
  readonly sharesInput: Locator;
  readonly buyButton: Locator;
  readonly sellButton: Locator;
  readonly positionDisplay: Locator;
  readonly chart: Locator;
  readonly tradeHistory: Locator;

  constructor(page: Page) {
    this.page = page;
    this.currentPrice = page.locator('[data-testid="current-price"]');
    this.sharesInput = page.locator('input[type="number"]');
    this.buyButton = page.getByRole('button', { name: /buy/i });
    this.sellButton = page.getByRole('button', { name: /sell/i });
    this.positionDisplay = page.locator('[data-testid="position-display"]');
    this.chart = page.locator('[data-testid="price-chart"]');
    this.tradeHistory = page.locator('[data-testid="trade-history"]');
  }

  async goto() {
    await this.page.goto('/stock-market');
    await this.page.waitForLoadState('networkidle');
  }

  async setShares(amount: number) {
    await this.sharesInput.fill(amount.toString());
  }

  async buyShares(shares: number) {
    await this.setShares(shares);
    await this.buyButton.click();
  }

  async sellShares(shares: number) {
    await this.setShares(shares);
    await this.sellButton.click();
  }

  async getCurrentPrice() {
    const priceText = await this.currentPrice.textContent();
    if (!priceText) return 0;
    return parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
  }

  async getPosition() {
    const positionText = await this.positionDisplay.textContent();
    if (!positionText) return null;
    
    // Parse position info (format may vary)
    const sharesMatch = positionText.match(/(\d+)\s*shares/i);
    const avgPriceMatch = positionText.match(/\$\s*(\d+\.?\d*)/i);
    
    return {
      shares: sharesMatch ? parseInt(sharesMatch[1]) : 0,
      avgPrice: avgPriceMatch ? parseFloat(avgPriceMatch[1]) : 0
    };
  }

  async waitForPriceUpdate() {
    await this.page.waitForTimeout(2000); // Wait for price tick
  }
}

