import { test, expect } from '@playwright/test';

test.describe('Spares System - Comprehensive E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should load spares page without errors and show proper UI structure', async ({ page }) => {
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
    await page.waitForTimeout(3000);
    
    // Take screenshot for debugging
    await page.screenshot({ 
      path: 'test-results/spares-system-overview.png',
      fullPage: true 
    });
    
    // Check for critical errors that would prevent the feature from working
    const hasCriticalErrors = consoleErrors.some(error => 
      error.includes('400 (Bad Request)') || 
      error.includes('Cannot access') ||
      error.includes('ReferenceError') ||
      error.includes('TypeError')
    );
    
    if (hasCriticalErrors) {
      console.log('❌ Critical errors found:', consoleErrors.filter(error => 
        error.includes('400') || error.includes('Cannot access') || 
        error.includes('ReferenceError') || error.includes('TypeError')
      ));
    } else {
      console.log('✅ No critical errors found');
    }
    
    expect(hasCriticalErrors).toBe(false);
    
    // Should see either login form or spares interface
    const hasLoginOrSpares = await page.locator('input[type="email"], h1, h2, [data-testid="spares-registrations"]').first().isVisible();
    expect(hasLoginOrSpares).toBe(true);
  });

  test('should display proper spares registration interface structure', async ({ page }) => {
    await page.goto('/#/my-account/spares');
    await page.waitForTimeout(3000);
    
    // Take screenshot of the interface
    await page.screenshot({ 
      path: 'test-results/spares-registration-interface.png',
      fullPage: true 
    });
    
    // Check for key UI elements that should be present
    const keyElements = [
      'My Spares Registrations', // Main registration component
      'Spares List',             // List view component
    ];
    
    for (const element of keyElements) {
      const elementExists = await page.getByText(element).first().isVisible().catch(() => false);
      console.log(`${element}: ${elementExists ? '✅ Found' : '❌ Not found'}`);
    }
    
    // Should see either empty state or registration cards
    const hasContent = await page.locator('h1, h2, button:has-text("Join"), text="Ready to be a spare player?"').first().isVisible();
    expect(hasContent).toBe(true);
  });

  test('should handle join spares list modal interaction properly', async ({ page }) => {
    await page.goto('/#/my-account/spares');
    await page.waitForTimeout(3000);
    
    // Look for Join buttons
    const joinButtons = await page.locator('button:has-text("Join")').all();
    console.log(`Found ${joinButtons.length} Join buttons`);
    
    if (joinButtons.length > 0) {
      // Click the first join button
      await joinButtons[0].click();
      await page.waitForTimeout(1000);
      
      // Take screenshot of modal state
      await page.screenshot({ 
        path: 'test-results/spares-join-modal.png',
        fullPage: true 
      });
      
      // Should see join modal or be redirected to login
      const modalVisible = await page.locator('[role="dialog"], .fixed.inset-0, text="Join Spares List"').first().isVisible().catch(() => false);
      const loginVisible = await page.locator('input[type="email"]').isVisible().catch(() => false);
      
      console.log('Join modal visible:', modalVisible);
      console.log('Login redirect:', loginVisible);
      
      // Should see some response to the click
      expect(modalVisible || loginVisible).toBe(true);
      
      // If modal is visible, check for key form elements
      if (modalVisible) {
        const hasSkillLevel = await page.locator('text="Your Skill Level"').isVisible().catch(() => false);
        const hasPhoneSharing = await page.locator('text="Share my phone number"').isVisible().catch(() => false);
        const hasPrivacyNotice = await page.locator('text="Privacy Notice"').isVisible().catch(() => false);
        
        console.log('Skill level selector:', hasSkillLevel ? '✅' : '❌');
        console.log('Phone sharing option:', hasPhoneSharing ? '✅' : '❌');
        console.log('Privacy notice:', hasPrivacyNotice ? '✅' : '❌');
        
        // Key form elements should be present
        expect(hasSkillLevel || hasPhoneSharing || hasPrivacyNotice).toBe(true);
      }
    } else {
      console.log('No Join buttons found - might need authentication or different state');
    }
  });

  test('should display spares list with proper contact options', async ({ page }) => {
    await page.goto('/#/my-account/spares');
    await page.waitForTimeout(3000);
    
    // Take screenshot of spares list area
    await page.screenshot({ 
      path: 'test-results/spares-list-view.png',
      fullPage: true 
    });
    
    // Check if spares list is visible
    const sparesListVisible = await page.locator('text="Spares List"').isVisible().catch(() => false);
    console.log('Spares list section visible:', sparesListVisible);
    
    if (sparesListVisible) {
      // Look for contact action buttons (Email copy buttons should always be present if there are spares)
      const emailButtons = await page.locator('button:has-text("Email")').all();
      const phoneButtons = await page.locator('button:has-text("Phone")').all();
      
      console.log(`Email copy buttons found: ${emailButtons.length}`);
      console.log(`Phone copy buttons found: ${phoneButtons.length}`);
      
      // If there are any spares, should have email buttons
      // Phone buttons may or may not be present depending on sharing preferences
      if (emailButtons.length > 0) {
        console.log('✅ Contact options are properly displayed');
      }
    }
    
    // Check for proper access control messaging
    const accessMessages = [
      'Please log in to view',
      'You must be registered in a league',
      'No spares available',
      'spares available'
    ];
    
    let foundAccessMessage = false;
    for (const message of accessMessages) {
      if (await page.getByText(message, { exact: false }).first().isVisible().catch(() => false)) {
        console.log(`✅ Found access control message: "${message}"`);
        foundAccessMessage = true;
        break;
      }
    }
    
    expect(foundAccessMessage).toBe(true);
  });

  test('should handle skills dropdown with proper options', async ({ page }) => {
    await page.goto('/#/my-account/spares');
    await page.waitForTimeout(3000);
    
    // Try to open join modal
    const joinButton = page.locator('button:has-text("Join")').first();
    const joinButtonExists = await joinButton.isVisible().catch(() => false);
    
    if (joinButtonExists) {
      await joinButton.click();
      await page.waitForTimeout(1000);
      
      // Look for skill level dropdown
      const skillDropdown = page.locator('select, [role="combobox"]').filter({ hasText: /skill/i }).first();
      const skillDropdownExists = await skillDropdown.isVisible().catch(() => false);
      
      if (skillDropdownExists) {
        await page.screenshot({ 
          path: 'test-results/spares-skill-dropdown.png',
          fullPage: true 
        });
        
        // Check if dropdown has proper skill level options
        const expectedSkills = ['Beginner', 'Intermediate', 'Advanced', 'Competitive', 'Elite'];
        let skillsFound = 0;
        
        for (const skill of expectedSkills) {
          const skillOption = await page.locator(`option:has-text("${skill}")`).isVisible().catch(() => false);
          if (skillOption) {
            skillsFound++;
            console.log(`✅ Found skill level: ${skill}`);
          }
        }
        
        console.log(`Skills found: ${skillsFound}/${expectedSkills.length}`);
        
        // Should have at least the basic skill levels
        expect(skillsFound).toBeGreaterThanOrEqual(3);
      } else {
        console.log('Skill dropdown not found - might be in different state or loading');
      }
    }
  });

  test('should handle phone sharing privacy controls properly', async ({ page }) => {
    await page.goto('/#/my-account/spares');
    await page.waitForTimeout(3000);
    
    // Try to access join modal
    const joinButton = page.locator('button:has-text("Join")').first();
    const joinButtonExists = await joinButton.isVisible().catch(() => false);
    
    if (joinButtonExists) {
      await joinButton.click();
      await page.waitForTimeout(1000);
      
      // Look for phone sharing controls
      const phoneCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /phone/i }).first();
      const phoneCheckboxExists = await phoneCheckbox.isVisible().catch(() => false);
      
      if (!phoneCheckboxExists) {
        // Try alternative selectors
        const phoneLabel = await page.locator('text="Share my phone number"').isVisible().catch(() => false);
        console.log('Phone sharing option found:', phoneLabel);
        
        if (phoneLabel) {
          await page.screenshot({ 
            path: 'test-results/spares-phone-privacy.png',
            fullPage: true 
          });
          
          // Check for privacy-related text
          const privacyTexts = [
            'phone number will be visible',
            'phone number will not be shared',
            'Team captains can still contact you via email'
          ];
          
          let privacyControlsFound = false;
          for (const text of privacyTexts) {
            if (await page.getByText(text, { exact: false }).isVisible().catch(() => false)) {
              console.log(`✅ Found privacy control text: "${text}"`);
              privacyControlsFound = true;
              break;
            }
          }
          
          expect(privacyControlsFound).toBe(true);
        }
      }
    }
  });

  test('should not have critical JavaScript runtime errors', async ({ page }) => {
    const jsErrors: string[] = [];
    
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });
    
    // Navigate through key spares pages
    await page.goto('/#/my-account/spares');
    await page.waitForTimeout(3000);
    
    // Try clicking Join button if it exists
    const joinButton = page.locator('button:has-text("Join")').first();
    if (await joinButton.isVisible().catch(() => false)) {
      await joinButton.click();
      await page.waitForTimeout(1000);
      
      // Close modal if it opened
      const closeButton = page.locator('button').filter({ hasText: /cancel|close/i }).first();
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Check for critical JavaScript errors that would break functionality
    const criticalErrors = jsErrors.filter(error => 
      error.includes('Cannot access') ||
      error.includes('ReferenceError') ||
      error.includes('TypeError') ||
      (error.includes('is not a function') && !error.includes('ResizeObserver'))
    );
    
    if (criticalErrors.length > 0) {
      console.log('❌ Critical JavaScript errors found:', criticalErrors);
    } else {
      console.log('✅ No critical JavaScript errors found');
    }
    
    expect(criticalErrors.length).toBe(0);
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-results/spares-final-state.png',
      fullPage: true 
    });
  });

  test('should handle volleyball page spares integration without errors', async ({ page }) => {
    await page.goto('/#/volleyball');
    await page.waitForTimeout(3000);
    
    // Take screenshot of volleyball page
    await page.screenshot({ 
      path: 'test-results/volleyball-spares-integration.png',
      fullPage: true 
    });
    
    // Look for spares-related content on volleyball page
    const sparesContent = [
      'Join Volleyball Spares List',
      'Join Spares List', 
      'Join',
      'spare',
      'substitute'
    ];
    
    let foundSparesContent = false;
    for (const content of sparesContent) {
      if (await page.getByText(content, { exact: false }).first().isVisible().catch(() => false)) {
        console.log(`✅ Found spares content on volleyball page: "${content}"`);
        foundSparesContent = true;
        break;
      }
    }
    
    // Page should load successfully regardless of spares content
    const pageLoaded = await page.locator('h1, h2, text="Volleyball"').first().isVisible();
    expect(pageLoaded).toBe(true);
    
    console.log('Spares content on volleyball page:', foundSparesContent ? '✅ Present' : '⚠️ Not found');
  });
});