import type { Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

export class SettlementsListPage extends BasePage {
  // Locators
  readonly pageContainer: Locator = this.page.locator('[data-testid="settlements-page"]');
  readonly listSettlements: Locator = this.page.locator('[data-testid="list-settlements"]');
  readonly buttonLoadMore: Locator = this.page.locator('[data-testid="button-load-more"]');
  readonly buttonNewSettlement: Locator = this.page.locator('[data-testid="button-new-settlement"]');

  // Navigation
  async goto() {
    await this.page.goto("/settlements");
    await this.waitForLoad();
  }

  // Actions
  async getSettlementsCount(): Promise<number> {
    return await this.listSettlements.locator('[data-testid^="card-settlement-"]').count();
  }

  async getSettlementCard(index: number) {
    return this.listSettlements.locator('[data-testid^="card-settlement-"]').nth(index);
  }

  async loadMore() {
    if (await this.buttonLoadMore.isVisible()) {
      await this.buttonLoadMore.click();
      await this.page.waitForTimeout(500); // Wait for new items to load
    }
  }

  // Assertions helpers
  async isSettlementsListVisible(): Promise<boolean> {
    return await this.listSettlements.isVisible();
  }

  async hasLoadMoreButton(): Promise<boolean> {
    return await this.buttonLoadMore.isVisible().catch(() => false);
  }

  async getFirstSettlementTitle(): Promise<string | null> {
    const firstCard = await this.getSettlementCard(0);
    const title = firstCard.locator('h3, [data-testid*="title"]').first();
    return await title.textContent().catch(() => null);
  }
}
