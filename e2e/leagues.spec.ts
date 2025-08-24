import { test, expect } from './fixtures/auth.fixture';

test.describe('League Management', () => {
  test('should display list of leagues', async ({ page }) => {
    await page.goto('/#/leagues');
    
    // Check that leagues page loads
    await expect(page.locator('h1')).toContainText('Leagues');
    
    // Should show filter options
    await expect(page.locator('text=Filter by Sport')).toBeVisible();
    await expect(page.locator('text=Filter by Season')).toBeVisible();
    
    // Should display league cards
    await expect(page.locator('.league-card').first()).toBeVisible();
  });

  test('should filter leagues by sport', async ({ page }) => {
    await page.goto('/#/leagues');
    
    // Mock leagues data
    await page.route('**/rest/v1/leagues*', async route => {
      const url = new URL(route.request().url());
      const sportFilter = url.searchParams.get('sport_id');
      
      const leagues = sportFilter === '1' ? [
        { id: 1, name: 'Volleyball League', sport_id: 1 }
      ] : [
        { id: 2, name: 'Badminton League', sport_id: 2 }
      ];
      
      await route.fulfill({
        status: 200,
        json: leagues
      });
    });
    
    // Select volleyball filter
    await page.selectOption('select[name="sport"]', '1');
    
    // Should only show volleyball leagues
    await expect(page.locator('text=Volleyball League')).toBeVisible();
    await expect(page.locator('text=Badminton League')).not.toBeVisible();
  });

  test('should display league details', async ({ page }) => {
    // Mock league data
    await page.route('**/rest/v1/leagues*', async route => {
      if (route.request().url().includes('id=eq.1')) {
        await route.fulfill({
          status: 200,
          json: [{
            id: 1,
            name: 'Summer Volleyball League',
            location: 'Ottawa Sports Complex',
            cost: 120,
            start_date: '2024-06-01',
            end_date: '2024-08-31',
            max_teams: 20,
            team_registration: true
          }]
        });
      }
    });
    
    await page.goto('/#/leagues/1');
    
    // Check league details are displayed
    await expect(page.locator('h1')).toContainText('Summer Volleyball League');
    await expect(page.locator('text=Ottawa Sports Complex')).toBeVisible();
    await expect(page.locator('text=$120')).toBeVisible();
    await expect(page.locator('text=June 1, 2024')).toBeVisible();
    
    // Should show registration button
    await expect(page.locator('button:has-text("Register")')).toBeVisible();
  });

  test('should handle team registration', async ({ authenticatedPage: page }) => {
    await page.goto('/#/leagues/1');
    
    // Click register button
    await page.locator('button:has-text("Register Team")').click();
    
    // Should open registration modal
    await expect(page.locator('h2:has-text("Team Registration")')).toBeVisible();
    
    // Fill in team details
    await page.fill('input[name="teamName"]', 'Test Team');
    await page.selectOption('select[name="skillLevel"]', 'intermediate');
    
    // Mock registration API
    await page.route('**/rest/v1/teams', async route => {
      await route.fulfill({
        status: 201,
        json: { id: 123, name: 'Test Team' }
      });
    });
    
    await page.locator('button:has-text("Complete Registration")').click();
    
    // Should show success message
    await expect(page.locator('text=Registration successful')).toBeVisible();
  });

  test('should handle individual registration', async ({ authenticatedPage: page }) => {
    // Mock individual sport league
    await page.route('**/rest/v1/leagues*', async route => {
      await route.fulfill({
        status: 200,
        json: [{
          id: 2,
          name: 'Badminton Drop-in',
          team_registration: false,
          cost: 80
        }]
      });
    });
    
    await page.goto('/#/leagues/2');
    
    // Click register button for individual
    await page.locator('button:has-text("Register")').click();
    
    // Should open individual registration modal
    await expect(page.locator('h2:has-text("Individual Registration")')).toBeVisible();
    
    // Select skill level
    await page.selectOption('select[name="skillLevel"]', 'advanced');
    
    // Mock registration
    await page.route('**/rest/v1/league_payments', async route => {
      await route.fulfill({
        status: 201,
        json: { id: 456, user_id: 'user-id', league_id: 2 }
      });
    });
    
    await page.locator('button:has-text("Complete Registration")').click();
    
    // Should show success
    await expect(page.locator('text=Successfully registered')).toBeVisible();
  });

  test('should show registered teams for a league', async ({ page }) => {
    // Mock teams data
    await page.route('**/rest/v1/teams*', async route => {
      await route.fulfill({
        status: 200,
        json: [
          { id: 1, name: 'Team Alpha', captain_id: 'user1', active: true },
          { id: 2, name: 'Team Beta', captain_id: 'user2', active: true },
          { id: 3, name: 'Team Gamma', captain_id: 'user3', active: false }
        ]
      });
    });
    
    await page.goto('/#/leagues/1/teams');
    
    // Should display registered teams
    await expect(page.locator('h1')).toContainText('Registered Teams');
    await expect(page.locator('text=Team Alpha')).toBeVisible();
    await expect(page.locator('text=Team Beta')).toBeVisible();
    
    // Should show waitlisted teams separately
    await expect(page.locator('h2:has-text("Waitlist")')).toBeVisible();
    await expect(page.locator('text=Team Gamma')).toBeVisible();
  });
});