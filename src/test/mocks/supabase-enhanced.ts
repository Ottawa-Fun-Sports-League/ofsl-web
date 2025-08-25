import { vi } from 'vitest';

const createSupabaseMockData = () => ({
  // Default user data for consistent testing
  users: [
    { id: 'user-1', name: 'Test User', email: 'test@example.com', league_ids: [1] },
    { id: 'user-2', name: 'John Smith', email: 'john@example.com', league_ids: [1, 2] },
    { id: 'user-3', name: 'Jane Doe', email: 'jane@example.com', league_ids: [2] }
  ],
  // Default league data
  leagues: [
    { id: 1, name: 'Spring Volleyball League', sport: 'Volleyball', cost: 100, status: 'active' },
    { id: 2, name: 'Winter Badminton League', sport: 'Badminton', cost: 80, status: 'active' }
  ],
  // Default sports data
  sports: [
    { id: 1, name: 'Volleyball' },
    { id: 2, name: 'Badminton' }
  ],
  // Default skills data  
  skills: [
    { id: 1, sport: 'Volleyball', level: 'Beginner' },
    { id: 2, sport: 'Volleyball', level: 'Intermediate' },
    { id: 3, sport: 'Volleyball', level: 'Advanced' },
    { id: 4, sport: 'Badminton', level: 'Beginner' },
    { id: 5, sport: 'Badminton', level: 'Intermediate' },
    { id: 6, sport: 'Badminton', level: 'Advanced' }
  ],
  // Default team data
  teams: [
    { id: 'team-1', name: 'Test Team', captain_id: 'user-1', league_id: 1 }
  ],
  // Default payment data
  league_payments: [
    { id: 1, user_id: 'user-1', league_id: 1, team_id: null, amount_due: 100, amount_paid: 0, status: 'pending', notes: '[]' }
  ]
});

export const createSupabaseMock = (customData?: any) => {
  const mockData = { ...createSupabaseMockData(), ...customData };
  // Store query state for realistic filtering
  let currentTable = '';
  let queryFilters: Record<string, any> = {};
  let isSelectAll = false;

  const chainableMethods = {
    select: vi.fn((columns?: string) => {
      isSelectAll = columns === '*' || !columns;
      return chainableMethods;
    }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn((column: string, value: any) => {
      queryFilters[column] = value;
      return chainableMethods;
    }),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn((column: string, values: any[]) => {
      queryFilters[column] = { $in: values };
      return chainableMethods;
    }),
    is: vi.fn((column: string, value: any) => {
      queryFilters[column] = value;
      return chainableMethods;
    }),
    filter: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn(() => {
      const tableData = mockData[currentTable as keyof typeof mockData] || [];
      const filtered = (Array.isArray(tableData) ? tableData : [tableData]).filter((item: any) => {
        return Object.entries(queryFilters).every(([key, value]) => {
          if (value && typeof value === 'object' && value.$in) {
            return value.$in.includes(item[key]);
          }
          return item[key] === value;
        });
      })[0];
      // Reset query state
      queryFilters = {};
      currentTable = '';
      return Promise.resolve({ data: filtered || null, error: null });
    }),
    maybeSingle: vi.fn(() => {
      const tableData = mockData[currentTable as keyof typeof mockData] || [];
      const filtered = (Array.isArray(tableData) ? tableData : [tableData]).filter((item: any) => {
        return Object.entries(queryFilters).every(([key, value]) => {
          if (value === null) return item[key] === null;
          if (value && typeof value === 'object' && value.$in) {
            return value.$in.includes(item[key]);
          }
          return item[key] === value;
        });
      })[0];
      // Reset query state
      queryFilters = {};
      currentTable = '';
      return Promise.resolve({ data: filtered || null, error: null });
    }),
    throwOnError: vi.fn().mockReturnThis(),
  };

  const fromMock = vi.fn((table: string) => {
    currentTable = table;
    queryFilters = {};
    return chainableMethods;
  });

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