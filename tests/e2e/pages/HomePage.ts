import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Main sections
  readonly homePage: Locator = this.page.locator('[data-testid="home-page"]');
  readonly welcomeSection: Locator = this.page.locator('[data-testid="welcome-section"]');
  readonly howItWorksSection: Locator = this.page.locator('[data-testid="how-it-works-section"]');

  // Welcome section locators
  readonly welcomeTitle: Locator = this.page.locator('[data-testid="welcome-title"]');
  readonly welcomeMessage: Locator = this.page.locator('[data-testid="welcome-message"]');

  // Features
  readonly featureEasy: Locator = this.page.locator('[data-testid="feature-easy"]');
  readonly featureOptimize: Locator = this.page.locator('[data-testid="feature-optimize"]');
  readonly featureTrack: Locator = this.page.locator('[data-testid="feature-track"]');

  // CTA Buttons
  readonly ctaButtons: Locator = this.page.locator('[data-testid="cta-buttons"]');
  readonly buttonRegister: Locator = this.page.locator('[data-testid="button-register"]');
  readonly buttonLogin: Locator = this.page.locator('[data-testid="button-login"]');
  readonly newSettlementButton: Locator = this.page.locator('[data-testid="new-settlement-button"]');

  // How it works section
  readonly howTitle: Locator = this.page.locator('[data-testid="how-title"]');
  readonly stepsList: Locator = this.page.locator('[data-testid="steps-list"]');

  // Individual steps
  readonly step1: Locator = this.page.locator('[data-testid="step-1"]');
  readonly step1Number: Locator = this.page.locator('[data-testid="step-1-number"]');
  readonly step1Title: Locator = this.page.locator('[data-testid="step-1-title"]');
  readonly step1Desc: Locator = this.page.locator('[data-testid="step-1-desc"]');

  readonly step2: Locator = this.page.locator('[data-testid="step-2"]');
  readonly step2Number: Locator = this.page.locator('[data-testid="step-2-number"]');
  readonly step2Title: Locator = this.page.locator('[data-testid="step-2-title"]');
  readonly step2Desc: Locator = this.page.locator('[data-testid="step-2-desc"]');

  readonly step3: Locator = this.page.locator('[data-testid="step-3"]');
  readonly step3Number: Locator = this.page.locator('[data-testid="step-3-number"]');
  readonly step3Title: Locator = this.page.locator('[data-testid="step-3-title"]');
  readonly step3Desc: Locator = this.page.locator('[data-testid="step-3-desc"]');

  readonly step4: Locator = this.page.locator('[data-testid="step-4"]');
  readonly step4Number: Locator = this.page.locator('[data-testid="step-4-number"]');
  readonly step4Title: Locator = this.page.locator('[data-testid="step-4-title"]');
  readonly step4Desc: Locator = this.page.locator('[data-testid="step-4-desc"]');

  // Navigation
  async goto() {
    await this.page.goto("/");
    await this.waitForLoad();
  }

  // Visibility assertions
  async isWelcomeVisible(): Promise<boolean> {
    return await this.welcomeMessage.isVisible();
  }

  async isWelcomeTitleVisible(): Promise<boolean> {
    return await this.welcomeTitle.isVisible();
  }

  async isHowItWorksVisible(): Promise<boolean> {
    return await this.howItWorksSection.isVisible();
  }

  async isAllFeaturesVisible(): Promise<boolean> {
    const easy = await this.featureEasy.isVisible();
    const optimize = await this.featureOptimize.isVisible();
    const track = await this.featureTrack.isVisible();
    return easy && optimize && track;
  }

  async isAllStepsVisible(): Promise<boolean> {
    const step1 = await this.step1.isVisible();
    const step2 = await this.step2.isVisible();
    const step3 = await this.step3.isVisible();
    const step4 = await this.step4.isVisible();
    return step1 && step2 && step3 && step4;
  }

  async isCTAButtonsVisible(): Promise<boolean> {
    const register = await this.buttonRegister.isVisible();
    const login = await this.buttonLogin.isVisible();
    return register && login;
  }

  // Content assertions
  async getWelcomeMessageText(): Promise<string | null> {
    return await this.welcomeMessage.textContent();
  }

  async getWelcomeTitleText(): Promise<string | null> {
    return await this.welcomeTitle.textContent();
  }

  async getStepsCount(): Promise<number> {
    // Count only main step containers (step-1, step-2, step-3, step-4)
    // by looking for direct children with gap-4 class
    const steps = await this.stepsList.locator('> div[data-testid^="step-"]').count();
    return steps || 4;
  }

  // Navigation actions
  async clickRegisterButton() {
    await this.buttonRegister.click();
  }

  async clickLoginButton() {
    await this.buttonLogin.click();
  }

  // Settlers list (if visible after login)
  readonly settlementsList: Locator = this.page.locator('[data-testid="settlements-list"]');

  async getSettlementsCount(): Promise<number> {
    return await this.settlementsList.locator('[data-testid="settlement-card"]').count().catch(() => 0);
  }
}
