# OFSL Web Application - Testing Guide

This guide provides comprehensive information about the testing infrastructure, running tests, and maintaining test quality for the Ottawa Fun Sports League (OFSL) web application.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Test Infrastructure](#test-infrastructure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Organization](#test-organization)
- [Common Testing Patterns](#common-testing-patterns)
- [Debugging Tests](#debugging-tests)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## Testing Philosophy

Our testing strategy focuses on:

1. **Integration Tests First**: We prioritize integration tests that verify complete user flows
2. **Realistic Scenarios**: Tests simulate real user interactions and API responses
3. **Maintainability**: Tests are written to be resilient to implementation changes
4. **Comprehensive Coverage**: Every major route and feature has corresponding tests

## Test Infrastructure

### Test Framework

- **Vitest**: Modern, fast test runner with excellent TypeScript support
- **React Testing Library (RTL)**: For testing React components
- **@testing-library/user-event**: For simulating user interactions

### Key Configuration Files

#### `vite.config.ts`
```typescript
test: {
  environment: 'jsdom',
  setupFiles: './src/test/setup.ts',
  globals: true,
}
```

#### `src/test/setup.ts`
- Configures global test environment
- Sets up DOM mocks (localStorage, sessionStorage, etc.)
- Configures window.location and other browser APIs
- Imports `@testing-library/jest-dom` matchers

### Test Utilities

#### `src/test/test-utils.tsx`
Custom render function with providers:
- React Router (MemoryRouter)
- AuthContext
- ToastProvider
- Supabase mocks

#### `src/test/mocks/supabase-enhanced.ts`
Comprehensive Supabase client mock with chainable methods

## Running Tests

### Basic Commands

```bash
# Run tests in watch mode (development)
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Running Specific Tests

```bash
# Run tests matching a pattern
npm test LoginPage

# Run tests in a specific file
npm test src/screens/LoginPage/LoginPage.test.tsx

# Run tests with a specific describe block
npm test -- -t "LoginPage"
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from './ComponentName';
import { render, mockNavigate } from '../../test/test-utils';
import { mockSupabase } from '../../test/mocks/supabase-enhanced';

describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders component with expected elements', () => {
    render(<ComponentName />);
    
    expect(screen.getByRole('heading', { name: /title/i })).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    render(<ComponentName />);
    
    const button = screen.getByRole('button', { name: /click me/i });
    await user.click(button);
    
    expect(await screen.findByText(/success/i)).toBeInTheDocument();
  });
});
```

### Testing Authenticated Routes

```typescript
it('shows content for authenticated users', async () => {
  render(<ProtectedComponent />, {
    user: mockUser,
    userProfile: mockUserProfile,
  });
  
  expect(await screen.findByText(/welcome/i)).toBeInTheDocument();
});
```

### Testing API Calls

```typescript
it('fetches and displays data', async () => {
  mockSupabase.from('leagues').select().eq().order().then = 
    vi.fn().mockResolvedValue({
      data: mockLeagues,
      error: null,
    });
  
  render(<LeaguesPage />);
  
  await waitFor(() => {
    expect(screen.getByText('Spring League')).toBeInTheDocument();
  });
});
```

## Test Organization

### File Structure

```
src/
├── screens/
│   ├── LoginPage/
│   │   ├── LoginPage.tsx
│   │   └── LoginPage.test.tsx
│   └── HomePage/
│       ├── HomePage.tsx
│       └── HomePage.test.tsx
├── components/
│   └── ui/
│       ├── Button.tsx
│       └── Button.test.tsx
└── test/
    ├── setup.ts
    ├── test-utils.tsx
    └── mocks/
        └── supabase-enhanced.ts
