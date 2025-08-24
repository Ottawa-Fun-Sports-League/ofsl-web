import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Deno global
globalThis.Deno = {
  env: {
    get: (key: string) => {
      const envVars: Record<string, string> = {
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        SUPABASE_ANON_KEY: 'test-anon-key',
        RESEND_API_KEY: 'test-resend-key',
      };
      return envVars[key];
    },
  },
} as ReturnType<typeof supabase.from>;

describe('Cancellation Notification Retry Logic', () => {
  let fetchMock: vi.MockedFunction<typeof fetch>;
  let consoleSpy: vi.SpyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(),
      warn: vi.spyOn(console, 'warn').mockImplementation(),
      error: vi.spyOn(console, 'error').mockImplementation(),
    };
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.warn.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('Retry on server errors', () => {
    it('should retry on 500 errors and succeed on retry', async () => {
      // First call fails with 500, second succeeds
      fetchMock
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'email-123' }),
        });

      // Import and call the function
      const { sendEmailWithRetry } = await import('../index.ts');
      
      const result = await sendEmailWithRetry(
        'user',
        { to: ['test@example.com'], subject: 'Test', html: '<p>Test</p>' },
        3
      );

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ type: 'user', emailId: 'email-123' });
      
      // Should have retried once
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[Cancellation Notification] Retrying user email')
      );
    });

    it('should retry up to max attempts on persistent failures', async () => {
      // All calls fail
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service unavailable',
      });

      const { sendEmailWithRetry } = await import('../index.ts');
      
      const result = await sendEmailWithRetry(
        'admin',
        { to: ['admin@example.com'], subject: 'Test', html: '<p>Test</p>' },
        3
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to send admin notification after 3 attempts');
      
      // Should have tried 3 times
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(3);
    });
  });

  describe('No retry on client errors', () => {
    it('should not retry on 400 Bad Request', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad request - invalid email',
      });

      const { sendEmailWithRetry } = await import('../index.ts');
      
      const result = await sendEmailWithRetry(
        'user',
        { to: ['invalid-email'], subject: 'Test', html: '<p>Test</p>' },
        3
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 400: Bad request');
      
      // Should NOT retry on 4xx errors
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[Cancellation Notification] user email failed with client error (not retrying)')
      );
    });

    it('should not retry on 401 Unauthorized', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized - invalid API key',
      });

      const { sendEmailWithRetry } = await import('../index.ts');
      
      const result = await sendEmailWithRetry(
        'admin',
        { to: ['admin@example.com'], subject: 'Test', html: '<p>Test</p>' },
        3
      );

      expect(result.success).toBe(false);
      
      // Should NOT retry on 4xx errors
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Exponential backoff', () => {
    it('should apply exponential backoff between retries', async () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      
      // All calls fail to test full retry sequence
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service unavailable',
      });

      const { sendEmailWithRetry } = await import('../index.ts');
      
      await sendEmailWithRetry(
        'user',
        { to: ['test@example.com'], subject: 'Test', html: '<p>Test</p>' },
        3
      );

      // Check backoff delays
      const delays = setTimeoutSpy.mock.calls.map(call => call[1]);
      expect(delays[0]).toBe(1000); // First retry: 1 second
      expect(delays[1]).toBe(2000); // Second retry: 2 seconds
      
      setTimeoutSpy.mockRestore();
    });

    it('should cap backoff at 5 seconds', async () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      
      // All calls fail
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service unavailable',
      });

      const { sendEmailWithRetry } = await import('../index.ts');
      
      await sendEmailWithRetry(
        'user',
        { to: ['test@example.com'], subject: 'Test', html: '<p>Test</p>' },
        5 // More retries to test the cap
      );

      // Check that delays are capped at 5000ms
      const delays = setTimeoutSpy.mock.calls.map(call => call[1]);
      expect(delays[2]).toBe(4000); // Third retry: 4 seconds
      expect(delays[3]).toBe(5000); // Fourth retry: capped at 5 seconds
      
      setTimeoutSpy.mockRestore();
    });
  });

  describe('Partial success handling', () => {
    it('should return partial success when one email succeeds', async () => {
      // Mock successful user email, failed admin email
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'user-email-123' }),
        })
        .mockResolvedValue({
          ok: false,
          status: 500,
          text: async () => 'Internal server error',
        });

      const { handleRequest } = await import('../index.ts');
      
      const request = new Request('https://test.com', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'user-123',
          userName: 'Test User',
          userEmail: 'test@example.com',
          leagueName: 'Test League',
          isTeamRegistration: false,
          cancelledAt: new Date().toISOString(),
        }),
      });

      const response = await handleRequest(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('1/2 successful');
      expect(data.results).toHaveLength(1);
      expect(data.errors).toHaveLength(1);
    });

    it('should return error when both emails fail', async () => {
      // Both emails fail
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Service error',
      });

      const { handleRequest } = await import('../index.ts');
      
      const request = new Request('https://test.com', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'user-123',
          userName: 'Test User',
          userEmail: 'test@example.com',
          leagueName: 'Test League',
          isTeamRegistration: false,
          cancelledAt: new Date().toISOString(),
        }),
      });

      const response = await handleRequest(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to send any notification emails');
      expect(data.errorType).toBe('EMAIL_SEND_FAILED');
      expect(data.details).toHaveLength(2);
    });
  });
});