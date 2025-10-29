import { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  readonly welcomeMessage = this.page.locator('[data-testid="welcome-message"]');
  readonly newSettlementButton = this.page.locator('[data-testid="new-settlement-button"]');
  readonly settlementsList = this.page.locator('[data-testid="settlements-list"]');

  // Actions
  async clickNewSettlement() {
    await this.newSettlementButton.click();
  }

  async isWelcomeVisible() {
    return await this.welcomeMessage.isVisible();
  }

  async getSettlementsCount() {
    return await this.settlementsList.locator('[data-testid="settlement-card"]').count();
  }
}

