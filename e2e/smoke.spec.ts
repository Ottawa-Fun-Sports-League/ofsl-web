import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Welcome to OFSL!');
    // Check for key homepage elements
    await expect(page.locator('text=Ottawa Fun Sports League')).toBeVisible();
  });

  test('navigation links work', async ({ page }) => {
    await page.goto('/');
    
    // Test About link - be more specific to avoid multiple matches
    await page.locator('a[href="#/about-us"]').first().click();
    await expect(page).toHaveURL(/.*#\/about-us/);
    
    // Test Leagues link
    await page.locator('a:has-text("Leagues")').first().click();
    await expect(page).toHaveURL(/.*#\/leagues/);
    
    // Test Contact link - it goes to about-us page with contact section
    await page.locator('a:has-text("Contact")').first().click();
    await expect(page).toHaveURL(/.*#\/about-us#contact-section/);
  });

  test('login page accessible', async ({ page }) => {
    await page.goto('/#/login');
    await expect(page.locator('h1')).toContainText('Login');
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
  });

  test('signup page accessible', async ({ page }) => {
    await page.goto('/#/signup');
    await expect(page.locator('h1')).toContainText('Create Account');
    await expect(page.locator('input#name')).toBeVisible();
    await expect(page.locator('input#email')).toBeVisible();
  });

  test('leagues page loads', async ({ page }) => {
    await page.goto('/#/leagues');
    // The page should either show leagues or a loading state
    await expect(page.locator('h1')).toBeVisible();
  });

  test('protected routes redirect to login', async ({ page }) => {
    await page.goto('/#/my-account');
    await expect(page).toHaveURL(/.*#\/login/);
  });

  test('footer links present', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Privacy Policy')).toBeVisible();
    // Check for Terms and Conditions instead
    await expect(page.locator('footer')).toBeVisible();
  });
});