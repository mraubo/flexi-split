import { Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

export class ParticipantsPage extends BasePage {
  // Locators
  readonly formParticipant: Locator = this.page.locator('[data-testid="form-participant"]');
  readonly inputNickname: Locator = this.page.locator('[data-testid="input-nickname"]');
  readonly buttonAddParticipant: Locator = this.page.locator('[data-testid="button-add-participant"]');
  readonly textValidationError: Locator = this.page.locator('[data-testid="text-validation-error"]');
  readonly listParticipants: Locator = this.page.locator('[data-testid="list-participants"]');
  readonly headingParticipants: Locator = this.page.locator('[data-testid="heading-participants"]');

  // Form interactions
  async fillNickname(nickname: string) {
    await this.inputNickname.fill(nickname);
  }

  async submitParticipant() {
    await this.buttonAddParticipant.click();
  }

  // Complete add participant flow
  async addParticipant(nickname: string) {
    // Wait for form to be fully hydrated (similar to auth forms)
    await this.buttonAddParticipant.waitFor({ state: "visible" });
    await this.page.waitForTimeout(500); // Extra wait for React hydration

    // Get current count before adding
    const countBefore = await this.getParticipantsCount();

    await this.fillNickname(nickname);
    await this.page.waitForTimeout(100);
    await this.submitParticipant();

    // Wait for the new participant to appear in the list (count should increase)
    await this.page.waitForFunction(
      (expectedCount) => {
        const items = document.querySelectorAll('[data-testid^="participant-item-"]');
        return items.length === expectedCount;
      },
      countBefore + 1,
      { timeout: 3000 }
    );

    // Extra wait for form to fully reset
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

  // Assertions helpers
  async hasValidationError(): Promise<boolean> {
    return await this.textValidationError.isVisible().catch(() => false);
  }

  async getValidationErrorText(): Promise<string | null> {
    if (await this.hasValidationError()) {
      return await this.textValidationError.textContent();
    }
    return null;
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
