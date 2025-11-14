import type { Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

export class HomePage extends BasePage {
  // ============================================================================
  // MAIN CONTAINER
  // ============================================================================
  readonly homePage: Locator = this.page.locator('[data-testid="home-page"]');

  // ============================================================================
  // HERO / WELCOME SECTION
  // ============================================================================
  readonly welcomeSection: Locator = this.page.locator('[data-testid="welcome-section"]');
  readonly welcomeTitle: Locator = this.page.locator('[data-testid="welcome-title"]');
  readonly welcomeMessage: Locator = this.page.locator('[data-testid="welcome-message"]');

  // Feature highlights (3 cards below hero)
  readonly featureEasy: Locator = this.page.locator('[data-testid="feature-easy"]');
  readonly featureOptimize: Locator = this.page.locator('[data-testid="feature-optimize"]');
  readonly featureTrack: Locator = this.page.locator('[data-testid="feature-track"]');

  // CTA Buttons
  readonly ctaButtons: Locator = this.page.locator('[data-testid="cta-buttons"]');
  readonly buttonRegister: Locator = this.page.locator('[data-testid="button-register"]');
  readonly buttonLogin: Locator = this.page.locator('[data-testid="button-login"]');
  readonly newSettlementButton: Locator = this.page.locator('[data-testid="new-settlement-button"]');

  // ============================================================================
  // USE CASES SECTION ("Idealne do rozliczania")
  // ============================================================================
  readonly useCasesSection: Locator = this.page.locator('[data-testid="use-cases-section"]');
  readonly useCaseTrips: Locator = this.page.locator('[data-testid="use-case-trips"]');
  readonly useCaseLiving: Locator = this.page.locator('[data-testid="use-case-living"]');
  readonly useCaseEvents: Locator = this.page.locator('[data-testid="use-case-events"]');

  // ============================================================================
  // HOW IT WORKS SECTION
  // ============================================================================
  readonly howItWorksSection: Locator = this.page.locator('[data-testid="how-it-works-section"]');
  readonly howTitle: Locator = this.page.locator('[data-testid="how-title"]');
  readonly stepsList: Locator = this.page.locator('[data-testid="steps-list"]');

  // Step 1
  readonly step1: Locator = this.page.locator('[data-testid="step-1"]');
  readonly step1Number: Locator = this.page.locator('[data-testid="step-1-number"]');
  readonly step1Title: Locator = this.page.locator('[data-testid="step-1-title"]');
  readonly step1Desc: Locator = this.page.locator('[data-testid="step-1-desc"]');

  // Step 2
  readonly step2: Locator = this.page.locator('[data-testid="step-2"]');
  readonly step2Number: Locator = this.page.locator('[data-testid="step-2-number"]');
  readonly step2Title: Locator = this.page.locator('[data-testid="step-2-title"]');
  readonly step2Desc: Locator = this.page.locator('[data-testid="step-2-desc"]');

  // Step 3
  readonly step3: Locator = this.page.locator('[data-testid="step-3"]');
  readonly step3Number: Locator = this.page.locator('[data-testid="step-3-number"]');
  readonly step3Title: Locator = this.page.locator('[data-testid="step-3-title"]');
  readonly step3Desc: Locator = this.page.locator('[data-testid="step-3-desc"]');

  // Step 4
  readonly step4: Locator = this.page.locator('[data-testid="step-4"]');
  readonly step4Number: Locator = this.page.locator('[data-testid="step-4-number"]');
  readonly step4Title: Locator = this.page.locator('[data-testid="step-4-title"]');
  readonly step4Desc: Locator = this.page.locator('[data-testid="step-4-desc"]');

  // ============================================================================
  // WHY FLEXISPLIT SECTION (Bento Grid)
  // ============================================================================
  readonly whySection: Locator = this.page.locator('[data-testid="why-section"]');
  readonly benefit1: Locator = this.page.locator('[data-testid="benefit-1"]'); // Bez kont
  readonly benefit2: Locator = this.page.locator('[data-testid="benefit-2"]'); // Minimalna liczba przelewów
  readonly benefit3: Locator = this.page.locator('[data-testid="benefit-3"]'); // Sprawiedliwy podział
  readonly benefit4: Locator = this.page.locator('[data-testid="benefit-4"]'); // Niemodyfikowalne archiwum
  readonly benefit5: Locator = this.page.locator('[data-testid="benefit-5"]'); // Projektowane dla mobile
  readonly benefit6: Locator = this.page.locator('[data-testid="benefit-6"]'); // Łatwy eksport

  // ============================================================================
  // FAQ SECTION
  // ============================================================================
  readonly faqSection: Locator = this.page.locator('[data-testid="faq-section"]');
  readonly faq1: Locator = this.page.locator('[data-testid="faq-1"]'); // Czy uczestnicy muszą mieć konta?
  readonly faq2: Locator = this.page.locator('[data-testid="faq-2"]'); // Ile osób może uczestniczyć?
  readonly faq3: Locator = this.page.locator('[data-testid="faq-3"]'); // Czy mogę edytować zamknięte?
  readonly faq4: Locator = this.page.locator('[data-testid="faq-4"]'); // Jak działa podział kosztów?
  readonly faq5: Locator = this.page.locator('[data-testid="faq-5"]'); // Różne waluty?
  readonly faq6: Locator = this.page.locator('[data-testid="faq-6"]'); // Integracja z bankiem?
  readonly faq7: Locator = this.page.locator('[data-testid="faq-7"]'); // Ile kosztuje?
  readonly faq8: Locator = this.page.locator('[data-testid="faq-8"]'); // Bezpieczeństwo danych?

  // ============================================================================
  // NAVIGATION
  // ============================================================================
  async goto() {
    await this.page.goto("/");
    await this.waitForLoad();
  }

  // ============================================================================
  // HERO / WELCOME SECTION - Visibility & Content
  // ============================================================================
  async isWelcomeVisible(): Promise<boolean> {
    return await this.welcomeMessage.isVisible();
  }

  async isWelcomeTitleVisible(): Promise<boolean> {
    return await this.welcomeTitle.isVisible();
  }

  async isAllFeaturesVisible(): Promise<boolean> {
    const easy = await this.featureEasy.isVisible();
    const optimize = await this.featureOptimize.isVisible();
    const track = await this.featureTrack.isVisible();
    return easy && optimize && track;
  }

  async isCTAButtonsVisible(): Promise<boolean> {
    const register = await this.buttonRegister.isVisible();
    const login = await this.buttonLogin.isVisible();
    return register && login;
  }

  async getWelcomeMessageText(): Promise<string | null> {
    return await this.welcomeMessage.textContent();
  }

  async getWelcomeTitleText(): Promise<string | null> {
    return await this.welcomeTitle.textContent();
  }

  // ============================================================================
  // USE CASES SECTION - Visibility
  // ============================================================================
  async isUseCasesVisible(): Promise<boolean> {
    return await this.useCasesSection.isVisible();
  }

  async isAllUseCasesVisible(): Promise<boolean> {
    const trips = await this.useCaseTrips.isVisible();
    const living = await this.useCaseLiving.isVisible();
    const events = await this.useCaseEvents.isVisible();
    return trips && living && events;
  }

  // ============================================================================
  // HOW IT WORKS SECTION - Visibility & Content
  // ============================================================================
  async isHowItWorksVisible(): Promise<boolean> {
    return await this.howItWorksSection.isVisible();
  }

  async isAllStepsVisible(): Promise<boolean> {
    const step1 = await this.step1.isVisible();
    const step2 = await this.step2.isVisible();
    const step3 = await this.step3.isVisible();
    const step4 = await this.step4.isVisible();
    return step1 && step2 && step3 && step4;
  }

  async getStepsCount(): Promise<number> {
    return await this.stepsList.locator('[data-testid^="step-"]').count();
  }

  // ============================================================================
  // WHY FLEXISPLIT SECTION - Visibility
  // ============================================================================
  async isWhySectionVisible(): Promise<boolean> {
    return await this.whySection.isVisible();
  }

  async isAllBenefitsVisible(): Promise<boolean> {
    const b1 = await this.benefit1.isVisible();
    const b2 = await this.benefit2.isVisible();
    const b3 = await this.benefit3.isVisible();
    const b4 = await this.benefit4.isVisible();
    const b5 = await this.benefit5.isVisible();
    const b6 = await this.benefit6.isVisible();
    return b1 && b2 && b3 && b4 && b5 && b6;
  }

  async getBenefitsCount(): Promise<number> {
    return await this.whySection.locator('[data-testid^="benefit-"]').count();
  }

  // ============================================================================
  // FAQ SECTION - Visibility & Interaction
  // ============================================================================
  async isFAQVisible(): Promise<boolean> {
    return await this.faqSection.isVisible();
  }

  async getFAQCount(): Promise<number> {
    return await this.faqSection.locator('[data-testid^="faq-"]').count();
  }

  async isAllFAQVisible(): Promise<boolean> {
    const count = await this.getFAQCount();
    return count === 8;
  }

  async clickFAQ(faqNumber: number) {
    if (faqNumber < 1 || faqNumber > 8) {
      throw new Error(`FAQ number must be between 1 and 8, got ${faqNumber}`);
    }
    const faq = this.page.locator(`[data-testid="faq-${faqNumber}"]`);
    await faq.click();
  }

  async isFAQOpen(faqNumber: number): Promise<boolean> {
    if (faqNumber < 1 || faqNumber > 8) {
      throw new Error(`FAQ number must be between 1 and 8, got ${faqNumber}`);
    }
    const faq = this.page.locator(`[data-testid="faq-${faqNumber}"]`);
    const isOpen = await faq.getAttribute("open");
    return isOpen !== null;
  }

  // ============================================================================
  // NAVIGATION ACTIONS
  // ============================================================================
  async clickRegisterButton() {
    await this.buttonRegister.click();
  }

  async clickLoginButton() {
    await this.buttonLogin.click();
  }

  // ============================================================================
  // SETTLEMENTS LIST (visible after login)
  // ============================================================================
  readonly settlementsList: Locator = this.page.locator('[data-testid="settlements-list"]');

  async getSettlementsCount(): Promise<number> {
    return await this.settlementsList
      .locator('[data-testid="settlement-card"]')
      .count()
      .catch(() => 0);
  }
}
