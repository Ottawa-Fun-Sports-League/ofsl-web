import { test, expect } from '@playwright/test';

test.describe('Auth Redirect Handler', () => {
  test('test auth-redirect page processing', async ({ page }) => {
    // Enable verbose logging
    page.on('console', msg => {
      console.log(`🖥️  ${msg.type()}: ${msg.text()}`);
    });

    console.log('🔄 Testing auth-redirect page...');

    // Test 1: Basic auth-redirect functionality
    console.log('📝 Test 1: Basic auth-redirect without tokens');
    await page.goto('https://ofsl.ca/auth-redirect?page=reset-password');
    
    await page.waitForTimeout(2000);
    const url1 = page.url();
    console.log(`🎯 URL after basic redirect: ${url1}`);
    
    if (url1.includes('#/reset-password')) {
      console.log('✅ Basic auth-redirect works');
    } else {
      console.log('❌ Basic auth-redirect failed');
    }

    // Test 2: Auth-redirect with simulated Supabase tokens
    console.log('📝 Test 2: Auth-redirect with simulated Supabase tokens');
    const testUrl = 'https://ofsl.ca/auth-redirect?page=reset-password#access_token=test-token&expires_in=3600&refresh_token=test-refresh&token_type=bearer&type=recovery';
    console.log(`🔗 Testing URL: ${testUrl}`);
    
    await page.goto(testUrl);
    await page.waitForTimeout(3000);
    
    const url2 = page.url();
    console.log(`🎯 URL after token redirect: ${url2}`);
    
    if (url2.includes('#/reset-password') && url2.includes('access_token')) {
      console.log('✅ Auth-redirect with tokens works');
    } else {
      console.log('❌ Auth-redirect with tokens failed');
    }
    
    // Check if we ended up on the reset password page
    try {
      await page.waitForSelector('text=Reset Password', { timeout: 5000 });
      console.log('✅ Reset password page loaded successfully');
    } catch {
      console.log('❌ Reset password page did not load');
    }
  });
});