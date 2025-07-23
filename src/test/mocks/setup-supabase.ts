import { vi } from 'vitest';
import { createSupabaseMock } from './supabase-enhanced';

// Create a global mock instance
export const globalMockSupabase = createSupabaseMock();

// Mock the supabase module globally
vi.mock('../../lib/supabase', () => ({
  supabase: globalMockSupabase,
}));