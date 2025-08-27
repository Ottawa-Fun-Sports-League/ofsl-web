import { test, expect } from './fixtures/auth.fixture';

test.describe('Waitlist Management', () => {
  test('should show waitlist option when league is full', async ({ authenticatedPage: page }) => {
    // Mock full league
    await page.route('**/rest/v1/leagues*', async route => {
      await route.fulfill({
        status: 200,
        json: [{
          id: 1,
          name: 'Popular League',
          max_teams: 10,
          current_teams: 10,
          team_registration: true
        }]
      });
    });
    
    await page.goto('/#/leagues/1');
    
    // Should show league is full
    await expect(page.locator('text=League Full')).toBeVisible();
    
    // Should show join waitlist button
    await expect(page.locator('button:has-text("Join Waitlist")')).toBeVisible();
    await expect(page.locator('button:has-text("Register")')).not.toBeVisible();
  });

  test('should join team waitlist', async ({ authenticatedPage: page }) => {
    await page.goto('/#/leagues/1');
    
    // Click join waitlist
    await page.locator('button:has-text("Join Waitlist")').click();
    
    // Should open waitlist modal
    await expect(page.locator('h2:has-text("Join Waitlist")')).toBeVisible();
    await expect(page.locator('text=You will be notified when a spot becomes available')).toBeVisible();
    
    // Fill team details
    await page.fill('input[name="teamName"]', 'Waitlist Team');
    await page.selectOption('select[name="skillLevel"]', 'beginner');
    
    // Mock waitlist API
    await page.route('**/rest/v1/teams', async route => {
      await route.fulfill({
        status: 201,
        json: {
          id: 99,
          name: 'Waitlist Team',
          active: false // Waitlisted
        }
      });
    });
    
    await page.locator('button:has-text("Join Waitlist")').click();
    
    // Should show success
    await expect(page.locator('text=Successfully added to waitlist')).toBeVisible();
    await expect(page.locator('text=You are #3 on the waitlist')).toBeVisible();
  });

  test('should join individual waitlist', async ({ authenticatedPage: page }) => {
    // Mock individual sport league
    await page.route('**/rest/v1/leagues*', async route => {
      await route.fulfill({
        status: 200,
        json: [{
          id: 2,
          name: 'Badminton League',
          team_registration: false,
          max_players: 30,
          current_players: 30
        }]
      });
    });
    
    await page.goto('/#/leagues/2');
    
    // Should show join waitlist for individuals
    await page.locator('button:has-text("Join Waitlist")').click();
    
    // Should show individual waitlist modal
    await expect(page.locator('h2:has-text("Join Individual Waitlist")')).toBeVisible();
    
    // Select skill level
    await page.selectOption('select[name="skillLevel"]', 'intermediate');
    
    // Mock individual waitlist API
    await page.route('**/rest/v1/league_payments', async route => {
      await route.fulfill({
        status: 201,
        json: {
          id: 88,
          user_id: 'current-user',
          league_id: 2,
          is_waitlisted: true,
          amount_due: 0 // No payment for waitlist
        }
      });
    });
    
    await page.locator('button:has-text("Confirm")').click();
    
    // Should show success
    await expect(page.locator('text=Added to individual waitlist')).toBeVisible();
  });

  test('should display waitlist status in My Leagues', async ({ authenticatedPage: page }) => {
    // Mock user's registrations including waitlisted
    await page.route('**/rest/v1/league_payments*', async route => {
      await route.fulfill({
        status: 200,
        json: [
          {
            id: 1,
            league_id: 1,
            league_name: 'Active League',
            is_waitlisted: false,
            amount_due: 120
          },
          {
            id: 2,
            league_id: 2,
            league_name: 'Waitlisted League',
            is_waitlisted: true,
            amount_due: 0
          }
        ]
      });
    });
    
    await page.goto('/#/my-account');
    
    // Should show both active and waitlisted leagues
    await expect(page.locator('text=Active League')).toBeVisible();
    await expect(page.locator('text=Active League').locator('..').locator('text=Active')).toBeVisible();
    
    await expect(page.locator('text=Waitlisted League')).toBeVisible();
    await expect(page.locator('text=Waitlisted League').locator('..').locator('text=Waitlisted')).toBeVisible();
  });

  test('should allow cancelling waitlist registration', async ({ authenticatedPage: page }) => {
    await page.goto('/#/my-account');
    
    // Find waitlisted registration
    const waitlistedCard = page.locator('text=Waitlisted League').locator('..');
    
    // Click cancel registration
    await waitlistedCard.locator('button:has-text("Cancel Registration")').click();
    
    // Confirm cancellation
    await page.locator('button:has-text("Confirm Cancel")').click();
    
    // Mock cancellation API
    await page.route('**/rest/v1/league_payments*', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204 });
      }
    });
    
    // Should remove from list
    await expect(page.locator('text=Waitlisted League')).not.toBeVisible();
    await expect(page.locator('text=Waitlist registration cancelled')).toBeVisible();
  });

  test('admin should manage waitlist', async ({ adminPage: page }) => {
    // Mock waitlisted teams
    await page.route('**/rest/v1/teams*', async route => {
      await route.fulfill({
        status: 200,
        json: [
          { id: 1, name: 'Active Team', active: true },
          { id: 2, name: 'Waitlist Team 1', active: false },
          { id: 3, name: 'Waitlist Team 2', active: false }
        ]
      });
    });
    
    await page.goto('/#/leagues/1/teams');
    
    // Should show waitlist section
    await expect(page.locator('h2:has-text("Waitlist")')).toBeVisible();
    await expect(page.locator('text=Waitlist Team 1')).toBeVisible();
    await expect(page.locator('text=Waitlist Team 2')).toBeVisible();
    
    // Move team from waitlist to active
    const waitlistCard = page.locator('text=Waitlist Team 1').locator('..');
    await waitlistCard.locator('button:has-text("Move to Active")').click();
    
    // Confirm move
    await page.locator('button:has-text("Confirm Move")').click();
    
    // Mock move API
    await page.route('**/rest/v1/teams*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          json: { active: true }
        });
      }
    });
    
    // Should move to active section
    await expect(page.locator('h2:has-text("Registered Teams")').locator('..').locator('text=Waitlist Team 1')).toBeVisible();
  });

  test('admin should move active to waitlist', async ({ adminPage: page }) => {
    await page.goto('/#/leagues/1/teams');
    
    // Find active team
    const activeCard = page.locator('text=Active Team').locator('..');
    
    // Move to waitlist
    await activeCard.locator('button:has-text("Move to Waitlist")').click();
    
    // Confirm move
    await page.locator('button:has-text("Confirm Move")').click();
    
    // Mock move API
    await page.route('**/rest/v1/teams*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          json: { active: false }
        });
      }
    });
    
    // Should move to waitlist section
    await expect(page.locator('h2:has-text("Waitlist")').locator('..').locator('text=Active Team')).toBeVisible();
  });

  test('should update payment when moved from waitlist to active', async ({ adminPage: page }) => {
    // Mock individual players
    await page.route('**/rest/v1/league_payments*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          json: [
            {
              id: 1,
              user_id: 'user1',
              user_name: 'John Doe',
              is_waitlisted: true,
              amount_due: 0
            }
          ]
        });
      }
    });
    
    await page.goto('/#/leagues/2/teams'); // Individual league
    
    // Find waitlisted player
    const playerCard = page.locator('text=John Doe').locator('..');
    
    // Move to active
    await playerCard.locator('button:has-text("Move to Active")').click();
    await page.locator('button:has-text("Confirm")').click();
    
    // Mock update with payment amount
    await page.route('**/rest/v1/league_payments*', async route => {
      if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON();
        expect(body.is_waitlisted).toBe(false);
        expect(body.amount_due).toBe(80); // League cost
        
        await route.fulfill({
          status: 200,
          json: {
            is_waitlisted: false,
            amount_due: 80,
            status: 'pending'
          }
        });
      }
    });
    
    // Should update payment status
    await expect(page.locator('text=John Doe').locator('..').locator('text=$80.00')).toBeVisible();
    await expect(page.locator('text=John Doe').locator('..').locator('text=Pending')).toBeVisible();
  });

  test('should show waitlist position', async ({ authenticatedPage: page }) => {
    // Mock waitlist with position
    await page.route('**/rest/v1/rpc/get_waitlist_position', async route => {
      await route.fulfill({
        status: 200,
        json: { position: 5 }
      });
    });
    
    await page.goto('/#/my-account');
    
    // Should show waitlist position
    const waitlistedCard = page.locator('text=Waitlisted League').locator('..');
    await expect(waitlistedCard.locator('text=Waitlist Position: #5')).toBeVisible();
  });
});