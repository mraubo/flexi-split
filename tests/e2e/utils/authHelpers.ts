import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { SettlementsListPage } from "../pages/settlements/SettlementsListPage";
import * as TestDataGenerator from "./testDataGenerator";

/**
 * Authentication helpers for E2E tests
 */

export async function registerAndLogin(
  page: Page,
  email?: string,
  password?: string
): Promise<{ email: string; password: string }> {
  const testEmail = email || TestDataGenerator.generateEmail();
  const testPassword = password || TestDataGenerator.generatePassword();

  const registerPage = new RegisterPage(page);
  await registerPage.goto();

  // Verify form is visible
  await expect(registerPage.formRegister).toBeVisible();

  // Register
  await registerPage.register(testEmail, testPassword);

  // Skip countdown if present
  await registerPage.skipCountdown();

  // Verify we're redirected to settlements page
  await expect(page).toHaveURL(/\/settlements/);

  return { email: testEmail, password: testPassword };
}

export async function loginAsExistingUser(page: Page, email: string, password: string): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  // Verify form is visible
  await expect(loginPage.formLogin).toBeVisible();

  // Login
  await loginPage.login(email, password);

  // Verify we're redirected to settlements page
  await expect(page).toHaveURL(/\/settlements/);
}

export async function logout(page: Page): Promise<void> {
  const logoutButton = page.locator('[data-testid="button-logout"]');

  // Check if logout button exists and is visible
  if (await logoutButton.isVisible().catch(() => false)) {
    await logoutButton.click();
    await expect(page).toHaveURL(/\/auth\/login/);
  }
}

export async function verifyUserIsLoggedIn(page: Page): Promise<boolean> {
  try {
    // If we're on settlements page, user is logged in
    const settlementsPage = new SettlementsListPage(page);
    await expect(settlementsPage.pageContainer).toBeVisible({ timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}
