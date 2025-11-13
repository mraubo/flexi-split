import type { Locator } from "@playwright/test";
import { BasePage } from "../BasePage";
import { AddParticipantDialog } from "./components/AddParticipantDialog";

export class ParticipantsPage extends BasePage {
  // Locators
  readonly buttonAddParticipant: Locator = this.page.locator('[data-testid="button-add-participant"]');
  readonly buttonAddFirstParticipant: Locator = this.page.locator('[data-testid="button-add-first-participant"]');
  readonly listParticipants: Locator = this.page.locator('[data-testid="list-participants"]');
  readonly headingParticipants: Locator = this.page.locator('[data-testid="heading-participants"]');

  // Dialog helper
  getAddParticipantDialog(): AddParticipantDialog {
    return new AddParticipantDialog(this.page);
  }

  // Open dialog (handles both empty state and normal state)
  async openAddParticipantDialog(): Promise<AddParticipantDialog> {
    const dialog = this.getAddParticipantDialog();

    // Check which button is visible and click it
    const isEmptyState = await this.buttonAddFirstParticipant.isVisible().catch(() => false);

    if (isEmptyState) {
      await this.buttonAddFirstParticipant.click();
    } else {
      await this.buttonAddParticipant.click();
    }

    // Wait for dialog to open
    await dialog.dialog.waitFor({ state: "visible", timeout: 3000 });

    return dialog;
  }

  // Complete add participant flow with dialog
  async addParticipant(nickname: string) {
    // Get current count before adding
    const countBefore = await this.getParticipantsCount();

    // Open dialog
    const dialog = await this.openAddParticipantDialog();

    // Fill and submit via dialog
    await dialog.addParticipant(nickname);

    // Wait for the new participant to appear in the list (count should increase)
    await this.page.waitForFunction(
      (expectedCount) => {
        const items = document.querySelectorAll('[data-testid^="participant-item-"]');
        return items.length === expectedCount;
      },
      countBefore + 1,
      { timeout: 3000 }
    );

    // Extra wait for UI to settle
    await this.page.waitForTimeout(300);
  }

  async getParticipantItem(id: string): Promise<Locator> {
    return this.page.locator(`[data-testid="participant-item-${id}"]`);
  }

  async getParticipantsCount(): Promise<number> {
    return await this.page.locator('[data-testid^="participant-item-"]').count();
  }

  async deleteParticipant(id: string) {
    const deleteButton = this.page.locator(
      `[data-testid="participant-item-${id}"] [data-testid="button-delete-participant"]`
    );
    await deleteButton.click();
  }

  async getParticipantsHeadingText(): Promise<string> {
    return (await this.headingParticipants.textContent()) || "";
  }

  async getParticipantNickname(id: string): Promise<string> {
    const item = await this.getParticipantItem(id);
    const nicknameElement = item.locator('[data-testid="text-participant-nickname"]');
    return (await nicknameElement.textContent()) || "";
  }

  async isParticipantOwner(id: string): Promise<boolean> {
    const item = await this.getParticipantItem(id);
    const ownerBadge = item.locator('[data-testid="badge-owner"]');
    return await ownerBadge.isVisible().catch(() => false);
  }
}
