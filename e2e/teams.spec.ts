import { test, expect } from './fixtures/auth.fixture';

test.describe('Team Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user teams data
    await page.route('**/rest/v1/teams*', async route => {
      if (route.request().url().includes('roster')) {
        await route.fulfill({
          status: 200,
          json: [
            {
              id: 1,
              name: 'My Volleyball Team',
              captain_id: 'current-user',
              roster: ['current-user', 'player2', 'player3'],
              league: { name: 'Summer League' }
            },
            {
              id: 2,
              name: 'Another Team',
              captain_id: 'player2',
              roster: ['current-user', 'player2', 'player4'],
              league: { name: 'Fall League' }
            }
          ]
        });
      }
    });
  });

  test('should display my teams', async ({ authenticatedPage: page }) => {
    await page.goto('/my-account/teams');
    
    // Should show teams section
    await expect(page.locator('h2:has-text("My Teams")')).toBeVisible();
    
    // Should display user's teams
    await expect(page.locator('text=My Volleyball Team')).toBeVisible();
    await expect(page.locator('text=Another Team')).toBeVisible();
    
    // Should show captain badge for teams user captains
    await expect(page.locator('text=My Volleyball Team').locator('..').locator('text=Captain')).toBeVisible();
  });

  test('should allow captain to edit team', async ({ authenticatedPage: page }) => {
    await page.goto('/my-account/teams/edit/1');
    
    // Should show edit form
    await expect(page.locator('h1:has-text("Edit Team")')).toBeVisible();
    await expect(page.locator('input[name="teamName"]')).toHaveValue('My Volleyball Team');
    
    // Change team name
    await page.fill('input[name="teamName"]', 'Updated Team Name');
    
    // Mock update API
    await page.route('**/rest/v1/teams*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          json: { id: 1, name: 'Updated Team Name' }
        });
      }
    });
    
    await page.locator('button:has-text("Save Changes")').click();
    
    // Should show success message
    await expect(page.locator('text=Team updated successfully')).toBeVisible();
  });

  test('should manage team roster', async ({ authenticatedPage: page }) => {
    await page.goto('/my-account/teams/edit/1');
    
    // Should show roster management section
    await expect(page.locator('h2:has-text("Team Roster")')).toBeVisible();
    
    // Should display current players
    await expect(page.locator('text=player2@example.com')).toBeVisible();
    await expect(page.locator('text=player3@example.com')).toBeVisible();
    
    // Add new player
    await page.fill('input[placeholder="Enter player email"]', 'newplayer@example.com');
    await page.locator('button:has-text("Add Player")').click();
    
    // Mock add player API
    await page.route('**/rest/v1/teams*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          json: {
            roster: ['current-user', 'player2', 'player3', 'newplayer']
          }
        });
      }
    });
    
    // Should show new player in roster
    await expect(page.locator('text=newplayer@example.com')).toBeVisible();
  });

  test('should remove player from roster', async ({ authenticatedPage: page }) => {
    await page.goto('/my-account/teams/edit/1');
    
    // Find remove button for a player
    const playerRow = page.locator('text=player2@example.com').locator('..');
    await playerRow.locator('button[title="Remove player"]').click();
    
    // Confirm removal
    await page.locator('button:has-text("Confirm Remove")').click();
    
    // Mock remove player API
    await page.route('**/rest/v1/teams*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          json: {
            roster: ['current-user', 'player3']
          }
        });
      }
    });
    
    // Player should be removed
    await expect(page.locator('text=player2@example.com')).not.toBeVisible();
    await expect(page.locator('text=Player removed from team')).toBeVisible();
  });

  test('should transfer captain role', async ({ authenticatedPage: page }) => {
    await page.goto('/my-account/teams/edit/1');
    
    // Click transfer captain button
    await page.locator('button:has-text("Transfer Captain Role")').click();
    
    // Should show transfer modal
    await expect(page.locator('h2:has-text("Transfer Captain Role")')).toBeVisible();
    
    // Select new captain
    await page.selectOption('select[name="newCaptain"]', 'player2');
    
    // Mock transfer API
    await page.route('**/rest/v1/teams*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          json: { captain_id: 'player2' }
        });
      }
    });
    
    await page.locator('button:has-text("Confirm Transfer")').click();
    
    // Should show success message
    await expect(page.locator('text=Captain role transferred successfully')).toBeVisible();
  });

  test('should leave team as non-captain', async ({ authenticatedPage: page }) => {
    await page.goto('/my-account/teams');
    
    // Find team where user is not captain
    const teamCard = page.locator('text=Another Team').locator('..');
    await teamCard.locator('button:has-text("Leave Team")').click();
    
    // Confirm leaving
    await page.locator('button:has-text("Confirm Leave")').click();
    
    // Mock leave team API
    await page.route('**/rest/v1/teams*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          json: {
            roster: ['player2', 'player4']
          }
        });
      }
    });
    
    // Team should be removed from list
    await expect(page.locator('text=Another Team')).not.toBeVisible();
    await expect(page.locator('text=Successfully left team')).toBeVisible();
  });

  test('should show team payment status', async ({ authenticatedPage: page }) => {
    // Mock payment data
    await page.route('**/rest/v1/league_payments*', async route => {
      await route.fulfill({
        status: 200,
        json: [
          {
            team_id: 1,
            amount_due: 500,
            amount_paid: 250,
            status: 'partial'
          }
        ]
      });
    });
    
    await page.goto('/my-account/teams');
    
    // Should show payment status badge
    await expect(page.locator('text=My Volleyball Team').locator('..').locator('text=Partial Payment')).toBeVisible();
    await expect(page.locator('text=$250.00 / $500.00')).toBeVisible();
  });
});