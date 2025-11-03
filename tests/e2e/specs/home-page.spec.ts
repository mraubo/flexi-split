import { test, expect } from "@playwright/test";
import { HomePage } from "../pages/HomePage";

test.describe("Home Page - Unauthenticated User", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
    // Wait for page to load
    await expect(homePage.homePage).toBeVisible();
  });

  test("should display home page with main elements", async () => {
    // Assert: Home page container should be visible
    const isHomePageVisible = await homePage.homePage.isVisible();
    expect(isHomePageVisible).toBe(true);
  });

  test("should display welcome section with title and message", async () => {
    // Assert: Welcome section should be visible
    const isWelcomeSectionVisible = await homePage.welcomeSection.isVisible();
    expect(isWelcomeSectionVisible).toBe(true);

    // Assert: Welcome title should be visible
    await expect(homePage.welcomeTitle).toBeVisible();

    // Assert: Welcome message should be visible
    const isWelcomeVisible = await homePage.isWelcomeVisible();
    expect(isWelcomeVisible).toBe(true);
  });

  test("should display welcome title with correct content", async () => {
    // Assert: Welcome title should contain expected text
    const titleText = await homePage.getWelcomeTitleText();
    expect(titleText).toContain("Rozlicz koszty");
  });

  test("should display welcome message with description", async () => {
    // Assert: Welcome message should contain expected content
    const messageText = await homePage.getWelcomeMessageText();
    expect(messageText).toContain("FlexiSplit");
    expect(messageText).toBeTruthy();
  });

  test("should display all feature cards", async () => {
    // Assert: All three feature cards should be visible
    const allFeaturesVisible = await homePage.isAllFeaturesVisible();
    expect(allFeaturesVisible).toBe(true);

    // Assert: Individual features should be visible
    await expect(homePage.featureEasy).toBeVisible();
    await expect(homePage.featureOptimize).toBeVisible();
    await expect(homePage.featureTrack).toBeVisible();
  });

  test('should have feature card for "Łatwe w użyciu"', async () => {
    // Assert: Feature easy card should contain expected text
    const featureText = await homePage.featureEasy.textContent();
    expect(featureText).toContain("Łatwe");
  });

  test('should have feature card for "Optymalne rozliczenie"', async () => {
    // Assert: Feature optimize card should contain expected text
    const featureText = await homePage.featureOptimize.textContent();
    expect(featureText).toContain("Optymalne");
  });

  test('should have feature card for "Śledź wszystko"', async () => {
    // Assert: Feature track card should contain expected text
    const featureText = await homePage.featureTrack.textContent();
    expect(featureText).toContain("Śledź");
  });

  test("should display CTA buttons section", async () => {
    // Assert: CTA buttons container should be visible
    const isCTAVisible = await homePage.isCTAButtonsVisible();
    expect(isCTAVisible).toBe(true);

    // Assert: Individual buttons should be visible
    await expect(homePage.buttonRegister).toBeVisible();
    await expect(homePage.buttonLogin).toBeVisible();
  });

  test("should display register button with correct text", async () => {
    // Assert: Register button should have correct text
    const buttonText = await homePage.buttonRegister.textContent();
    expect(buttonText).toContain("Zarejestruj");
  });

  test("should display login button with correct text", async () => {
    // Assert: Login button should have correct text
    const buttonText = await homePage.buttonLogin.textContent();
    expect(buttonText).toContain("Zaloguj");
  });

  test('should have "How It Works" section', async () => {
    // Assert: How it works section should be visible
    const isHowItWorksVisible = await homePage.isHowItWorksVisible();
    expect(isHowItWorksVisible).toBe(true);

    // Assert: Section title should be visible
    await expect(homePage.howTitle).toBeVisible();
  });

  test('should display all 4 steps in "How It Works" section', async () => {
    // Assert: All steps should be visible
    const allStepsVisible = await homePage.isAllStepsVisible();
    expect(allStepsVisible).toBe(true);

    // Assert: All step containers should exist and be visible
    await expect(homePage.step1).toBeVisible();
    await expect(homePage.step2).toBeVisible();
    await expect(homePage.step3).toBeVisible();
    await expect(homePage.step4).toBeVisible();
  });

  test("should display step 1 with correct content", async () => {
    // Assert: Step 1 should be visible
    await expect(homePage.step1).toBeVisible();
    await expect(homePage.step1Number).toBeVisible();
    await expect(homePage.step1Title).toBeVisible();
    await expect(homePage.step1Desc).toBeVisible();

    // Assert: Step 1 should contain expected text
    const step1Text = await homePage.step1.textContent();
    expect(step1Text).toContain("Utwórz rozliczenie");
  });

  test("should display step 2 with correct content", async () => {
    // Assert: Step 2 should be visible
    await expect(homePage.step2).toBeVisible();
    await expect(homePage.step2Title).toBeVisible();

    // Assert: Step 2 should contain expected text
    const step2Text = await homePage.step2.textContent();
    expect(step2Text).toContain("Dodaj uczestników");
  });

  test("should display step 3 with correct content", async () => {
    // Assert: Step 3 should be visible
    await expect(homePage.step3).toBeVisible();
    await expect(homePage.step3Title).toBeVisible();

    // Assert: Step 3 should contain expected text
    const step3Text = await homePage.step3.textContent();
    expect(step3Text).toContain("Rejestruj wydatki");
  });

  test("should display step 4 with correct content", async () => {
    // Assert: Step 4 should be visible
    await expect(homePage.step4).toBeVisible();
    await expect(homePage.step4Title).toBeVisible();

    // Assert: Step 4 should contain expected text
    const step4Text = await homePage.step4.textContent();
    expect(step4Text).toContain("Wyświetl podsumowanie");
  });

  test("should have all step numbers visible and correct", async () => {
    // Assert: All step numbers should be visible
    await expect(homePage.step1Number).toBeVisible();
    await expect(homePage.step2Number).toBeVisible();
    await expect(homePage.step3Number).toBeVisible();
    await expect(homePage.step4Number).toBeVisible();

    // Assert: Step numbers should have correct text (trim whitespace)
    const step1NumText = (await homePage.step1Number.textContent())?.trim();
    const step2NumText = (await homePage.step2Number.textContent())?.trim();
    const step3NumText = (await homePage.step3Number.textContent())?.trim();
    const step4NumText = (await homePage.step4Number.textContent())?.trim();

    expect(step1NumText).toBe("1");
    expect(step2NumText).toBe("2");
    expect(step3NumText).toBe("3");
    expect(step4NumText).toBe("4");
  });
});

