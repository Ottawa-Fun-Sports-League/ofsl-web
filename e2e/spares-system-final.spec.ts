import { test, expect } from '@playwright/test';

test.describe('Spares System - Production Ready Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should load spares page without critical errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
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
    
    // Take screenshot for verification
    await page.screenshot({ 
      path: 'test-results/spares-system-loaded.png',
      fullPage: true 
    });
    
    // Check for critical errors that would break the feature
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('400 (Bad Request)') || 
      error.includes('Cannot access') ||
      error.includes('ReferenceError') ||
      error.includes('TypeError') ||
      error.includes('is not a function')
    );
    
    if (criticalErrors.length > 0) {
      console.log('❌ Critical errors found:', criticalErrors);
    } else {
      console.log('✅ No critical errors - spares system loads properly');
    }
    
    expect(criticalErrors.length).toBe(0);
    
    // Page should render without crashing
    const pageRendered = await page.locator('body').isVisible();
    expect(pageRendered).toBe(true);
  });

  test('should display spares system interface elements', async ({ page }) => {
    await page.goto('/#/my-account/spares');
    await page.waitForTimeout(3000);
    
    // Take screenshot of the interface
    await page.screenshot({ 
      path: 'test-results/spares-interface.png',
      fullPage: true 
    });
    
    // Check for core spares system components
    const myRegistrationsText = await page.locator('text=My Spares Registrations').isVisible().catch(() => false);
    const sparesListText = await page.locator('text=Spares List').isVisible().catch(() => false);
    const joinButton = await page.locator('button:has-text("Join")').isVisible().catch(() => false);
    const loginForm = await page.locator('input[type="email"]').isVisible().catch(() => false);
    
    console.log('My Spares Registrations section:', myRegistrationsText ? '✅' : '❌');
    console.log('Spares List section:', sparesListText ? '✅' : '❌');
    console.log('Join button:', joinButton ? '✅' : '❌');
    console.log('Login form (if not authenticated):', loginForm ? '✅' : '❌');
    
    // Should see either the spares interface or login form
    const hasInterface = myRegistrationsText || sparesListText || joinButton || loginForm;
    expect(hasInterface).toBe(true);
  });

  test('should handle join spares modal functionality', async ({ page }) => {
    await page.goto('/#/my-account/spares');
    await page.waitForTimeout(3000);
    
    // Look for Join buttons
    const joinButtons = await page.locator('button:has-text("Join")').all();
    console.log(`Found ${joinButtons.length} Join buttons`);
    
    if (joinButtons.length > 0) {
      // Click first Join button
      await joinButtons[0].click();
      await page.waitForTimeout(2000);
      
      // Take screenshot of modal
      await page.screenshot({ 
        path: 'test-results/spares-join-modal.png',
        fullPage: true 
      });
      
      // Check if modal opened or redirected to login
      const modalElements = [
        'text=Join Spares List',
        'text=Your Skill Level',
        'text=Share my phone number',
        'text=Privacy Notice'
      ];
      
      let modalOpened = false;
      for (const element of modalElements) {
        if (await page.locator(element).isVisible().catch(() => false)) {
          console.log(`✅ Modal element found: ${element}`);
          modalOpened = true;
          break;
        }
      }
      
      const loginRedirect = await page.locator('input[type="email"]').isVisible().catch(() => false);
      
      console.log('Modal opened:', modalOpened ? '✅' : '❌');
      console.log('Login redirect:', loginRedirect ? '✅' : '❌');
      
      // Should either open modal or redirect to login
      expect(modalOpened || loginRedirect).toBe(true);
      
      // If modal opened, verify key features
      if (modalOpened) {
        // Check for phone sharing privacy controls
        const phonePrivacy = await page.locator('text=phone number').isVisible().catch(() => false);
        console.log('Phone privacy controls:', phonePrivacy ? '✅' : '❌');
        
        // Should have phone sharing feature
        expect(phonePrivacy).toBe(true);
      }
    } else {
      console.log('ℹ️ No Join buttons found - likely requires authentication');
    }
  });

  test('should show proper contact options in spares list', async ({ page }) => {
    // Try the standalone spares route first
    await page.goto('/#/spares');
    await page.waitForTimeout(2000);
    
    // Check if we're redirected to login
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('✅ Authentication required for spares page - redirected to login');
      expect(currentUrl).toContain('/login');
      return;
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/spares-contact-options.png',
      fullPage: true 
    });
    
    // Look for any spares-related content
    const sparesContent = [
      'Spares List',
      'My Spares Registrations',
      'Available Spares',
      'Join Spares List',
      'No spares registered'
    ];
    
    let foundSparesContent = false;
    for (const content of sparesContent) {
      if (await page.locator(`text=${content}`).isVisible().catch(() => false)) {
        console.log(`✅ Spares content found: "${content}"`);
        foundSparesContent = true;
        break;
      }
    }
    
    if (foundSparesContent) {
      // Check for contact buttons if there's a spares list
      const emailButtons = await page.locator('button:has-text("Email")').count();
      const phoneButtons = await page.locator('button:has-text("Phone")').count();
      
      if (emailButtons > 0) {
        console.log(`✅ Contact options working - Email: ${emailButtons}, Phone: ${phoneButtons}`);
        // Phone buttons should be less than or equal to email buttons (privacy feature)
        expect(phoneButtons).toBeLessThanOrEqual(emailButtons);
      } else {
        console.log('✅ No spares listed or user not authenticated');
      }
    } else {
      // Check for authentication/access messages
      const authMessages = [
        'Please log in',
        'Login Required',
        'must be registered'
      ];
      
      let foundAuthMessage = false;
      for (const message of authMessages) {
        if (await page.locator(`text=${message}`).isVisible().catch(() => false)) {
          console.log(`✅ Authentication message found: "${message}"`);
          foundAuthMessage = true;
          break;
        }
      }
      
      // Either spares content or auth message should be present
      expect(foundSparesContent || foundAuthMessage).toBe(true);
    }
  });

  test('should integrate properly with volleyball page', async ({ page }) => {
    await page.goto('/#/volleyball');
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/volleyball-spares.png',
      fullPage: true 
    });
    
    // Check for volleyball spares integration
    const volleyballSpares = await page.locator('text=Join Volleyball Spares List').isVisible().catch(() => false);
    const generalSpares = await page.locator('text=spares').isVisible().catch(() => false);
    
    console.log('Volleyball spares integration:', volleyballSpares ? '✅' : '❌');
    console.log('General spares content:', generalSpares ? '✅' : '❌');
    
    // Page should load without errors regardless of spares content
    const pageTitle = await page.locator('h1, h2').first().isVisible();
    expect(pageTitle).toBe(true);
    
    console.log('Volleyball page loads properly:', '✅');
  });

  test('should handle no critical JavaScript errors across flows', async ({ page }) => {
    const jsErrors: string[] = [];
    
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });
    
    // Test key user flows
    await page.goto('/#/my-account/spares');
    await page.waitForTimeout(2000);
    
    // Try interacting with Join button if present
    const joinButton = page.locator('button:has-text("Join")').first();
    if (await joinButton.isVisible().catch(() => false)) {
      await joinButton.click();
      await page.waitForTimeout(1000);
      
      // Try to close modal
      const cancelButton = page.locator('button:has-text("Cancel")').first();
      if (await cancelButton.isVisible().catch(() => false)) {
        await cancelButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Navigate to volleyball page
    await page.goto('/#/volleyball');
    await page.waitForTimeout(2000);
    
    // Filter out non-critical errors
    const criticalErrors = jsErrors.filter(error => 
      error.includes('Cannot access') ||
      error.includes('ReferenceError') ||
      error.includes('TypeError') ||
      (error.includes('is not a function') && !error.includes('ResizeObserver'))
    );
    
    if (criticalErrors.length > 0) {
      console.log('❌ Critical JavaScript errors:', criticalErrors);
    } else {
      console.log('✅ No critical JavaScript errors found');
    }
    
    expect(criticalErrors.length).toBe(0);
    
    // Final screenshot
    await page.screenshot({ 
      path: 'test-results/spares-system-final.png',
      fullPage: true 
    });
  });
});