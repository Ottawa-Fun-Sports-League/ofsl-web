import { test, expect } from '@playwright/test';

test.describe('Password Reset Debug', () => {
  test('debug admin password reset link generation and flow', async ({ page }) => {
    // Enable request interception to log all network requests
    await page.route('**/*', async (route, request) => {
      console.log(`📡 ${request.method()} ${request.url()}`);
      if (request.method() === 'POST' && request.url().includes('functions')) {
        const postData = request.postDataJSON();
        console.log(`📤 POST Data:`, postData);
      }
      await route.continue();
    });

    // Log all responses
    page.on('response', async response => {
      if (response.url().includes('api.ofsl.ca') || response.url().includes('functions')) {
        console.log(`📥 ${response.status()} ${response.url()}`);
        if (response.status() === 303) {
          const headers = response.headers();
          console.log(`🔄 Redirect Location:`, headers.location);
        }
      }
    });

    // Log console messages from the browser
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('Password reset') || msg.text().includes('session')) {
        console.log(`🖥️  Browser ${msg.type()}: ${msg.text()}`);
      }
    });

    console.log('🔐 Starting password reset debug test...');

    // Step 1: Login as admin
    console.log('📝 Step 1: Logging in as admin...');
    await page.goto('https://ofsl.ca/#/login');
    
    // Skip login for now - we'll test URL handling directly
    console.log('⏭️  Skipping login, testing URL processing directly...');
    await page.click('button[type="submit"]');

    // Wait for login to complete and navigate to users
    await page.waitForURL('**/my-account/**');
    console.log('✅ Admin logged in successfully');

    // Step 2: Navigate to Users tab
    console.log('📝 Step 2: Navigating to Users management...');
    await page.goto('https://ofsl.ca/#/my-account/users');
    await page.waitForSelector('text=Manage Users', { timeout: 10000 });
    console.log('✅ Users page loaded');

    // Step 3: Find a user and click the magic link button
    console.log('📝 Step 3: Looking for magic link button...');
    
    // Wait for users to load and find the first magic link button
    await page.waitForSelector('[title*="password reset"]', { timeout: 10000 });
    const magicLinkButton = page.locator('[title*="password reset"]').first();
    
    console.log('✅ Magic link button found');

    // Step 4: Click the magic link button to generate link
    console.log('📝 Step 4: Clicking magic link button...');
    await magicLinkButton.click();

    // Wait for the success toast to appear
    await page.waitForSelector('text=Password reset link copied', { timeout: 5000 });
    console.log('✅ Magic link generated and copied');

    // Step 5: Get the link from clipboard (this is tricky in headless mode)
    // Instead, let's intercept the response from the admin-magic-link function
    let generatedLink = '';
    
    // Wait a moment for the clipboard operation
    await page.waitForTimeout(1000);
    
    // Try to get the clipboard content (might not work in headless)
    try {
      generatedLink = await page.evaluate(() => navigator.clipboard.readText());
      console.log('📋 Generated link from clipboard:', generatedLink);
    } catch (error) {
      console.log('⚠️  Could not read from clipboard, will use intercepted response');
      // We'll need to capture this from network logs
    }

    // Step 6: Test the password reset link in a new context (incognito-like)
    console.log('📝 Step 6: Testing password reset link in new context...');
    
    if (!generatedLink) {
      console.log('❌ No link found, test cannot continue');
      return;
    }

    // Create a new browser context (like incognito)
    const newContext = await page.context().browser()?.newContext();
    if (!newContext) {
      throw new Error('Could not create new context');
    }

    const resetPage = await newContext.newPage();

    // Log network activity for the reset page
    resetPage.on('response', async response => {
      console.log(`🔗 Reset page ${response.status()} ${response.url()}`);
      if (response.status() === 303) {
        const headers = response.headers();
        console.log(`🔄 Reset redirect Location:`, headers.location);
      }
    });

    resetPage.on('console', msg => {
      console.log(`🖥️  Reset page ${msg.type()}: ${msg.text()}`);
    });

    console.log(`🔗 Opening generated link: ${generatedLink}`);
    await resetPage.goto(generatedLink);

    // Wait for navigation and check where we ended up
    await resetPage.waitForTimeout(3000); // Give time for redirects
    
    const finalUrl = resetPage.url();
    console.log(`🎯 Final URL after redirect: ${finalUrl}`);

    // Check if we're on the reset password page
    if (finalUrl.includes('reset-password')) {
      console.log('✅ Successfully redirected to reset password page!');
      
      // Check if the page shows the reset form
      try {
        await resetPage.waitForSelector('text=Reset Password', { timeout: 5000 });
        console.log('✅ Reset password form is visible');
        
        // Check if tokens are in the URL
        if (finalUrl.includes('access_token')) {
          console.log('✅ Access token found in URL');
        } else {
          console.log('❌ No access token found in URL');
        }
        
      } catch (error) {
        console.log('❌ Reset password form not found');
        const pageContent = await resetPage.content();
        console.log('📄 Page content preview:', pageContent.substring(0, 500));
      }
      
    } else if (finalUrl.includes('login')) {
      console.log('❌ Redirected to login page instead of reset password');
      
    } else {
      console.log('❌ Redirected to unexpected page');
    }

    // Check for any error messages
    const errorElements = await resetPage.locator('text=error').count();
    if (errorElements > 0) {
      console.log('❌ Error messages found on page');
    }

    await newContext.close();
    console.log('🏁 Password reset debug test completed');
  });
});