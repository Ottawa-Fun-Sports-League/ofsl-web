import { test, expect } from './fixtures/auth.fixture';

test.describe('Admin User Management', () => {
  test('should display admin dashboard', async ({ adminPage: page }) => {
    await page.goto('/my-account');
    
    // Admin should see admin-only sections
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
    await expect(page.locator('a:has-text("Manage Users")')).toBeVisible();
    await expect(page.locator('a:has-text("Manage Leagues")')).toBeVisible();
  });

  test('should list all users', async ({ adminPage: page }) => {
    // Mock users data
    await page.route('**/rest/v1/users*', async route => {
      await route.fulfill({
        status: 200,
        json: [
          { id: '1', name: 'John Doe', email: 'john@example.com', is_admin: false },
          { id: '2', name: 'Jane Smith', email: 'jane@example.com', is_admin: false },
          { id: '3', name: 'Admin User', email: 'admin@example.com', is_admin: true }
        ]
      });
    });
    
    await page.goto('/my-account/users');
    
    // Should show users table
    await expect(page.locator('h1:has-text("Manage Users")')).toBeVisible();
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=Jane Smith')).toBeVisible();
    await expect(page.locator('text=Admin User')).toBeVisible();
    
    // Should show admin badge
    await expect(page.locator('text=Admin User').locator('..').locator('text=Admin')).toBeVisible();
  });

  test('should search and filter users', async ({ adminPage: page }) => {
    await page.goto('/my-account/users');
    
    // Search by name
    await page.fill('input[placeholder="Search users..."]', 'John');
    
    // Mock filtered results
    await page.route('**/rest/v1/users*', async route => {
      if (route.request().url().includes('John')) {
        await route.fulfill({
          status: 200,
          json: [
            { id: '1', name: 'John Doe', email: 'john@example.com' }
          ]
        });
      }
    });
    
    // Should only show matching user
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=Jane Smith')).not.toBeVisible();
    
    // Filter by sport
    await page.selectOption('select[name="sport"]', 'volleyball');
    
    // Should apply sport filter
    await expect(page.url()).toContain('sport=volleyball');
  });

  test('should export users to CSV', async ({ adminPage: page }) => {
    await page.goto('/my-account/users');
    
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    
    await page.route('**/export/users*', async route => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="users-export.csv"'
        },
        body: 'name,email,phone\nJohn Doe,john@example.com,555-0100'
      });
    });
    
    await page.locator('button:has-text("Export to CSV")').click();
    
    // Should download CSV
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('users-export.csv');
  });

  test('should view user registrations', async ({ adminPage: page }) => {
    await page.goto('/my-account/users');
    
    // Click on a user
    await page.locator('text=John Doe').click();
    
    // Should navigate to user details
    await expect(page).toHaveURL(/.*users.*registrations/);
    
    // Mock user registrations
    await page.route('**/rest/v1/registrations*', async route => {
      await route.fulfill({
        status: 200,
        json: [
          {
            team_name: 'Team Alpha',
            league_name: 'Summer League',
            role: 'player',
            payment_status: 'paid'
          },
          {
            league_name: 'Badminton Drop-in',
            payment_status: 'pending'
          }
        ]
      });
    });
    
    // Should show user's registrations
    await expect(page.locator('h1:has-text("John Doe - Registrations")')).toBeVisible();
    await expect(page.locator('text=Team Alpha')).toBeVisible();
    await expect(page.locator('text=Summer League')).toBeVisible();
    await expect(page.locator('text=Badminton Drop-in')).toBeVisible();
  });

  test('should edit user payment', async ({ adminPage: page }) => {
    await page.goto('/my-account/individual/edit/user1/league1');
    
    // Should show payment edit form
    await expect(page.locator('h1:has-text("Edit Payment")')).toBeVisible();
    
    // Record a payment
    await page.fill('input[name="paymentAmount"]', '50');
    await page.selectOption('select[name="paymentMethod"]', 'e-transfer');
    await page.fill('textarea[name="notes"]', 'Partial payment received');
    
    // Mock payment update
    await page.route('**/rest/v1/league_payments*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          json: {
            amount_paid: 50,
            status: 'partial'
          }
        });
      }
    });
    
    await page.locator('button:has-text("Save Payment")').click();
    
    // Should show success
    await expect(page.locator('text=Payment updated successfully')).toBeVisible();
  });

  test('should manage league settings', async ({ adminPage: page }) => {
    await page.goto('/my-account/leagues/1/edit');
    
    // Should show league edit form
    await expect(page.locator('h1:has-text("Edit League")')).toBeVisible();
    
    // Update league details
    await page.fill('input[name="maxTeams"]', '24');
    await page.fill('input[name="cost"]', '150');
    
    // Mock league update
    await page.route('**/rest/v1/leagues*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          json: {
            max_teams: 24,
            cost: 150
          }
        });
      }
    });
    
    await page.locator('button:has-text("Save Changes")').click();
    
    // Should show success
    await expect(page.locator('text=League updated successfully')).toBeVisible();
  });

  test('should send bulk emails', async ({ adminPage: page }) => {
    await page.goto('/my-account/users');
    
    // Select users for bulk email
    await page.locator('input[type="checkbox"][name="user-1"]').check();
    await page.locator('input[type="checkbox"][name="user-2"]').check();
    
    // Click send email
    await page.locator('button:has-text("Send Email to Selected")').click();
    
    // Should open email modal
    await expect(page.locator('h2:has-text("Send Bulk Email")')).toBeVisible();
    
    // Fill email details
    await page.fill('input[name="subject"]', 'Important League Update');
    await page.fill('textarea[name="message"]', 'Please note the schedule change...');
    
    // Mock email send
    await page.route('**/send-bulk-email', async route => {
      await route.fulfill({
        status: 200,
        json: { sent: 2 }
      });
    });
    
    await page.locator('button:has-text("Send Email")').click();
    
    // Should show success
    await expect(page.locator('text=Email sent to 2 users')).toBeVisible();
  });
});