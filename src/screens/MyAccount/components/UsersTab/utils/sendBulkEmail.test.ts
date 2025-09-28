import { describe, it, expect } from 'vitest';
import { mapUsersToEmailRecipients } from './sendBulkEmail';

describe('mapUsersToEmailRecipients', () => {
  it('excludes users without an email and reports them as invalid', () => {
    const users = [
      { id: '1', email: 'user1@example.com', name: 'User One' },
      { id: '2', email: null, name: 'User Two' },
      { id: '3', email: '  user3@example.com  ', name: null },
    ];

    const { recipients, invalidCount } = mapUsersToEmailRecipients(users);

    expect(invalidCount).toBe(1);
    expect(recipients).toHaveLength(2);
    expect(recipients[0]).toMatchObject({ userId: '1', email: 'user1@example.com', name: 'User One' });
    expect(recipients[1]).toMatchObject({ userId: '3', email: 'user3@example.com', name: null });
  });

  it('keeps duplicate email addresses for separate users', () => {
    const users = [
      { id: '1', email: 'shared@example.com', name: 'Alpha' },
      { id: '2', email: 'shared@example.com', name: 'Bravo' },
    ];

    const { recipients, invalidCount } = mapUsersToEmailRecipients(users);

    expect(invalidCount).toBe(0);
    expect(recipients).toHaveLength(2);
    expect(recipients[0].email).toBe('shared@example.com');
    expect(recipients[1].email).toBe('shared@example.com');
  });
});
