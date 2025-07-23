# OFSL Testing Quick Reference

## Essential Commands

```bash
npm test                    # Watch mode
npm run test:run           # Single run
npm run test:ui            # UI mode
npm test LoginPage         # Test specific file/pattern
npm test -- --coverage     # With coverage
```

## Common Test Patterns

### Basic Component Test
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('handles click', async () => {
  const user = userEvent.setup();
  render(<Button />);
  
  await user.click(screen.getByRole('button'));
  expect(screen.getByText('Clicked!')).toBeInTheDocument();
});
```

### Testing with Auth
```typescript
render(<ProtectedPage />, {
  user: mockUser,
  userProfile: mockUserProfile,
});
```

### Mocking Supabase Queries
```typescript
mockSupabase.from('table').select().eq().then = 
  vi.fn().mockResolvedValue({ data: mockData, error: null });
```

### Testing Navigation
```typescript
await user.click(screen.getByRole('link', { name: /home/i }));
expect(mockNavigate).toHaveBeenCalledWith('/');
```

### Testing Forms
```typescript
await user.type(screen.getByLabelText(/email/i), 'test@example.com');
await user.click(screen.getByRole('button', { name: /submit/i }));
expect(await screen.findByText(/success/i)).toBeInTheDocument();
```

### Testing Async Content
```typescript
// Use findBy for async content
expect(await screen.findByText('Loaded Data')).toBeInTheDocument();

// Or waitFor
await waitFor(() => {
  expect(screen.getByText('Loaded Data')).toBeInTheDocument();
});
```

### Testing Loading States
```typescript
// Make promise hang
mockSupabase.from('data').select().then = vi.fn(() => new Promise(() => {}));
render(<Component />);
expect(screen.getByTestId('loading')).toBeInTheDocument();
```

### Testing Errors
```typescript
mockSupabase.from('data').select().then = 
  vi.fn().mockResolvedValue({ data: null, error: { message: 'Error!' } });
render(<Component />);
expect(await screen.findByText(/error!/i)).toBeInTheDocument();
```

## Query Priority

1. `getByRole` - Preferred, accessible
2. `getByLabelText` - For form elements
3. `getByPlaceholderText` - If no label
4. `getByText` - For non-interactive elements
5. `getByTestId` - Last resort

## Debugging

```typescript
screen.debug();                    // Print DOM
screen.debug(element);            // Print specific element
screen.logTestingPlaygroundURL(); // Get testing playground link
```

## Common Matchers

```typescript
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toBeDisabled();
expect(element).toHaveValue('text');
expect(element).toHaveClass('className');
expect(element).toHaveAttribute('href', '/path');
expect(element).toHaveTextContent('text');
```

## Tips

- Use `userEvent` over `fireEvent` for more realistic interactions
- Always `await` user interactions: `await user.click(button)`
- Clear mocks in `beforeEach`: `vi.clearAllMocks()`
- Test user behavior, not implementation
- One assertion per test when possible
- Use descriptive test names