/**
 * Type definitions for test mocks and utilities
 */

import { Database } from './supabase';

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
  mount: jest.MockedFunction<(domElement: string | Element) => void>;
  unmount: jest.MockedFunction<() => void>;
  destroy: jest.MockedFunction<() => void>;
  update: jest.MockedFunction<(options: Record<string, unknown>) => void>;
  on: jest.MockedFunction<(event: string, handler: (...args: any[]) => void) => void>;
  off: jest.MockedFunction<(event: string, handler: (...args: any[]) => void) => void>;
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

// Mock Turnstile types
export interface MockTurnstileInstance {
  render: jest.MockedFunction<(container: string | Element, options: Record<string, unknown>) => string>;
  reset: jest.MockedFunction<(widgetId?: string) => void>;
  remove: jest.MockedFunction<(widgetId: string) => void>;
  getResponse: jest.MockedFunction<(widgetId?: string) => string>;
}

// Mock window.turnstile
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
export type MockFunction<T extends (...args: any[]) => any> = jest.MockedFunction<T>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MockAsyncFunction<T extends (...args: any[]) => Promise<any>> = jest.MockedFunction<T>;

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
  preventDefault: jest.MockedFunction<() => void>;
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