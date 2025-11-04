import { Locator, Page } from "@playwright/test";

export class ConfirmCloseDialog {
  readonly dialog: Locator;
  readonly textSettlementTitle: Locator;
  readonly textExpenseCount: Locator;
  readonly textCreatedDate: Locator;
  readonly boxWarning: Locator;
  readonly buttonCancel: Locator;
  readonly buttonClose: Locator;

  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('[data-testid="dialog-confirm-close"]');
    this.textSettlementTitle = page.locator('[data-testid="text-settlement-title"]');
    this.textExpenseCount = page.locator('[data-testid="text-expense-count"]');
    this.textCreatedDate = page.locator('[data-testid="text-created-date"]');
    this.boxWarning = page.locator('[data-testid="box-warning"]');
    this.buttonCancel = page.locator('[data-testid="dialog-confirm-close"] [data-testid="button-cancel"]');
    this.buttonClose = page.locator('[data-testid="dialog-confirm-close"] [data-testid="button-close"]');
  }

  async confirm() {
    await this.buttonClose.click();
    // Wait for dialog to close
    await this.page.waitForSelector('[data-testid="dialog-confirm-close"]', { state: "hidden", timeout: 5000 });
  }

  async cancel() {
    await this.buttonCancel.click();
  }

  async isOpen(): Promise<boolean> {
    return await this.dialog.isVisible().catch(() => false);
  }

  async getSettlementTitle(): Promise<string> {
    return (await this.textSettlementTitle.textContent()) || "";
  }

  async getExpenseCount(): Promise<string> {
    return (await this.textExpenseCount.textContent()) || "";
  }

  async getCreatedDate(): Promise<string> {
    return (await this.textCreatedDate.textContent()) || "";
  }
}
