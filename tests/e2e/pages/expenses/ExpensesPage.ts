import { Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

export class ExpensesPage extends BasePage {
  // Locators
  readonly tabsExpensesView: Locator = this.page.locator('[data-testid="tabs-expenses-view"]');
  readonly tabParticipants: Locator = this.page.locator('[data-testid="tab-participants"]');
  readonly tabExpenses: Locator = this.page.locator('[data-testid="tab-expenses"]');
  readonly filterBar: Locator = this.page.locator('[data-testid="filter-bar"]');
  readonly selectFilterParticipant: Locator = this.page.locator('[data-testid="select-filter-participant"]');
  readonly buttonClearFilter: Locator = this.page.locator('[data-testid="button-clear-filter"]');
  readonly listExpenses: Locator = this.page.locator('[data-testid="list-expenses"]');
  readonly buttonLoadMore: Locator = this.page.locator('[data-testid="button-load-more"]');

  // Navigation & Tab switching
  async switchToTab(tab: "participants" | "expenses") {
    const tabLocator = tab === "participants" ? this.tabParticipants : this.tabExpenses;
    await tabLocator.click();
    await this.page.waitForTimeout(300);
  }

  async filterByParticipant(participantId: string) {
    await this.selectFilterParticipant.click();
    const option = this.page.locator(`[data-testid="select-item-${participantId}"]`);
    await option.click();
  }

  async clearFilter() {
    if (await this.buttonClearFilter.isVisible()) {
      await this.buttonClearFilter.click();
      await this.page.waitForTimeout(300);
    }
  }

  // Expenses list interactions
  async getExpenseCard(index: number): Promise<Locator> {
    return this.page.locator('[data-testid^="card-expense-"]').nth(index);
  }

  async getExpensesCount(): Promise<number> {
    return await this.page.locator('[data-testid^="card-expense-"]').count();
  }

  async getExpensePayerNickname(index: number): Promise<string> {
    const card = await this.getExpenseCard(index);
    const payer = card.locator('[data-testid="text-payer-nickname"]');
    return (await payer.textContent()) || "";
  }

  async getExpenseAmount(index: number): Promise<string> {
    const card = await this.getExpenseCard(index);
    const amount = card.locator('[data-testid="text-amount"]');
    return (await amount.textContent()) || "";
  }

  async loadMore() {
    if (await this.buttonLoadMore.isVisible()) {
      await this.buttonLoadMore.click();
      await this.page.waitForTimeout(500);
    }
  }

  // Assertions helpers
  async isExpensesListVisible(): Promise<boolean> {
    return await this.listExpenses.isVisible().catch(() => false);
  }

  async hasLoadMoreButton(): Promise<boolean> {
    return await this.buttonLoadMore.isVisible().catch(() => false);
  }
}
