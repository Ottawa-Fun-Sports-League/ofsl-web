/**
 * Type definitions for test mocks and utilities
 */

import { Database } from './supabase';
import type { MockedFunction } from 'vitest';

// Supabase mock types
export type MockUserProfile = Database['public']['Tables']['users']['Row'];
export type MockRegistration = Database['public']['Tables']['registrations']['Row'];
export type MockSeason = Database['public']['Tables']['seasons']['Row'];
export type MockAttendance = Database['public']['Tables']['attendance']['Row'];
export type MockBalance = Database['public']['Tables']['balances']['Row'];

// Mock Supabase client response types
export interface MockSupabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface MockSupabaseListResponse<T> {
  data: T[] | null;
  error: Error | null;
}

// Mock league data structure
export interface MockLeagueData {
  id: string;
  name: string;
  sport_type?: string;
  season?: string;
  registration_fee?: number;
  max_teams?: number;
  description?: string;
  start_date?: string;
  end_date?: string;
  active?: boolean;
}

// Mock team data structure
export interface MockTeamData {
  id: string;
  name: string;
  league_id: string;
  captain_id: string;
  members?: string[];
  created_at?: string;
}

// Mock payment data structure
export interface MockPaymentData {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  stripe_payment_intent_id?: string;
  created_at?: string;
}

// Payment entry type for editing forms
export interface PaymentEntry {
  id: string | number;
  amount: number;
  payment_method: string | null;
  date: string;
  notes?: string;
}

// Mock Stripe types
export interface MockStripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret?: string;
}

export interface MockStripeElement {
  mount: MockedFunction<(domElement: string | Element) => void>;
  unmount: MockedFunction<() => void>;
  destroy: MockedFunction<() => void>;
  update: MockedFunction<(options: Record<string, unknown>) => void>;
  on: MockedFunction<(event: string, handler: (...args: unknown[]) => void) => void>;
  off: MockedFunction<(event: string, handler: (...args: unknown[]) => void) => void>;
}

// Mock auth types
export interface MockAuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
}

export interface MockAuthSession {
  access_token: string;
  refresh_token: string;
  user: MockAuthUser;
}

// Mock form validation error types
export interface MockFormErrors {
  [key: string]: string | string[] | undefined;
}

// Mock API response types
export interface MockApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface MockApiError {
  success: false;
  error: string;
  details?: string;
}

export type MockApiResponse<T = unknown> = MockApiSuccess<T> | MockApiError;

// Mock Supabase query chain types
export interface MockSupabaseChain {
  select?: (columns?: string) => MockSupabaseChain;
  insert?: (values: Record<string, unknown>) => MockSupabaseChain;
  update?: (values: Record<string, unknown>) => MockSupabaseChain;
  delete?: () => MockSupabaseChain;
  upsert?: (values: Record<string, unknown>) => MockSupabaseChain;
  from?: (table: string) => MockSupabaseChain;
  eq?: (column: string, value: unknown) => MockSupabaseChain;
  neq?: (column: string, value: unknown) => MockSupabaseChain;
  gt?: (column: string, value: unknown) => MockSupabaseChain;
  gte?: (column: string, value: unknown) => MockSupabaseChain;
  lt?: (column: string, value: unknown) => MockSupabaseChain;
  lte?: (column: string, value: unknown) => MockSupabaseChain;
  like?: (column: string, pattern: string) => MockSupabaseChain;
  ilike?: (column: string, pattern: string) => MockSupabaseChain;
  is?: (column: string, value: unknown) => MockSupabaseChain;
  in?: (column: string, values: unknown[]) => MockSupabaseChain;
  contains?: (column: string, value: unknown) => MockSupabaseChain;
  containedBy?: (column: string, value: unknown) => MockSupabaseChain;
  rangeGt?: (column: string, value: string) => MockSupabaseChain;
  rangeGte?: (column: string, value: string) => MockSupabaseChain;
  rangeLt?: (column: string, value: string) => MockSupabaseChain;
  rangeLte?: (column: string, value: string) => MockSupabaseChain;
  rangeAdjacent?: (column: string, value: string) => MockSupabaseChain;
  overlaps?: (column: string, value: unknown) => MockSupabaseChain;
  textSearch?: (column: string, query: string, options?: Record<string, unknown>) => MockSupabaseChain;
  match?: (query: Record<string, unknown>) => MockSupabaseChain;
  not?: (column: string, operator: string, value: unknown) => MockSupabaseChain;
  or?: (filters: string) => MockSupabaseChain;
  filter?: (column: string, operator: string, value: unknown) => MockSupabaseChain;
  order?: (column: string, options?: { ascending?: boolean }) => MockSupabaseChain;
  limit?: (count: number, options?: { foreignTable?: string }) => MockSupabaseChain;
  range?: (from: number, to: number, options?: { foreignTable?: string }) => MockSupabaseChain;
  abortSignal?: (signal: AbortSignal) => MockSupabaseChain;
  single?: () => Promise<MockSupabaseResponse<unknown>>;
  maybeSingle?: () => Promise<MockSupabaseResponse<unknown>>;
  csv?: () => Promise<MockSupabaseResponse<string>>;
  geojson?: () => Promise<MockSupabaseResponse<Record<string, unknown>>>;
  explain?: (options?: { analyze?: boolean; verbose?: boolean; settings?: boolean; buffers?: boolean; wal?: boolean; format?: 'text' | 'xml' | 'json' | 'yaml' }) => Promise<MockSupabaseResponse<string>>;
  then?: <T>(onfulfilled?: ((value: MockSupabaseResponse<unknown>) => T) | null, onrejected?: ((reason: unknown) => T) | null) => Promise<T>;
  // PostgrestQueryBuilder required properties
  url?: string | URL;
  headers?: Record<string, string>;
}

