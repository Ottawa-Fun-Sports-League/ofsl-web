# E2E Tests with Playwright

This directory contains end-to-end tests for the OFSL web application using Playwright.

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests with UI mode (recommended for development)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug tests
```bash
npm run test:e2e:debug
```

### Run specific test file
```bash
npx playwright test e2e/auth.spec.ts
```

### Run tests in specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Structure

- `auth.spec.ts` - Authentication flow tests (login, signup, password reset)
- `leagues.spec.ts` - League browsing and registration tests
- `teams.spec.ts` - Team management tests
- `payments.spec.ts` - Payment processing tests
- `waitlist.spec.ts` - Waitlist management tests
- `admin.spec.ts` - Admin functionality tests
- `fixtures/` - Test fixtures and helpers
  - `auth.fixture.ts` - Authentication helpers

## Writing Tests

Tests use Playwright's test runner with custom fixtures for authentication:

```typescript
import { test, expect } from './fixtures/auth.fixture';

test('authenticated user test', async ({ authenticatedPage: page }) => {
  // This page is already authenticated as a regular user
  await page.goto('/my-account');
  await expect(page.locator('h1')).toContainText('My Account');
});

test('admin test', async ({ adminPage: page }) => {
  // This page is authenticated as an admin
  await page.goto('/admin');
  await expect(page.locator('h1')).toContainText('Admin Dashboard');
});
```

## Environment Variables

Tests use the following environment variables from `.env`:
- `VITE_SUPABASE_URL` - Supabase API URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `PLAYWRIGHT_BASE_URL` - Base URL for tests (defaults to http://localhost:5173)

## CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main`

The CI workflow:
1. Installs dependencies
2. Installs Playwright browsers
3. Runs all E2E tests
4. Uploads test reports and artifacts

## Debugging Failed Tests

When tests fail, Playwright provides:
- Screenshots on failure
- Videos of test execution
- Trace files for debugging

View test reports:
```bash
npx playwright show-report
```

View trace:
```bash
npx playwright show-trace trace.zip
```