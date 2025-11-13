import type { Locator, Page } from "@playwright/test";

export class AddParticipantDialog {
  readonly dialog: Locator;
  readonly inputNickname: Locator;
  readonly buttonCancel: Locator;
  readonly buttonSubmit: Locator;
  readonly errorMessage: Locator;

  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('[data-testid="dialog-add-participant"]');
    this.inputNickname = page.locator('[data-testid="input-nickname"]');
    this.buttonCancel = page.locator('[data-testid="button-cancel-add-participant"]');
    this.buttonSubmit = page.locator('[data-testid="button-submit-add-participant"]');
    this.errorMessage = page.locator('[role="alert"]');
  }

  async fillNickname(nickname: string) {
    await this.inputNickname.fill(nickname);
  }

  async submit() {
    await this.buttonSubmit.click();
    // Wait for dialog to close (disappear)
    await this.dialog.waitFor({ state: "hidden", timeout: 3000 });
  }

  async cancel() {
    await this.buttonCancel.click();
    // Wait for dialog to close
    await this.dialog.waitFor({ state: "hidden", timeout: 3000 });
  }

  async addParticipant(nickname: string) {
    // Wait for dialog to be fully visible and interactive
    await this.dialog.waitFor({ state: "visible" });
    await this.page.waitForTimeout(200); // Wait for animations

    await this.fillNickname(nickname);
    await this.page.waitForTimeout(100); // Brief wait after typing
    await this.submit();
  }

  async isOpen(): Promise<boolean> {
    return await this.dialog.isVisible().catch(() => false);
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

  async isSubmitButtonEnabled(): Promise<boolean> {
    return await this.buttonSubmit.isEnabled();
  }
}
