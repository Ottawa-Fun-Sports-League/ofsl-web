import { test, expect } from '@playwright/test';

test.describe('Spares System - Focused Tests', () => {
  test('should load spares page without database errors', async ({ page }) => {
    const consoleErrors = [];
    
    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate to spares page
    await page.goto('/#/my-account/spares');
    
    // Wait for page to load
    await page.waitForTimeout(5000);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/spares-page-load.png',
      fullPage: true 
    });
    
    // Check for specific database errors we were trying to fix
    const hasCriticalErrors = consoleErrors.some(error => 
      error.includes('400 (Bad Request)') || 
      error.includes('Cannot access \'fetchRegistrations\' before initialization') ||
      error.includes('spares?select=') && error.includes('400')
    );
    
    if (hasCriticalErrors) {
      console.log('❌ Critical errors found:', consoleErrors.filter(error => 
        error.includes('400') || error.includes('fetchRegistrations') || error.includes('spares?select=')
      ));
    } else {
      console.log('✅ No critical database errors found');
    }
    
    expect(hasCriticalErrors).toBe(false);
    
    // Page should load some content (either login or spares interface)
    const hasContent = await page.locator('h1, h2, input[type="email"], [data-testid="spares-registrations"]').first().isVisible();
    expect(hasContent).toBe(true);
  });
  
  test('should show proper UI elements on spares page', async ({ page }) => {
    await page.goto('/#/my-account/spares');
    await page.waitForTimeout(3000);
    
    // Take screenshot of what we see
    await page.screenshot({ 
      path: 'test-results/spares-ui-elements.png',
      fullPage: true 
    });
    
    // Should see either login form or spares content
    const loginVisible = await page.locator('input[type="email"]').isVisible().catch(() => false);
    const sparesVisible = await page.locator('text="My Spares Registrations"').isVisible().catch(() => false);
    
    console.log('Login form visible:', loginVisible);
    console.log('Spares content visible:', sparesVisible);
    
    // Should see one or the other
    expect(loginVisible || sparesVisible).toBe(true);
    
    // If we can see the spares page, check for the Join button
    if (sparesVisible) {
      const joinButtonVisible = await page.locator('button:has-text("Join")').isVisible().catch(() => false);
      console.log('Join button visible:', joinButtonVisible);
      
      // Should have join button somewhere on the page
      expect(joinButtonVisible).toBe(true);
    }
  });

  test('should load volleyball page spares CTA without errors', async ({ page }) => {
    const consoleErrors = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/#/volleyball');
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/volleyball-page-spares.png',
      fullPage: true 
    });
    
    // Check for JavaScript errors
    const hasJsErrors = consoleErrors.some(error => 
      error.includes('ReferenceError') || 
      error.includes('TypeError') ||
      error.includes('is not a function')
    );
    
    if (hasJsErrors) {
      console.log('❌ JavaScript errors on volleyball page:', consoleErrors);
    } else {
      console.log('✅ No JavaScript errors on volleyball page');
    }
    
    expect(hasJsErrors).toBe(false);
    
    // Should load volleyball page content
    const hasVolleyballContent = await page.locator('text="Volleyball", h1, h2').first().isVisible();
    expect(hasVolleyballContent).toBe(true);
  });

  test('should handle modal interactions without errors', async ({ page }) => {
    await page.goto('/#/my-account/spares');
    await page.waitForTimeout(3000);
    
    // Look for any Join buttons
    const joinButtons = await page.locator('button:has-text("Join")').all();
    console.log(`Found ${joinButtons.length} Join buttons`);
    
    if (joinButtons.length > 0) {
      // Click the first join button
      await joinButtons[0].click();
      await page.waitForTimeout(1000);
      
      // Take screenshot of modal state
      await page.screenshot({ 
        path: 'test-results/spares-modal-interaction.png',
        fullPage: true 
      });
      
      // Should either see a modal or be redirected to login
      const modalVisible = await page.locator('[role="dialog"], .fixed.inset-0').isVisible().catch(() => false);
      const loginVisible = await page.locator('input[type="email"]').isVisible().catch(() => false);
      
      console.log('Modal visible after click:', modalVisible);
      console.log('Login redirect after click:', loginVisible);
      
      // Should see some response to the click
      expect(modalVisible || loginVisible).toBe(true);
    } else {
      console.log('No Join buttons found - might need authentication');
    }
  });
});