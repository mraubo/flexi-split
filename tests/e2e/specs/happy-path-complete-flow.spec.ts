import { test, expect } from "@playwright/test";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { SettlementsListPage } from "../pages/settlements/SettlementsListPage";
import { SettlementDetailsPage } from "../pages/settlements/SettlementDetailsPage";
import { NewSettlementDialog } from "../pages/settlements/components/NewSettlementDialog";
import { ParticipantsPage } from "../pages/participants/ParticipantsPage";
import { ExpenseFormPage } from "../pages/expenses/ExpenseFormPage";
import { ExpensesPage } from "../pages/expenses/ExpensesPage";
import { SummaryPage } from "../pages/summary/SummaryPage";
import { ConfirmCloseDialog } from "../pages/summary/components/ConfirmCloseDialog";

test.describe("Happy Path - Complete Settlement Flow", () => {
  const settlementTitle = "Wycieczka do Warszawy";
  const participants = ["jan_kowalski", "anna_nowak", "piotr_wisniewski"];

  test("should complete full settlement lifecycle successfully", async ({ page }) => {
    test.setTimeout(60000); // 1 minute for this long test

    // Generate dynamic credentials
    const timestamp = Date.now();
    const email = `testuser${timestamp}@test.local`;
    const password = `TestPassword${timestamp}!`;

    // ==================== STEP 1: REGISTRATION ====================
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await expect(registerPage.formRegister).toBeVisible();

    // Wait for React hydration
    await page.waitForTimeout(1000);

    // Fill login form - type slowly to ensure React captures the changes
    const emailInput = page.locator('[data-testid="input-email"]');
    const passwordInput = page.locator('[data-testid="input-password"]');
    const confirmPasswordInput = page.locator('[data-testid="input-confirm-password"]');

    await emailInput.click();
    await emailInput.fill("");
    await page.keyboard.type(email, { delay: 50 });

    await passwordInput.click();
    await passwordInput.fill("");
    await page.keyboard.type(password, { delay: 50 });

    await confirmPasswordInput.click();
    await confirmPasswordInput.fill("");
    await page.keyboard.type(password, { delay: 50 });

    await page.waitForTimeout(500);

    // Submit and wait for navigation
    await page.locator('[data-testid="button-submit"]').click();
    await page.waitForTimeout(2000);

    // Check for registration errors
    const errorAlert = page.locator('[data-testid="alert-error"]');
    if (await errorAlert.isVisible()) {
      const errorText = await errorAlert.textContent();
      throw new Error(`Registration failed: ${errorText}`);
    }

    // Skip countdown if visible
    const skipButton = page.locator('[data-testid="button-skip-countdown"]');
    if (await skipButton.isVisible()) {
      await skipButton.click();
    }

    await page.waitForURL(/\/settlements/, { timeout: 15000 });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // ==================== STEP 2: CREATE SETTLEMENT ====================
    const settlementsPage = new SettlementsListPage(page);

    // Wait for the new settlement button to be visible instead of page container
    await expect(settlementsPage.buttonNewSettlement).toBeVisible({ timeout: 10000 });

    // Click new settlement button
    await settlementsPage.buttonNewSettlement.click();

    // Fill and submit the dialog
    const dialog = new NewSettlementDialog(page);
    await expect(dialog.dialog).toBeVisible();

    await dialog.fillTitle(settlementTitle);
    await expect(dialog.buttonCreate).toBeEnabled();

    await dialog.submit();

    // Verify we're on settlement details page
    await expect(page).toHaveURL(/\/settlements\/[a-f0-9-]+/);

    // Extract settlement ID
    const url = page.url();
    const match = url.match(/\/settlements\/([a-f0-9-]+)/);
    const settlementId = match ? match[1] : "";
    expect(settlementId).toBeTruthy();

    // Reload page to ensure settlement details are loaded
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    // Verify settlement details
    const detailsPage = new SettlementDetailsPage(page);
    const title = await detailsPage.getTitle();
    expect(title).toBe(settlementTitle);
    expect(await detailsPage.getStatus()).toContain("Otwarte");

    // ==================== STEP 3: ADD PARTICIPANTS ====================
    const participantsPage = new ParticipantsPage(page);

    // Navigate to participants step
    await detailsPage.goToStep("participants");

    // Add first participant (will open dialog)
    await participantsPage.addParticipant(participants[0]);
    let count = await participantsPage.getParticipantsCount();
    expect(count).toBe(2); // owner + 1 added

    // Add second participant
    await participantsPage.addParticipant(participants[1]);
    count = await participantsPage.getParticipantsCount();
    expect(count).toBe(3); // owner + 2 added

    // Add third participant
    await participantsPage.addParticipant(participants[2]);
    count = await participantsPage.getParticipantsCount();
    expect(count).toBe(4); // owner + 3 added

    // Verify participants are listed
    const headingText = await participantsPage.getParticipantsHeadingText();
    expect(headingText).toContain("4");

    // ==================== STEP 4: ADD EXPENSES ====================
    const expenseFormPage = new ExpenseFormPage(page);
    const expensesPage = new ExpensesPage(page);

    // Navigate to expenses step
    await detailsPage.goToStep("expenses");
    await page.waitForTimeout(500);

    // ====== EXPENSE 1: Equal split among all participants ======
    await expenseFormPage.gotoNew(settlementId);
    await expect(expenseFormPage.formExpense).toBeVisible({ timeout: 5000 });

    // Verify we have checkboxes for participants
    const participantCheckboxes = await page.locator('[data-testid^="checkbox-participant-"]').count();
    expect(participantCheckboxes).toBeGreaterThan(0);

    // Fill expense form
    await page.waitForTimeout(500); // Wait for form to be fully interactive
    await expenseFormPage.fillAmount("150");
    await page.waitForTimeout(300);
    await expenseFormPage.selectPayerByValue(participants[0]); // jan_kowalski pays
    await page.waitForTimeout(300);

    // Check if select-all button is enabled before clicking
    const selectAllButtonEnabled = await expenseFormPage.buttonSelectAll.isEnabled();
    if (selectAllButtonEnabled) {
      await expenseFormPage.selectAllParticipants();
      await page.waitForTimeout(300);
    }

    await expenseFormPage.fillDescription("Paliwo");

    await expect(expenseFormPage.buttonSave).toBeEnabled();
    await expenseFormPage.submit();

    // Wait for redirect back to expenses
    await expect(page).toHaveURL(/.*\?step=expenses/, { timeout: 5000 });
    await page.waitForTimeout(1000);

    // Verify we're back in expenses view - wait for at least one expense card to appear
    await expect(page.locator('[data-testid^="card-expense-"]').first()).toBeVisible({ timeout: 5000 });
    let expenseCount = await expensesPage.getExpensesCount();
    expect(expenseCount).toBeGreaterThan(0);

    // ====== EXPENSE 2: Equal split among all participants ======
    await expenseFormPage.gotoNew(settlementId);
    await expect(expenseFormPage.formExpense).toBeVisible({ timeout: 5000 });

    // Fill expense form
    await page.waitForTimeout(500); // Wait for form to be fully interactive
    await expenseFormPage.fillAmount("200,50");
    await page.waitForTimeout(300);
    await expenseFormPage.selectPayerByValue(participants[1]); // anna_nowak pays
    await page.waitForTimeout(300);

    // Check if select-all button is enabled before clicking
    const selectAllButtonEnabled2 = await expenseFormPage.buttonSelectAll.isEnabled();
    if (selectAllButtonEnabled2) {
      await expenseFormPage.selectAllParticipants();
      await page.waitForTimeout(300);
    }

    await expenseFormPage.fillDescription("Noclegi");

    await expect(expenseFormPage.buttonSave).toBeEnabled();
    await expenseFormPage.submit();

    await expect(page).toHaveURL(/.*\?step=expenses/, { timeout: 5000 });
    await page.waitForTimeout(1000);

    // Verify we have expenses now - wait for expense cards to be visible
    await expect(page.locator('[data-testid^="card-expense-"]').first()).toBeVisible({ timeout: 5000 });
    expenseCount = await expensesPage.getExpensesCount();
    expect(expenseCount).toBeGreaterThanOrEqual(2);

    // ==================== STEP 5: CLOSE SETTLEMENT ====================
    const summaryPage = new SummaryPage(page);

    // Navigate to summary step
    await detailsPage.goToStep("summary");
    await expect(summaryPage.pageSummary).toBeVisible();

    // Close settlement
    await summaryPage.closeSettlement();

    // Confirm close in modal
    const closeDialog = new ConfirmCloseDialog(page);
    await expect(closeDialog.dialog).toBeVisible();

    const settlementTitleInModal = await closeDialog.getSettlementTitle();
    expect(settlementTitleInModal).toBe(settlementTitle);

    // Confirm
    await closeDialog.confirm();

    // Wait for dialog to close and page to update
    await page.waitForTimeout(1000);

    // Reload the page to ensure we have the latest settlement state with snapshot
    await page.reload();

    // Wait for page to fully load after reload
    await page.waitForLoadState("networkidle");
    await page.waitForLoadState("domcontentloaded");

    // Verify settlement is now closed
    const status = await detailsPage.getStatus();
    expect(status).toContain("Zamknięte");

    // Verify readonly banner is visible
    const isReadOnly = await detailsPage.isReadOnly();
    expect(isReadOnly).toBe(true);

    // ==================== STEP 6: VERIFY ARCHIVE & READONLY MODE ====================
    // Navigate back to settlements list
    await settlementsPage.goto();
    await page.waitForTimeout(500);

    // Switch to archive tab
    const archiveTab = page.locator('[data-testid="tab-archive"]');
    await expect(archiveTab).toBeVisible();
    await archiveTab.click();
    await page.waitForTimeout(500);

    // Verify closed settlement appears in archive
    const archivedSettlementsCount = await page.locator('[data-testid^="card-settlement-"]').count();
    expect(archivedSettlementsCount).toBeGreaterThan(0);

    // Click on archived settlement to verify readonly mode
    const archivedCard = page.locator('[data-testid^="card-settlement-"]').first();

    // Click the card or view button
    const viewButton = archivedCard.locator('[data-testid="button-view"]').first();
    if (await viewButton.isVisible().catch(() => false)) {
      await viewButton.click();
    } else {
      await archivedCard.click();
    }

    // Wait for navigation
    await page.waitForURL(/\/settlements\//, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await page.waitForLoadState("domcontentloaded");

    // Verify readonly mode
    const isReadOnlyArchive = await detailsPage.isReadOnly();
    expect(isReadOnlyArchive).toBe(true);

    // Verify settlement status is closed
    const statusArchive = await detailsPage.getStatus();
    expect(statusArchive).toContain("Zamknięte");

    // Note: Participant form is still visible but disabled in readonly mode
    // The important thing is that the settlement is closed and readonly banner is visible

    // ==================== STEP 7: LOGOUT ====================
    const logoutButton = page.locator('[data-testid="button-logout"]');

    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await expect(page).toHaveURL(/\/auth\/login/);
    }
  });
});
