import { vi } from 'vitest';

const createChainableMethods = () => ({
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
});

export const supabase = {
  auth: {
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
  },
  from: vi.fn((_table: string) => createChainableMethods()),
  functions: {
    invoke: vi.fn().mockResolvedValue({ 
      data: null, 
      error: null 
    }),
  },
  storage: {
    from: vi.fn((_bucket: string) => ({
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      download: vi.fn().mockResolvedValue({ data: null, error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ 
        data: { publicUrl: 'https://example.com/file.jpg' } 
      }),
    })),
  },
  realtime: {
    channel: vi.fn((_name: string) => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn().mockReturnThis(),
    })),
  },
  rpc: vi.fn().mockResolvedValue({ 
    data: null, 
    error: null 
  }),
};