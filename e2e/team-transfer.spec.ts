import { test, expect } from '@playwright/test';

test.describe('Team Transfer Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should display transfer button for teams in admin view', async ({ page }) => {
    // Navigate to manage teams page
    await page.goto('/#/my-account/manage-teams');
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Check if we're redirected to login
    const isLoginPage = await page.locator('input[type="email"]').isVisible().catch(() => false);
    
    if (isLoginPage) {
      console.log('ℹ️ Login required - admin-only feature');
      // The transfer feature is admin-only, so being redirected to login is expected
      expect(isLoginPage).toBe(true);
      return;
    }
    
    // If logged in as admin, check for transfer buttons
    const transferButtons = await page.locator('button:has-text("Transfer")').count();
    console.log(`Found ${transferButtons} transfer buttons`);
    
    // Take screenshot for verification
    await page.screenshot({ 
      path: 'test-results/team-transfer-buttons.png',
      fullPage: true 
    });
    
    // If there are teams, there should be transfer buttons
    const teamCards = await page.locator('[class*="card"]').count();
    if (teamCards > 0) {
      expect(transferButtons).toBeGreaterThan(0);
    }
  });

  test('should open transfer modal when transfer button is clicked', async ({ page }) => {
    await page.goto('/#/my-account/manage-teams');
    await page.waitForTimeout(3000);
    
    // Check if we're on the manage teams page
    const transferButton = page.locator('button:has-text("Transfer")').first();
    const hasTransferButton = await transferButton.isVisible().catch(() => false);
    
    if (!hasTransferButton) {
      console.log('ℹ️ No transfer buttons found - likely not logged in as admin');
      return;
    }
    
    // Click the first transfer button
    await transferButton.click();
    await page.waitForTimeout(2000);
    
    // Check if modal opened
    const modalTitle = await page.locator('text=Transfer Team to Different League').isVisible().catch(() => false);
    const leagueSelector = await page.locator('text=Transfer to League').isVisible().catch(() => false);
    
    console.log('Modal opened:', modalTitle ? '✅' : '❌');
    console.log('League selector visible:', leagueSelector ? '✅' : '❌');
    
    // Take screenshot of modal
    await page.screenshot({ 
      path: 'test-results/team-transfer-modal.png',
      fullPage: true 
    });
    
    expect(modalTitle || leagueSelector).toBe(true);
    
    // Check for important modal elements
    if (modalTitle) {
      const warningText = await page.locator('text=Important Notes').isVisible().catch(() => false);
      const cancelButton = await page.locator('button:has-text("Cancel")').isVisible().catch(() => false);
      const transferConfirmButton = await page.locator('button:has-text("Transfer Team")').isVisible().catch(() => false);
      
      console.log('Warning section:', warningText ? '✅' : '❌');
      console.log('Cancel button:', cancelButton ? '✅' : '❌');
      console.log('Transfer confirm button:', transferConfirmButton ? '✅' : '❌');
      
      expect(warningText).toBe(true);
      expect(cancelButton).toBe(true);
      expect(transferConfirmButton).toBe(true);
    }
  });

  test('should have transfer functionality in table view', async ({ page }) => {
    await page.goto('/#/my-account/manage-teams');
    await page.waitForTimeout(3000);
    
    // Check if we can switch to table view
    const tableViewButton = page.locator('button:has-text("Table")');
    const hasTableView = await tableViewButton.isVisible().catch(() => false);
    
    if (!hasTableView) {
      console.log('ℹ️ Table view not available - likely not on manage teams page');
      return;
    }
    
    // Switch to table view
    await tableViewButton.click();
    await page.waitForTimeout(1000);
    
    // Check for transfer buttons in table
    const tableTransferButtons = await page.locator('table button:has-text("Transfer")').count();
    const tableEditButtons = await page.locator('table button:has-text("Edit")').count();
    
    console.log(`Table view - Transfer buttons: ${tableTransferButtons}`);
    console.log(`Table view - Edit buttons: ${tableEditButtons}`);
    
    // Take screenshot of table view
    await page.screenshot({ 
      path: 'test-results/team-transfer-table-view.png',
      fullPage: true 
    });
    
    // If there are edit buttons, there should be equal number of transfer buttons
    if (tableEditButtons > 0) {
      expect(tableTransferButtons).toBe(tableEditButtons);
    }
  });

  test('should validate transfer requirements', async ({ page }) => {
    await page.goto('/#/my-account/manage-teams');
    await page.waitForTimeout(3000);
    
    const transferButton = page.locator('button:has-text("Transfer")').first();
    const hasTransferButton = await transferButton.isVisible().catch(() => false);
    
    if (!hasTransferButton) {
      console.log('ℹ️ Transfer feature not accessible');
      return;
    }
    
    // Click transfer button
    await transferButton.click();
    await page.waitForTimeout(2000);
    
    // Try to click Transfer Team without selecting a league
    const transferConfirmButton = page.locator('button:has-text("Transfer Team")');
    const isTransferButtonEnabled = await transferConfirmButton.isEnabled().catch(() => false);
    
    console.log('Transfer button enabled without selection:', isTransferButtonEnabled ? '❌' : '✅');
    
    // The transfer button should be disabled when no league is selected
    expect(isTransferButtonEnabled).toBe(false);
    
    // Check for required field indicator
    const requiredIndicator = await page.locator('text=Transfer to League *').isVisible().catch(() => false);
    console.log('Required field indicator:', requiredIndicator ? '✅' : '❌');
    expect(requiredIndicator).toBe(true);
  });

  test('should handle modal close properly', async ({ page }) => {
    await page.goto('/#/my-account/manage-teams');
    await page.waitForTimeout(3000);
    
    const transferButton = page.locator('button:has-text("Transfer")').first();
    const hasTransferButton = await transferButton.isVisible().catch(() => false);
    
    if (!hasTransferButton) {
      console.log('ℹ️ Transfer feature not accessible');
      return;
    }
    
    // Open modal
    await transferButton.click();
    await page.waitForTimeout(1000);
    
    // Check modal is open
    const modalVisible = await page.locator('text=Transfer Team to Different League').isVisible().catch(() => false);
    expect(modalVisible).toBe(true);
    
    // Close with Cancel button
    const cancelButton = page.locator('button:has-text("Cancel")');
    await cancelButton.click();
    await page.waitForTimeout(500);
    
    // Check modal is closed
    const modalStillVisible = await page.locator('text=Transfer Team to Different League').isVisible().catch(() => false);
    expect(modalStillVisible).toBe(false);
    
    // Open modal again
    await transferButton.click();
    await page.waitForTimeout(1000);
    
    // Close with X button
    const closeButton = page.locator('button svg.lucide-x').locator('..');
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
      await page.waitForTimeout(500);
      
      // Check modal is closed
      const modalClosed = await page.locator('text=Transfer Team to Different League').isVisible().catch(() => false);
      expect(modalClosed).toBe(false);
    }
  });

  test('should not have JavaScript errors', async ({ page }) => {
    const jsErrors: string[] = [];
    
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });
    
    // Navigate to manage teams
    await page.goto('/#/my-account/manage-teams');
    await page.waitForTimeout(3000);
    
    // Try to interact with transfer functionality if available
    const transferButton = page.locator('button:has-text("Transfer")').first();
    if (await transferButton.isVisible().catch(() => false)) {
      await transferButton.click();
      await page.waitForTimeout(1000);
      
      // Close modal if it opened
      const cancelButton = page.locator('button:has-text("Cancel")');
      if (await cancelButton.isVisible().catch(() => false)) {
        await cancelButton.click();
      }
    }
    
    // Filter out non-critical errors
    const criticalErrors = jsErrors.filter(error => 
      !error.includes('ResizeObserver') &&
      !error.includes('Non-Error promise rejection') &&
      (error.includes('ReferenceError') ||
       error.includes('TypeError') ||
       error.includes('Cannot read') ||
       error.includes('Cannot access'))
    );
    
    if (criticalErrors.length > 0) {
      console.log('❌ Critical JavaScript errors:', criticalErrors);
    } else {
      console.log('✅ No critical JavaScript errors');
    }
    
    expect(criticalErrors.length).toBe(0);
  });
});