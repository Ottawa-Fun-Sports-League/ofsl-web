import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';
import React from 'react';
import './mocks/setup-supabase';

// Provide default env vars expected by supabase client in tests/CI
vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase.test');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

// Global mock for toast components
vi.mock('../components/ui/toast', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'toast-provider' }, children),
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// Mock window.location methods
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000/',
    hash: '#/',
    replace: vi.fn(),
    reload: vi.fn(),
    assign: vi.fn(),
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
  },
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

// Global crypto mock - only mock if not already available
if (!global.crypto) {
  Object.defineProperty(global, 'crypto', {
    value: {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
      randomUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      }),
      subtle: {} as SubtleCrypto,
    },
    writable: true,
    configurable: true,
  });
}

// Common mock factories for consistent usage across tests
export const createToastMock = () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
  useToast: () => ({
    showToast: vi.fn(),
  }),
});

export const createAuthMock = (overrides?: Record<string, unknown>) => ({
  useAuth: () => ({
    user: null,
    userProfile: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    ...overrides
  })
});

export const createNavigationMock = (overrides?: Record<string, unknown>) => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'default' }),
  ...overrides
});


export const createLeaguesMock = async () => {
  const actual = await vi.importActual('../lib/leagues');
  return {
    ...actual,
    getOrderedDayNames: vi.fn(() => [
      "Monday",
      "Tuesday", 
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday"
    ]),
    fetchLeagues: vi.fn(() => Promise.resolve([])),
    fetchSports: vi.fn(() => Promise.resolve([])),
    fetchSkills: vi.fn(() => Promise.resolve([])),
  };
};

// Enhanced mock data filtering utilities
export const filterUsersBySport = (users: Record<string, unknown>[], sport: string, leagues: Record<string, unknown>[]) => {
  const sportLeagues = leagues.filter(l => l.sport === sport).map(l => l.id);
  return users.filter(u => (u.league_ids as number[])?.some((lid: number) => sportLeagues.includes(lid)));
};

export const filterUsersByLeague = (users: Record<string, unknown>[], leagueId: number) => {
  return users.filter(u => (u.league_ids as number[])?.includes(leagueId));
};

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});