// Mock Supabase query chain with generic type support
export interface MockSupabaseQueryChain<T> extends MockSupabaseChain {
  then?: <TResult>(onfulfilled?: ((value: MockSupabaseResponse<T>) => TResult) | null, onrejected?: ((reason: unknown) => TResult) | null) => Promise<TResult>;
  single?: () => Promise<MockSupabaseResponse<T>>;
  maybeSingle?: () => Promise<MockSupabaseResponse<T>>;
}

// Mock Supabase client
export interface MockSupabaseClient {
  from: (table: string) => MockSupabaseChain;
  rpc: (fn: string, params?: Record<string, unknown>) => Promise<MockSupabaseResponse<unknown>>;
  auth: {
    getSession: () => Promise<MockSupabaseResponse<{ session: MockAuthSession | null }>>;
    getUser: () => Promise<MockSupabaseResponse<MockAuthUser>>;
    signUp: (credentials: { email: string; password: string; options?: Record<string, unknown> }) => Promise<MockSupabaseResponse<{ user: MockAuthUser; session: MockAuthSession | null }>>;
    signInWithPassword: (credentials: { email: string; password: string }) => Promise<MockSupabaseResponse<{ user: MockAuthUser; session: MockAuthSession }>>;
    signOut: () => Promise<{ error: Error | null }>;
    onAuthStateChange: (callback: (event: string, session: MockAuthSession | null) => void) => { data: { subscription: { unsubscribe: () => void } } };
  };
}

// Sports and skills mock data
export interface MockSportsData {
  id: string;
  name: string;
  description?: string;
  active?: boolean;
}

export interface MockSkillsData {
  id: string;
  sport_id: string;
  level: number;
  name: string;
  description: string;
}

// Mock auth context return type
export interface MockAuthReturn {
  user: MockAuthUser | null;
  session: MockAuthSession | null;
  userProfile: MockUserProfile | null;
  loading: boolean;
  profileComplete: boolean;
  emailVerified: boolean;
  isNewUser: boolean;
  signIn: MockedFunction<(email: string, password: string) => Promise<void>>;
  signUp: MockedFunction<(email: string, password: string) => Promise<void>>;
  signOut: MockedFunction<() => Promise<void>>;
  signInWithGoogle: MockedFunction<() => Promise<void>>;
  createProfile: MockedFunction<(profileData: Partial<MockUserProfile>) => Promise<void>>;
  setUserProfile: MockedFunction<(profile: MockUserProfile) => void>;
  setIsNewUser: MockedFunction<(isNew: boolean) => void>;
  checkProfileCompletion: MockedFunction<(profile?: MockUserProfile | null) => boolean>;
  refreshUserProfile: MockedFunction<() => Promise<void>>;
}

// Mock session data for auth tests
export interface MockSessionData {
  data: {
    session: {
      access_token: string;
      user: {
        id: string;
      };
    } | null;
  };
  error: Error | null;
}

// Type-safe casting utility
export type TestMockCast<T> = T;

// Mock Turnstile types
export interface MockTurnstileInstance {
  render: MockedFunction<(container: string | Element, options: Record<string, unknown>) => string>;
  reset: MockedFunction<(widgetId?: string) => void>;
  remove: MockedFunction<(widgetId: string) => void>;
  getResponse: MockedFunction<(widgetId?: string) => string>;
  ready: MockedFunction<(callback: () => void) => void>;
  execute: MockedFunction<(container: string | Element, options: Record<string, unknown>) => void>;
  isExpired: MockedFunction<(widgetId?: string) => boolean>;
}

// Mock window.turnstile
// @ts-expect-error - MockWindow interface compatibility issue with Turnstile types
export interface MockWindow extends Window {
  turnstile?: MockTurnstileInstance;
  __turnstileCallbacks?: {
    onSuccess: (token: string) => void;
    onError: (error?: string) => void;
    onExpire: () => void;
  };
}

// Generic mock function types  
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MockFunction<T extends (...args: any[]) => any> = MockedFunction<T>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MockAsyncFunction<T extends (...args: any[]) => Promise<any>> = MockedFunction<T>;

// Mock event types for form interactions
export interface MockChangeEvent {
  target: {
    name: string;
    value: string;
    type?: string;
    checked?: boolean;
  };
}

export interface MockSubmitEvent {
  preventDefault: MockedFunction<() => void>;
}

// Mock skills data
export interface MockSkillLevel {
  level: number;
  description: string;
}

// Mock individual registration data
export interface MockIndividualRegistration {
  id: string;
  user_id: string;
  league_id: string;
  skill_level: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  waiver_signed: boolean;
  payment_status: 'pending' | 'paid' | 'failed';
  created_at: string;
}

// League with nested sport relation
export interface LeagueWithSport {
  id: string;
  name: string;
  cost?: number;
  end_date?: string;
  sports?: {
    name: string;
  };
}

// Team with nested league and sport relations
export interface TeamWithLeague {
  id: string;
  name: string;
  captain_id: string;
  leagues: LeagueWithSport;
}