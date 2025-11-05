import type { Locator, Page } from "@playwright/test";

export class NewSettlementDialog {
  readonly dialog: Locator;
  readonly inputSettlementTitle: Locator;
  readonly textCharCount: Locator;
  readonly errorMessage: Locator;
  readonly buttonCancel: Locator;
  readonly buttonCreate: Locator;

  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('[data-testid="dialog-new-settlement"]');
    this.inputSettlementTitle = page.locator('[data-testid="input-settlement-title"]');
    this.textCharCount = page.locator('[data-testid="text-char-count"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.buttonCancel = page.locator('[data-testid="dialog-new-settlement"] [data-testid="button-cancel"]');
    this.buttonCreate = page.locator('[data-testid="dialog-new-settlement"] [data-testid="button-create"]');
  }

  async fillTitle(title: string) {
    await this.inputSettlementTitle.fill(title);
  }

  async submit() {
    await this.buttonCreate.click();
    // Wait for navigation after creation
    await this.page.waitForURL(/\/settlements\/[a-f0-9-]+/, { timeout: 5000 });
  }

  async cancel() {
    await this.buttonCancel.click();
  }

  async createSettlement(title: string) {
    await this.fillTitle(title);
    await this.submit();
  }

  async isOpen(): Promise<boolean> {
    return await this.dialog.isVisible().catch(() => false);
  }

  async getCharCount(): Promise<string> {
    return (await this.textCharCount.textContent()) || "";
  }

  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible().catch(() => false);
  }

  async getErrorText(): Promise<string | null> {
    if (await this.hasError()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  async isCreateButtonEnabled(): Promise<boolean> {
    return await this.buttonCreate.isEnabled();
  }
}
