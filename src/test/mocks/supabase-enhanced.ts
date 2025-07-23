import { vi } from 'vitest';

export const createSupabaseMock = () => {
  const chainableMethods = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    throwOnError: vi.fn().mockReturnThis(),
  };

  const fromMock = vi.fn((_table: string) => ({
    ...chainableMethods,
  }));

  const authMock = {
    getSession: vi.fn().mockResolvedValue({ 
      data: { session: null }, 
      error: null 
    }),
    getUser: vi.fn().mockResolvedValue({ 
      data: { user: null }, 
      error: null 
    }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { 
        subscription: { 
          unsubscribe: vi.fn() 
        } 
      },
    }),
    signInWithPassword: vi.fn().mockResolvedValue({ 
      data: { user: null, session: null }, 
      error: null 
    }),
    signInWithOAuth: vi.fn().mockResolvedValue({ 
      data: { provider: 'google', url: 'https://example.com' }, 
      error: null 
    }),
    signUp: vi.fn().mockResolvedValue({ 
      data: { user: null, session: null }, 
      error: null 
    }),
    signOut: vi.fn().mockResolvedValue({ 
      error: null 
    }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ 
      data: {}, 
      error: null 
    }),
    updateUser: vi.fn().mockResolvedValue({ 
      data: { user: null }, 
      error: null 
    }),
  };

  const functionsMock = {
    invoke: vi.fn().mockResolvedValue({ 
      data: null, 
      error: null 
    }),
  };

  const storageMock = {
    from: vi.fn((_bucket: string) => ({
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      download: vi.fn().mockResolvedValue({ data: null, error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ 
        data: { publicUrl: 'https://example.com/file.jpg' } 
      }),
    })),
  };

  const realtimeMock = {
    channel: vi.fn((_name: string) => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn().mockReturnThis(),
    })),
  };

  const rpcMock = vi.fn().mockResolvedValue({ 
    data: null, 
    error: null 
  });

  return {
    from: fromMock,
    auth: authMock,
    functions: functionsMock,
    storage: storageMock,
    realtime: realtimeMock,
    rpc: rpcMock,
    // Expose chain methods for easy access in tests
    _chainMethods: chainableMethods,
  };
};

// Default mock instance
export const mockSupabase = createSupabaseMock();

// Mock the supabase module
vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase,
}));