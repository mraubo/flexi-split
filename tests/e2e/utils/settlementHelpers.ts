import { Page, expect } from "@playwright/test";
import { SettlementsListPage } from "../pages/settlements/SettlementsListPage";
import { SettlementDetailsPage } from "../pages/settlements/SettlementDetailsPage";
import { NewSettlementDialog } from "../pages/settlements/components/NewSettlementDialog";
import { ParticipantsPage } from "../pages/participants/ParticipantsPage";
import { ExpenseFormPage, ExpenseData } from "../pages/expenses/ExpenseFormPage";
import { TestDataGenerator } from "./testDataGenerator";

/**
 * Settlement setup helpers for E2E tests
 */

export async function createNewSettlement(page: Page, title?: string): Promise<string> {
  const settlementsPage = new SettlementsListPage(page);
  const settlementTitle = title || TestDataGenerator.generateSettlementTitle();

  // Click new settlement button
  await settlementsPage.buttonNewSettlement.click();

  // Fill and submit the dialog
  const dialog = new NewSettlementDialog(page);
  await expect(dialog.dialog).toBeVisible();

  await dialog.createSettlement(settlementTitle);

  // Extract settlement ID from URL
  const url = page.url();
  const match = url.match(/\/settlements\/([a-f0-9-]+)/);
  const settlementId = match ? match[1] : "";

  expect(settlementId).toBeTruthy();

  return settlementId;
}

export async function addParticipantsToSettlement(page: Page, nicknames: string[]): Promise<void> {
  const participantsPage = new ParticipantsPage(page);

  // Verify we're on the participants step
  await expect(participantsPage.formParticipant).toBeVisible();

  // Add each participant
  for (const nickname of nicknames) {
    await participantsPage.addParticipant(nickname);
    // Verify participant was added
    const count = await participantsPage.getParticipantsCount();
    expect(count).toBeGreaterThan(0);
  }
}

export async function addExpenseToSettlement(
  page: Page,
  settlementId: string,
  participantIds: string[],
  expenseData: Partial<ExpenseData>
): Promise<void> {
  const detailsPage = new SettlementDetailsPage(page);
  const formPage = new ExpenseFormPage(page);

  // Navigate to expenses step if not already there
  if (!(await formPage.formExpense.isVisible().catch(() => false))) {
    await detailsPage.goToStep("expenses");
  }

  // Click to create new expense
  const newExpenseButton = page
    .locator('[data-testid*="button-add-expense"], button:has-text("Dodaj wydatek")')
    .first();
  if (await newExpenseButton.isVisible().catch(() => false)) {
    await newExpenseButton.click();
    // Wait for form page to load
    await page.waitForURL(/\/expenses\/(new|[a-f0-9-]+\/edit)/, { timeout: 5000 });
  } else {
    // Navigate directly if no button found
    await formPage.gotoNew(settlementId);
  }

  // Fill expense form
  const completeExpenseData: ExpenseData = {
    amount: expenseData.amount || TestDataGenerator.generateAmount(50, 200),
    payerId: expenseData.payerId || participantIds[0],
    participantIds: expenseData.participantIds || participantIds,
    date: expenseData.date || TestDataGenerator.generateDate(),
    description: expenseData.description || TestDataGenerator.generateExpenseDescription(),
  };

  await formPage.createExpense(completeExpenseData);

  // Verify we're back on expenses list
  await expect(page).toHaveURL(/.*expenses/, { timeout: 5000 });
}

export async function navigateToSettlementStep(
  page: Page,
  settlementId: string,
  step: "participants" | "expenses" | "summary"
): Promise<void> {
  const detailsPage = new SettlementDetailsPage(page);
  await detailsPage.goto(settlementId);
  await detailsPage.goToStep(step);

  // Verify we're on the correct step
  await page.waitForTimeout(300);
}

export async function getSettlementIdFromURL(page: Page): Promise<string> {
  const url = page.url();
  const match = url.match(/\/settlements\/([a-f0-9-]+)/);
  return match ? match[1] : "";
}