```

### Test Categories

1. **Authentication Tests**: Login, signup, password reset flows
2. **Public Page Tests**: Home, sports pages, about pages
3. **League Tests**: Browse, detail, registration
4. **Account Tests**: Profile, teams, settings
5. **Admin Tests**: League/team management
6. **Payment Tests**: Stripe integration, success/cancel flows

## Common Testing Patterns

### Mocking Navigation

```typescript
import { mockNavigate } from '../../test/test-utils';

it('navigates to login', async () => {
  const user = userEvent.setup();
  render(<Component />);
  
  await user.click(screen.getByRole('button', { name: /login/i }));
  
  expect(mockNavigate).toHaveBeenCalledWith('/login');
});
```

### Testing Forms

```typescript
it('validates and submits form', async () => {
  const user = userEvent.setup();
  render(<FormComponent />);
  
  // Fill form
  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
  await user.type(screen.getByLabelText(/password/i), 'password123');
  
  // Submit
  await user.click(screen.getByRole('button', { name: /submit/i }));
  
  // Verify
  expect(await screen.findByText(/success/i)).toBeInTheDocument();
});
```

### Testing Loading States

```typescript
it('shows loading state', () => {
  // Make promise hang
  mockSupabase.from('data').select().then = 
    vi.fn(() => new Promise(() => {}));
  
  render(<Component />);
  
  expect(screen.getByTestId('loading')).toBeInTheDocument();
});
```

### Testing Error States

```typescript
it('handles errors gracefully', async () => {
  mockSupabase.from('data').select().then = 
    vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch' },
    });
  
  render(<Component />);
  
  expect(await screen.findByText(/failed to fetch/i)).toBeInTheDocument();
});
```

## Debugging Tests

### Debugging Utilities

```typescript
// Print the current DOM
screen.debug();

// Print a specific element
screen.debug(screen.getByRole('button'));

// Use testing playground
screen.logTestingPlaygroundURL();
```

### Common Issues and Solutions

1. **Element not found**: Use `findBy` queries for async content
2. **Multiple elements found**: Use more specific queries or `within`
3. **Act warnings**: Wrap state updates in `waitFor`
4. **Timeout errors**: Increase timeout or check async logic

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:run
      - run: npm run test:coverage
```

### Pre-commit Hooks

Add to `.husky/pre-commit`:
```bash
#!/bin/sh
npm run test:run -- --changed
```

## Best Practices

### Do's

1. **Test user behavior**, not implementation details
2. **Use semantic queries** (getByRole, getByLabelText)
3. **Wait for async operations** with waitFor or findBy
4. **Mock at the boundary** (API calls, not internal functions)
5. **Keep tests focused** on one behavior per test
6. **Use descriptive test names** that explain the scenario

### Don'ts

1. **Don't test implementation details** (state, methods)
2. **Don't use container.querySelector** unless absolutely necessary
3. **Don't test third-party libraries**
4. **Don't mock everything** - keep tests realistic
5. **Don't ignore console errors** in tests
6. **Don't write brittle selectors** (classes, test-ids as last resort)

### Test Maintenance

1. **Run tests before committing** any changes
2. **Update tests when changing features** - tests document behavior
3. **Remove obsolete tests** when features are removed
4. **Refactor tests** when they become hard to understand
5. **Keep test utilities updated** with new patterns
6. **Monitor test performance** and optimize slow tests

### Adding New Tests

When adding new features:

1. Write tests first (TDD) or immediately after implementation
2. Cover happy paths and error cases
3. Test edge cases and validation
4. Ensure tests pass in isolation
5. Verify tests fail when implementation is broken
6. Add to appropriate test category

### Coverage Goals

- Aim for >80% code coverage
- Focus on critical paths: auth, payments, data mutations
- Don't chase 100% coverage - focus on valuable tests
- Use coverage reports to find untested code paths

## Summary

This testing infrastructure ensures the OFSL application remains stable and reliable as new features are added. By following these guidelines and patterns, you can write effective tests that catch bugs early and document expected behavior.

Remember: Tests are not just about catching bugs - they're living documentation of how your application should behave. Write them with the same care as production code.