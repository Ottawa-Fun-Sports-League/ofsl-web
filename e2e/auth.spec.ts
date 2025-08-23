import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display sign up page', async ({ page }) => {
    await page.goto('/signup');
    
    // Check that the sign up page loads
    await expect(page.locator('h1')).toContainText('Join OFSL');
    await expect(page.locator('button:has-text("Sign up with Google")')).toBeVisible();
    
    // Check for form elements
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Sign Up');
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    
    // Check that the login page loads
    await expect(page.locator('h1')).toContainText('Welcome Back');
    await expect(page.locator('button:has-text("Sign in with Google")')).toBeVisible();
    
    // Check for form elements
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Login');
  });

  test('should show validation errors for invalid input', async ({ page }) => {
    await page.goto('/signup');
    
    // Try to submit with empty fields
    await page.locator('button[type="submit"]').click();
    
    // Check for validation messages
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
    
    // Try with invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', '123');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('text=Please enter a valid email')).toBeVisible();
    await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible();
  });

  test('should redirect to profile completion after signup', async ({ page }) => {
    await page.goto('/signup');
    
    // Fill in valid signup details
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'ValidPassword123!');
    
    // Mock successful signup response
    await page.route('**/auth/v1/signup', async route => {
      await route.fulfill({
        status: 200,
        json: {
          user: { id: 'new-user-id', email: 'newuser@example.com' },
          session: { access_token: 'token', refresh_token: 'refresh' }
        }
      });
    });
    
    await page.locator('button[type="submit"]').click();
    
    // Should redirect to complete profile
    await expect(page).toHaveURL(/.*complete-profile/);
  });

  test('should handle Google OAuth login', async ({ page }) => {
    await page.goto('/login');
    
    // Mock Google OAuth redirect
    await page.route('**/auth/v1/authorize*', async route => {
      if (route.request().url().includes('google')) {
        await route.fulfill({
          status: 302,
          headers: {
            'Location': 'http://localhost:5173/#/my-account?access_token=mock-token'
          }
        });
      }
    });
    
    // Click Google sign in
    await page.locator('button:has-text("Sign in with Google")').click();
    
    // Should redirect to my account
    await expect(page).toHaveURL(/.*my-account/);
  });

  test('should show forgot password flow', async ({ page }) => {
    await page.goto('/login');
    
    // Click forgot password link
    await page.locator('a:has-text("Forgot your password?")').click();
    
    // Should navigate to forgot password page
    await expect(page).toHaveURL(/.*forgot-password/);
    await expect(page.locator('h1')).toContainText('Reset Password');
    
    // Fill in email
    await page.fill('input[name="email"]', 'user@example.com');
    
    // Mock password reset request
    await page.route('**/auth/v1/recover', async route => {
      await route.fulfill({
        status: 200,
        json: {}
      });
    });
    
    await page.locator('button[type="submit"]').click();
    
    // Should show success message
    await expect(page.locator('text=Check your email for a password reset link')).toBeVisible();
  });

  test('should protect authenticated routes', async ({ page }) => {
    // Try to access protected route without auth
    await page.goto('/my-account');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });
});