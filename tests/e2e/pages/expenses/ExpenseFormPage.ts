import { Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

export interface ExpenseData {
  amount: string;
  payerId: string;
  participantIds: string[];
  date?: string;
  description?: string;
}

export class ExpenseFormPage extends BasePage {
  // Locators
  readonly formExpense: Locator = this.page.locator('[data-testid="form-expense"]');
  readonly inputAmount: Locator = this.page.locator('[data-testid="input-amount"]');
  readonly selectPayer: Locator = this.page.locator('[data-testid="select-payer"]');
  readonly groupParticipants: Locator = this.page.locator('[data-testid="group-participants"]');
  readonly buttonSelectAll: Locator = this.page.locator('[data-testid="button-select-all"]');
  readonly buttonDeselectAll: Locator = this.page.locator('[data-testid="button-deselect-all"]');
  readonly inputDate: Locator = this.page.locator('[data-testid="input-date"]');
  readonly textareaDescription: Locator = this.page.locator('[data-testid="textarea-description"]');
  readonly componentSharePreview: Locator = this.page.locator('[data-testid="component-share-preview"]');
  readonly buttonSave: Locator = this.page.locator('[data-testid="button-save"]');
  readonly buttonCancel: Locator = this.page.locator('[data-testid="button-cancel"]');

  // Navigation
  async gotoNew(settlementId: string) {
    await this.page.goto(`/settlements/${settlementId}/expenses/new`);
    await this.waitForLoad();
  }

  async gotoEdit(settlementId: string, expenseId: string) {
    await this.page.goto(`/settlements/${settlementId}/expenses/${expenseId}/edit`);
    await this.waitForLoad();
  }

  // Form field interactions
  async fillAmount(amount: string) {
    await this.inputAmount.fill(amount);
  }

  async selectPayerByValue(payerNickname: string) {
    await this.selectPayer.click();
    // Find option by text content (nickname) instead of ID
    const option = this.page.locator(`[role="option"]:has-text("${payerNickname}")`).first();
    await option.waitFor({ state: "visible", timeout: 5000 });
    await option.click();
  }

  async toggleParticipant(participantId: string) {
    const checkbox = this.page.locator(`[data-testid="checkbox-participant-${participantId}"]`);
    await checkbox.click();
  }

  async selectAllParticipants() {
    await this.buttonSelectAll.click();
  }

  async deselectAllParticipants() {
    await this.buttonDeselectAll.click();
  }

  async fillDate(date: string) {
    await this.inputDate.fill(date);
  }

  async fillDescription(description: string) {
    await this.textareaDescription.fill(description);
  }

  // Complete form submission
  async createExpense(data: ExpenseData) {
    await this.fillAmount(data.amount);
    await this.selectPayerByValue(data.payerId);

    // Select participants
    for (const participantId of data.participantIds) {
      await this.toggleParticipant(participantId);
    }

    if (data.date) {
      await this.fillDate(data.date);
    }

    if (data.description) {
      await this.fillDescription(data.description);
    }

    await this.submit();
  }

  async submit() {
    await this.buttonSave.click();
    // Wait for navigation after save
    await this.page.waitForURL(/.*expenses/, { timeout: 5000 });
  }

  async cancel() {
    await this.buttonCancel.click();
  }

  // Assertions helpers
  async getSharePreviewText(): Promise<string> {
    return (await this.componentSharePreview.textContent()) || "";
  }

  async isFormValid(): Promise<boolean> {
    return await this.buttonSave.isEnabled();
  }

  async getSelectedParticipantsCount(): Promise<number> {
    const checkedCheckboxes = await this.page.locator('[data-testid^="checkbox-participant-"]:checked').count();
    return checkedCheckboxes;
  }
}
