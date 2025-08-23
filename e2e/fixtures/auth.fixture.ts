import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Extend basic test with our custom fixtures
export const test = base.extend<{
  authenticatedPage: Page;
  adminPage: Page;
}>({
  // Fixture for authenticated regular user
  authenticatedPage: async ({ page }, use) => {
    // Mock authentication for regular user
    await page.addInitScript(() => {
      // Mock localStorage auth token
      localStorage.setItem('sb-auth-token', JSON.stringify({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Date.now() + 3600000,
      }));
    });
    
    await use(page);
  },

  // Fixture for authenticated admin user
  adminPage: async ({ page }, use) => {
    // Mock authentication for admin user
    await page.addInitScript(() => {
      localStorage.setItem('sb-auth-token', JSON.stringify({
        access_token: 'mock-admin-token',
        refresh_token: 'mock-admin-refresh-token',
        expires_at: Date.now() + 3600000,
      }));
      
      // Mock admin user profile
      localStorage.setItem('user-profile', JSON.stringify({
        id: 'admin-user-id',
        name: 'Admin User',
        email: 'admin@ofsl.ca',
        is_admin: true,
      }));
    });
    
    await use(page);
  },
});

export { expect };