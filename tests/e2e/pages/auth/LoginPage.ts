import type { Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

export class LoginPage extends BasePage {
  // Locators
  readonly formLogin: Locator = this.page.locator('[data-testid="form-login"]');
  readonly inputEmail: Locator = this.page.locator('[data-testid="input-email"]');
  readonly inputPassword: Locator = this.page.locator('[data-testid="input-password"]');
  readonly buttonSubmit: Locator = this.page.locator('[data-testid="button-submit"]');
  readonly alertError: Locator = this.page.locator('[data-testid="alert-error"]');
  readonly errorEmail: Locator = this.page.locator('[data-testid="error-email"]');
  readonly errorPassword: Locator = this.page.locator('[data-testid="error-password"]');
  readonly linkForgotPassword: Locator = this.page.locator('[data-testid="link-forgot-password"]');
  readonly linkRegister: Locator = this.page.locator('[data-testid="link-register"]');

  // Navigation
  async goto() {
    await this.page.goto("/auth/login");
    await this.waitForLoad();
  }

  // Form interactions
  async fillEmail(email: string) {
    await this.inputEmail.fill(email);
  }

  async fillPassword(password: string) {
    await this.inputPassword.fill(password);
  }

  async submit() {
    await this.buttonSubmit.click();
  }

  // Complete login flow
  async login(email: string, password: string) {
    // Wait for form to be fully hydrated (client:idle needs more time)
    await this.buttonSubmit.waitFor({ state: "visible" });
    await this.page.waitForTimeout(1000); // Extra wait for React hydration with client:idle

    await this.fillEmail(email);
    await this.page.waitForTimeout(200);
    await this.fillPassword(password);
    await this.page.waitForTimeout(200);
    await this.submit();
  }

  // Assertions helpers
  async getErrorMessage(): Promise<string | null> {
    const isVisible = await this.alertError.isVisible();
    if (isVisible) {
      return await this.alertError.textContent();
    }
    return null;
  }

  async isFormVisible(): Promise<boolean> {
    return await this.formLogin.isVisible();
  }

  async isEmailErrorVisible(): Promise<boolean> {
    return await this.errorEmail.isVisible();
  }

  async isPasswordErrorVisible(): Promise<boolean> {
    return await this.errorPassword.isVisible();
  }

  async isSubmitButtonEnabled(): Promise<boolean> {
    return await this.buttonSubmit.isEnabled();
  }
}