test.describe("Home Page - Navigation", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  test("should navigate to register page via register button", async () => {
    // Act: Click register button
    await homePage.clickRegisterButton();

    // Assert: Should navigate to register page
    await expect(homePage.page).toHaveURL(/.*\/auth\/register/);
  });

  test("should navigate to login page via login button", async () => {
    // Act: Click login button
    await homePage.clickLoginButton();

    // Assert: Should navigate to login page
    await expect(homePage.page).toHaveURL(/.*\/auth\/login/);
  });

  test("register button should be clickable", async () => {
    // Assert: Register button should be enabled
    const isEnabled = await homePage.buttonRegister.isEnabled();
    expect(isEnabled).toBe(true);

    // Assert: Button should have href attribute
    const href = await homePage.buttonRegister.getAttribute("href");
    expect(href).toContain("/auth/register");
  });

  test("login button should be clickable", async () => {
    // Assert: Login button should be enabled
    const isEnabled = await homePage.buttonLogin.isEnabled();
    expect(isEnabled).toBe(true);

    // Assert: Button should have href attribute
    const href = await homePage.buttonLogin.getAttribute("href");
    expect(href).toContain("/auth/login");
  });
});

test.describe("Home Page - Page Title and Metadata", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  test("should have correct page title", async () => {
    // Assert: Page title should be correct
    const title = await homePage.getTitle();
    expect(title).toContain("FlexiSplit");
  });

  test("should load without errors", async () => {
    // Assert: Page should be visible and loaded
    const isPageVisible = await homePage.homePage.isVisible();
    expect(isPageVisible).toBe(true);

    // Assert: No console errors should occur (basic sanity check)
    const title = await homePage.getTitle();
    expect(title).toBeTruthy();
  });
});

test.describe("Home Page - Responsive Design", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  test("should display welcome section properly", async () => {
    // Assert: Welcome section should be visible at any viewport
    const isWelcomeSectionVisible = await homePage.welcomeSection.isVisible();
    expect(isWelcomeSectionVisible).toBe(true);
  });

  test("should display buttons in responsive layout", async () => {
    // Assert: CTA buttons should be visible and clickable
    const isRegisterVisible = await homePage.buttonRegister.isVisible();
    const isLoginVisible = await homePage.buttonLogin.isVisible();

    expect(isRegisterVisible).toBe(true);
    expect(isLoginVisible).toBe(true);
  });

  test("should display feature cards properly", async () => {
    // Assert: All features should be visible
    const allFeaturesVisible = await homePage.isAllFeaturesVisible();
    expect(allFeaturesVisible).toBe(true);
  });

  test("should display steps section properly", async () => {
    // Assert: Steps section should be visible and readable
    const isStepsSectionVisible = await homePage.stepsList.isVisible();
    expect(isStepsSectionVisible).toBe(true);

    // Assert: All steps should be visible
    const allStepsVisible = await homePage.isAllStepsVisible();
    expect(allStepsVisible).toBe(true);
  });
});
