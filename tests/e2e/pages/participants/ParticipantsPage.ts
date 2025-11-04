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
    await this.fillNickname(nickname);
    await this.submitParticipant();
    // Wait for the form to reset and the participant to appear in the list
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
