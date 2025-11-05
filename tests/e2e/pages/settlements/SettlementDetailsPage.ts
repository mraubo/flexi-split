import type { Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

export class SettlementDetailsPage extends BasePage {
  // Locators
  readonly headingSettlementTitle: Locator = this.page.locator('[data-testid="heading-settlement-title"]');
  readonly inputSettlementTitle: Locator = this.page.locator('[data-testid="input-settlement-title"]');
  readonly buttonEditTitle: Locator = this.page.locator('[data-testid="button-edit-title"]');
  readonly buttonSaveTitle: Locator = this.page.locator('[data-testid="button-save-title"]');
  readonly buttonCancelEdit: Locator = this.page.locator('[data-testid="button-cancel-edit"]');
  readonly badgeStatus: Locator = this.page.locator('[data-testid="badge-status"]');
  readonly textParticipantsCount: Locator = this.page.locator('[data-testid="text-participants-count"]');
  readonly textExpensesCount: Locator = this.page.locator('[data-testid="text-expenses-count"]');
  readonly navStepper: Locator = this.page.locator('[data-testid="nav-stepper"]');
  readonly buttonStepParticipants: Locator = this.page.locator('[data-testid="button-step-participants"]');
  readonly buttonStepExpenses: Locator = this.page.locator('[data-testid="button-step-expenses"]');
  readonly buttonStepSummary: Locator = this.page.locator('[data-testid="button-step-summary"]');

  // Navigation
  async goto(settlementId: string) {
    await this.page.goto(`/settlements/${settlementId}`);
    await this.waitForLoad();
  }

  async gotoWithStep(settlementId: string, step: "participants" | "expenses" | "summary") {
    await this.page.goto(`/settlements/${settlementId}?step=${step}`);
    await this.waitForLoad();
  }

  // Title editing
  async editTitle(newTitle: string) {
    await this.buttonEditTitle.click();
    await this.inputSettlementTitle.fill(newTitle);
    await this.buttonSaveTitle.click();
    await this.page.waitForTimeout(300);
  }

  // Navigation to steps
  async goToStep(step: "participants" | "expenses" | "summary") {
    const button =
      step === "participants"
        ? this.buttonStepParticipants
        : step === "expenses"
          ? this.buttonStepExpenses
          : this.buttonStepSummary;

    await button.click();
    await this.page.waitForTimeout(300);
  }

  // Assertions helpers
  async getTitle(): Promise<string> {
    // Try reading title heading first, then input if editing
    try {
      const heading = await this.headingSettlementTitle.isVisible();
      if (heading) {
        return (await this.headingSettlementTitle.textContent()) || "";
      }
    } catch {
      // If not visible, try input
    }
    return await this.inputSettlementTitle.inputValue();
  }

  async getStatus(): Promise<string> {
    return (await this.badgeStatus.textContent()) || "";
  }

  async getParticipantsCount(): Promise<number> {
    const text = (await this.textParticipantsCount.textContent()) || "";
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  async getExpensesCount(): Promise<number> {
    const text = (await this.textExpensesCount.textContent()) || "";
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  async isReadOnly(): Promise<boolean> {
    // Check if readonly banner is visible
    const banner = this.page.locator('[data-testid="banner-readonly"]');
    return await banner.isVisible().catch(() => false);
  }

  async isParticipantsFormVisible(): Promise<boolean> {
    const form = this.page.locator('[data-testid="form-participant"]');
    return await form.isVisible().catch(() => false);
  }

  async isExpenseFormVisible(): Promise<boolean> {
    const form = this.page.locator('[data-testid="form-expense"]');
    return await form.isVisible().catch(() => false);
  }
}
