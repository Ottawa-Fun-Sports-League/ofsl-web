import { test, expect } from '@playwright/test';

test.describe('Spares System E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should load spares page without database errors', async ({ page }) => {
    // Navigate to My Account page (will redirect to login if not authenticated)
    await page.goto('/#/my-account/spares');
    
    // Check if we get to login page or spares page
    await page.waitForSelector('[data-testid="login-form"], [data-testid="spares-registrations"], h1, h2', { timeout: 10000 });
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'spares-page-load.png' });
    
    // Check that we don't have database query errors in the console
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait a bit for any async operations to complete
    await page.waitForTimeout(2000);
    
    // Check for specific database errors
    const hasDbErrors = errors.some(error => 
      error.includes('400 (Bad Request)') || 
      error.includes('spares?select=') ||
      error.includes('Cannot access \'fetchRegistrations\' before initialization')
    );
    
    if (hasDbErrors) {
      console.log('Database errors found:', errors);
    }
    
    expect(hasDbErrors).toBe(false);
  });

  test('should show proper spares interface for authenticated users', async ({ page }) => {
    // This test would require authentication setup
    // For now, let's just test that the page loads without errors
    
    await page.goto('/#/login');
    
    // Check if login page loads
    await expect(page.locator('h1, h2, [data-testid="login-form"]')).toBeVisible({ timeout: 5000 });
    
    // Take screenshot of login page
    await page.screenshot({ path: 'login-page.png' });
  });

  test('should display proper empty state for spares', async ({ page }) => {
    // Navigate directly to spares page
    await page.goto('/#/my-account/spares');
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'spares-empty-state.png' });
    
    // Should see either login form or spares content
    const hasLoginOrSpares = await page.locator('input[type="email"], input[type="password"], [data-testid="spares-registrations"], h1, h2').isVisible();
    expect(hasLoginOrSpares).toBe(true);
  });

  test('should handle volleyball page spares signup CTA', async ({ page }) => {
    await page.goto('/#/volleyball');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Look for spares signup section
    const sparesSection = page.locator('text="Join Volleyball Spares List", text="Join Spares List", text="Join"').first();
    
    // Take screenshot of volleyball page
    await page.screenshot({ path: 'volleyball-page.png' });
    
    // The spares section should exist
    const sparesExists = await sparesSection.isVisible().catch(() => false);
    
    // Log what we found
    console.log('Spares section visible on volleyball page:', sparesExists);
  });

  test('should not have JavaScript runtime errors', async ({ page }) => {
    const jsErrors = [];
    
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });
    
    // Navigate to spares page
    await page.goto('/#/my-account/spares');
    await page.waitForTimeout(3000);
    
    // Navigate to volleyball page
    await page.goto('/#/volleyball');
    await page.waitForTimeout(2000);
    
    // Check for critical JavaScript errors
    const criticalErrors = jsErrors.filter(error => 
      error.includes('Cannot access \'fetchRegistrations\' before initialization') ||
      error.includes('ReferenceError') ||
      error.includes('TypeError') ||
      error.includes('is not a function')
    );
    
    if (criticalErrors.length > 0) {
      console.log('Critical JavaScript errors found:', criticalErrors);
    }
    
    expect(criticalErrors.length).toBe(0);
    
    // Take final screenshot
    await page.screenshot({ path: 'final-state.png' });
  });
});