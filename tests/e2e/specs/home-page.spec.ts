import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

test.describe('Home Page', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto('/');
    await homePage.waitForLoad();
  });

  test('should display welcome message', async () => {
    const isVisible = await homePage.isWelcomeVisible();
    expect(isVisible).toBe(true);
  });

  test('should have new settlement button', async () => {
    await expect(homePage.newSettlementButton).toBeVisible();
  });

  test('should navigate to new settlement on button click', async () => {
    await homePage.clickNewSettlement();
    await expect(homePage.page).toHaveURL(/.*settlements\/new/);
  });
});

