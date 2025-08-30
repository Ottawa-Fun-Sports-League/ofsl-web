# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ottawa Fun Sports League (OFSL) - A web application for managing adult sports leagues (volleyball and badminton) with user registration, team management, payment processing, and league administration features.

## Tech Stack

- **Frontend**: React 18 with TypeScript, Vite build tool
- **Routing**: React Router DOM v6
- **Styling**: Tailwind CSS with Tailwind Typography
- **UI Components**: Shadcn UI (built on Radix UI primitives)
- **Backend**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth with Google OAuth
- **Payments**: Stripe (React Stripe.js)
- **Edge Functions**: Supabase Edge Functions for Stripe webhooks and invites
- **Deployment**: Netlify

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173/)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run TypeScript type checking
npm run typecheck

# Run Linting
npm run lint

# Run Integration tests
npm run test
```

## Environment Configuration

Required environment variables in `.env`:

```
VITE_SUPABASE_URL=https://api.ofsl.ca
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=your-publishable-key
```

## Code Architecture

### Directory Structure

- `/src/components/` - Reusable UI components
  - `/ui/` - Base UI components (button, card, input, etc.)
  - `/league/` - League-specific components
- `/src/screens/` - Page components organized by feature
  - Each screen has its own directory with components, hooks, and utils
- `/src/contexts/` - React contexts (AuthContext for authentication)
- `/src/lib/` - Core utilities and configurations
  - `supabase.ts` - Supabase client configuration
  - `stripe.ts` - Stripe configuration
  - `leagues.ts` - League-related functions
  - `payments.ts` - Payment processing functions
- `/src/types/` - TypeScript type definitions
- `/supabase/` - Backend configuration
  - `/functions/` - Edge functions for Stripe and invites
  - `/migrations/` - Database schema migrations

### Key Patterns

1. **Authentication Flow**: AuthContext wraps the app, providing user state and auth methods
2. **Protected Routes**: Use ProtectedRoute component for authenticated pages
3. **Component Organization**: Screens have dedicated folders with sub-components, hooks, and utils
4. **State Management**: React Context API for global state, local state for component-specific data
5. **Database Queries**: All database operations go through Supabase client with RLS policies

### Database Schema

Main tables:

- `users` - User profiles with skills
- `teams` - Team registrations with captain info
- `leagues` - League details with pricing and playoff configuration
- `registrations` - Team-league registrations
- `payments` - Payment records
- `games` - Match schedules
- `standings` - League standings
- `league_schedules` - League scheduling configuration
- `weekly_schedules` - Weekly schedule with tiers and team matchings
- `game_results` - Game results tracking

### Stripe Integration

Edge functions handle:

- `stripe-checkout` - Create checkout sessions
- `stripe-payment-intent` - Process payments
- `stripe-webhook` - Handle payment confirmations
- `stripe-products-sync` - Sync Stripe products

### UI Component Library

Using Shadcn UI components in `/src/components/ui/`:

- Follow existing patterns when adding new components
- Use `cn()` utility for conditional classes
- Components use Radix UI primitives under the hood

## Database Management

Claude Code can manage the Supabase database for this project:

- Apply database migrations using `mcp__supabase__apply_migration`
- Execute SQL queries using `mcp__supabase__execute_sql`
- List and manage database tables, extensions, and migrations
- Generate TypeScript types from database schema
- Access project logs and advisors for debugging

## Important Notes

- Google OAuth requires specific redirect URI configuration (see README.md)
- All API calls use the custom domain https://api.ofsl.ca
- Supabase RLS policies enforce data access rules
- Rich text editing uses React Quill with custom styling
- Ensure all files past linting
- Avoid barrel files
- **IMPORTANT**: Do NOT run the app to test changes. Instead, create integration tests for every feature and bug fix. If the test passes, the task is complete.

## Plan & Review

### Before starting work

- Always in plan mode to make a plan
- After get the plan, make sure you Write the plan to .claude/tasks/TASK_NAME.md.
- The plan should be a detailed implementation plan and the reasoning behind them, as well as tasks broken down.
- If the task require external knowledge or certain package, also research to get latest knowledge (Use Task tool for research)
- Don't over plan it, always think MVP.
- Once you write the plan, firstly ask me to review it. Do not continue until I approve the plan.

### While implementing

- You should update the plan as you work.
- After you complete tasks in the plan, you should update and append detailed descriptions of the changes you made, so following tasks can be easily hand over to other engineers.

## Recent Features and Updates

### League Scheduling System (In Progress)
- **Weekly Schedule Management**: Dynamic weekly schedule views with tier-based matchings
- **Tier System**: Support for multiple tiers with team rankings and assignments
- **Playoff Support**: Configurable playoff weeks (2-6 weeks) after regular season
- **Holiday Management**: No-games flag for weeks without games (holidays, etc.)
- **Game Results Tracking**: Record and display game results with completion status
- **Schedule Components**:
  - `LeagueSchedule.tsx` - Main schedule display with week navigation
  - `LeagueSchedulePage` - Dedicated page for full schedule view
  - Database tables: `league_schedules`, `weekly_schedules`, `game_results`

### Test Infrastructure (Completed)
- **E2E Testing Suite**: Comprehensive Playwright tests covering:
  - Authentication flows
  - League management
  - Team registration
  - Payment processing
  - Admin functionality
  - Waitlist management
- **Code Quality**: Achieved zero TypeScript and linting errors
- **Test Reliability**: Improved test pass rate to 79%
- **CI/CD Integration**: GitHub Actions workflow for automated testing

### Users Management Improvements (Completed)
- **Server-side Pagination**: Efficient pagination for large user lists
- **Fixed Pagination Issues**: Resolved UUID and auth_id ambiguity in database functions
- **Enhanced Filtering**: Improved sport and active player filters
- **Performance**: Optimized queries for faster load times

### Waitlist and Payment Management (Completed)
- **Improved Waitlist Flow**: Better handling of waitlist registrations
- **Payment Tracking**: Enhanced payment status tracking for waitlist conversions
- **Cancellation Notifications**: Automated notifications for team cancellations

### Previous Session Summary

Fixed sign-up flow issues:

- Fixed infinite loader on profile completion page by removing test code and adding proper loading states
- Fixed HashRouter path detection in AuthContext - changed from `window.location.pathname` to `window.location.hash.replace('#', '')`
- Fixed race condition in handleAuthStateChange where currentPath wasn't updating after redirects
- Removed preferred_position field from profile completion form
- Removed TestPage routes from App.tsx
- Added race condition prevention with lastRedirectPath state tracking
