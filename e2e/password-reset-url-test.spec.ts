import { test, expect } from '@playwright/test';

test.describe('Password Reset URL Handling', () => {
  test('test reset password page URL processing', async ({ page }) => {
    // Enable verbose logging
    page.on('console', msg => {
      console.log(`🖥️  Browser ${msg.type()}: ${msg.text()}`);
    });

    page.on('response', async response => {
      if (response.status() >= 400 || response.url().includes('auth') || response.url().includes('reset')) {
        console.log(`📥 ${response.status()} ${response.url()}`);
      }
    });

    console.log('🧪 Testing reset password page URL handling...');

    // Test 1: Direct navigation to reset-password page
    console.log('📝 Test 1: Direct navigation to reset-password page');
    await page.goto('https://ofsl.ca/#/reset-password');
    
    await page.waitForTimeout(2000);
    const url1 = page.url();
    console.log(`🎯 URL after direct navigation: ${url1}`);
    
    if (url1.includes('reset-password')) {
      console.log('✅ Direct navigation to reset-password works');
      
      // Check if page content loads
      try {
        await page.waitForSelector('text=Reset Password', { timeout: 3000 });
        console.log('✅ Reset password page content loaded');
      } catch {
        console.log('❌ Reset password page content not found');
        const title = await page.locator('h1').first().textContent();
        console.log(`📄 Page title: ${title}`);
      }
    } else {
      console.log('❌ Direct navigation redirected away from reset-password');
      if (url1.includes('login')) {
        console.log('❌ Redirected to login page');
      } else if (url1.includes('complete-profile')) {
        console.log('❌ Redirected to complete-profile page');  
      }
    }

    // Test 2: Navigation with auth tokens (simulate what Supabase would do)
    console.log('📝 Test 2: Navigation with simulated auth tokens');
    const testUrl = 'https://ofsl.ca/#/reset-password#access_token=fake-token&expires_in=3600&refresh_token=fake-refresh&token_type=bearer&type=recovery';
    console.log(`🔗 Testing URL: ${testUrl}`);
    
    await page.goto(testUrl);
    await page.waitForTimeout(2000);
    
    const url2 = page.url();
    console.log(`🎯 URL after token navigation: ${url2}`);
    
    if (url2.includes('reset-password')) {
      console.log('✅ Navigation with tokens stayed on reset-password');
    } else {
      console.log('❌ Navigation with tokens redirected away');
    }

    // Test 3: Check if there are any auth context redirects
    console.log('📝 Test 3: Checking for auth context interference');
    
    // Look for any JavaScript errors or redirects
    const errors = [];
    page.on('pageerror', error => {
      errors.push(error.message);
      console.log(`❌ Page error: ${error.message}`);
    });

    await page.goto('https://ofsl.ca/#/reset-password?type=recovery');
    await page.waitForTimeout(3000);
    
    const url3 = page.url();
    console.log(`🎯 URL after type=recovery navigation: ${url3}`);
    
    if (errors.length > 0) {
      console.log(`❌ Found ${errors.length} JavaScript errors`);
    } else {
      console.log('✅ No JavaScript errors detected');
    }

    console.log('🏁 URL handling test completed');
  });

  test('test actual Supabase auth redirect format', async ({ page }) => {
    console.log('🔗 Testing actual Supabase auth redirect format...');
    
    page.on('console', msg => {
      if (msg.text().includes('Password reset') || msg.text().includes('session') || msg.text().includes('token')) {
        console.log(`🖥️  ${msg.type()}: ${msg.text()}`);
      }
    });

    // This simulates what Supabase actually does when processing a recovery link
    // It redirects to the specified URL and appends auth tokens as URL fragments
    const supabaseStyleUrl = 'https://ofsl.ca/#/reset-password#access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test&expires_in=3600&refresh_token=test-refresh-token&token_type=bearer&type=recovery';
    
    console.log(`🔗 Testing Supabase-style URL: ${supabaseStyleUrl.substring(0, 100)}...`);
    
    await page.goto(supabaseStyleUrl);
    await page.waitForTimeout(3000);
    
    const finalUrl = page.url();
    console.log(`🎯 Final URL: ${finalUrl}`);
    
    if (finalUrl.includes('reset-password')) {
      console.log('✅ Supabase-style URL works');
      
      // Check if our ResetPasswordPage detects the tokens
      const pageContent = await page.textContent('body');
      if (pageContent?.includes('Validating reset link')) {
        console.log('✅ Reset page is validating tokens');
      } else if (pageContent?.includes('Reset Password')) {
        console.log('✅ Reset password form is showing');
      } else {
        console.log('❌ Unexpected page content');
      }
      
    } else {
      console.log('❌ Supabase-style URL redirected away');
    }
  });
});