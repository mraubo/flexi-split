import { Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

export class RegisterPage extends BasePage {
  // Locators
  readonly formRegister: Locator = this.page.locator('[data-testid="form-register"]');
  readonly inputEmail: Locator = this.page.locator('[data-testid="input-email"]');
  readonly inputPassword: Locator = this.page.locator('[data-testid="input-password"]');
  readonly inputConfirmPassword: Locator = this.page.locator('[data-testid="input-confirm-password"]');
  readonly buttonSubmit: Locator = this.page.locator('[data-testid="button-submit"]');
  readonly alertSuccess: Locator = this.page.locator('[data-testid="alert-success"]');
  readonly alertError: Locator = this.page.locator('[data-testid="alert-error"]');
  readonly textCountdown: Locator = this.page.locator('[data-testid="text-countdown"]');
  readonly buttonSkipCountdown: Locator = this.page.locator('[data-testid="button-skip-countdown"]');
  readonly linkLogin: Locator = this.page.locator('[data-testid="link-login"]');
  readonly errorEmail: Locator = this.page.locator('[data-testid="error-email"]');
  readonly errorPassword: Locator = this.page.locator('[data-testid="error-password"]');
  readonly errorConfirmPassword: Locator = this.page.locator('[data-testid="error-confirm-password"]');

  // Navigation
  async goto() {
    await this.page.goto("/auth/register");
    await this.waitForLoad();
  }

  // Form interactions
  async fillEmail(email: string) {
    await this.inputEmail.fill(email);
  }

  async fillPassword(password: string) {
    await this.inputPassword.fill(password);
  }

  async fillConfirmPassword(password: string) {
    await this.inputConfirmPassword.fill(password);
  }

  async submit() {
    await this.buttonSubmit.click();
  }

  // Complete registration flow
  async register(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.fillConfirmPassword(password);
    await this.submit();
  }

  async skipCountdown() {
    if (await this.buttonSkipCountdown.isVisible()) {
      await this.buttonSkipCountdown.click();
    }
  }

  // Assertions helpers
  async isSuccessVisible(): Promise<boolean> {
    return await this.alertSuccess.isVisible().catch(() => false);
  }

  async getErrorMessage(): Promise<string | null> {
    const isVisible = await this.alertError.isVisible().catch(() => false);
    if (isVisible) {
      return await this.alertError.textContent();
    }
    return null;
  }

  async isFormVisible(): Promise<boolean> {
    return await this.formRegister.isVisible();
  }

  async isEmailErrorVisible(): Promise<boolean> {
    return await this.errorEmail.isVisible().catch(() => false);
  }

  async isPasswordErrorVisible(): Promise<boolean> {
    return await this.errorPassword.isVisible().catch(() => false);
  }

  async isConfirmPasswordErrorVisible(): Promise<boolean> {
    return await this.errorConfirmPassword.isVisible().catch(() => false);
  }

  async isSubmitButtonEnabled(): Promise<boolean> {
    return await this.buttonSubmit.isEnabled();
  }
}
