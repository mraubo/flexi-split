import type { Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

export class SummaryPage extends BasePage {
  // Locators
  readonly pageSummary: Locator = this.page.locator('[data-testid="page-summary"]');
  readonly sectionBalances: Locator = this.page.locator('[data-testid="section-balances"]');
  readonly sectionTransfers: Locator = this.page.locator('[data-testid="section-transfers"]');
  readonly buttonCloseSettlement: Locator = this.page.locator('[data-testid="button-close-settlement"]');
  readonly buttonCopySummary: Locator = this.page.locator('[data-testid="button-copy-summary"]');

  // Balance interactions
  async getBalanceItem(participantId: string): Promise<Locator> {
    return this.page.locator(`[data-testid="balance-item-${participantId}"]`);
  }

  async getBalanceValue(participantId: string): Promise<string> {
    const balanceItem = await this.getBalanceItem(participantId);
    const balanceText = balanceItem.locator(`[data-testid="text-balance-${participantId}"]`);
    return (await balanceText.textContent()) || "";
  }

  async getBalancesCount(): Promise<number> {
    return await this.page.locator('[data-testid^="balance-item-"]').count();
  }

  // Transfer interactions
  async getTransferItem(index: number): Promise<Locator> {
    return this.page.locator(`[data-testid="transfer-item-${index}"]`);
  }

  async getTransferInfo(index: number): Promise<string> {
    const transferItem = await this.getTransferItem(index);
    const infoText = transferItem.locator('[data-testid="text-transfer-info"]');
    return (await infoText.textContent()) || "";
  }

  async getTransfersCount(): Promise<number> {
    return await this.page.locator('[data-testid^="transfer-item-"]').count();
  }

  async copyTransfer(index: number) {
    const button = this.page.locator(`[data-testid="button-copy-transfer-${index}"]`);
    await button.click();
    await this.page.waitForTimeout(200);
  }

  // Settlement close interactions
  async closeSettlement() {
    await this.buttonCloseSettlement.click();
    // Wait for modal to appear
    await this.page.waitForSelector('[data-testid="dialog-confirm-close"]', { timeout: 5000 });
  }

  async copySummary() {
    await this.buttonCopySummary.click();
    await this.page.waitForTimeout(200);
  }

  // Assertions helpers
  async isPageVisible(): Promise<boolean> {
    return await this.pageSummary.isVisible();
  }

  async isBalancesSectionVisible(): Promise<boolean> {
    return await this.sectionBalances.isVisible().catch(() => false);
  }

  async isTransfersSectionVisible(): Promise<boolean> {
    return await this.sectionTransfers.isVisible().catch(() => false);
  }

  async isCloseSettlementButtonVisible(): Promise<boolean> {
    return await this.buttonCloseSettlement.isVisible().catch(() => false);
  }

  async isCopySummaryButtonVisible(): Promise<boolean> {
    return await this.buttonCopySummary.isVisible().catch(() => false);
  }
}
