# Database Migration Plan: Main to Staging

## Overview
Migrate lookup tables, edge functions, triggers, and other database objects from the main Supabase instance to a staging instance.

## Current State Analysis

### Main Project Details
- **Project ID**: aijuhalowwjbccyjrlgf
- **Name**: Ottawa Fun Sports League
- **Region**: us-east-1
- **Database Version**: PostgreSQL 15.6.1.146

### Database Objects Identified

#### 1. Lookup/Reference Tables (with row counts)
- `sports` (4 rows) - Sport types
- `skills` (5 rows) - Skill levels
- `gyms` (38 rows) - Gym locations
- `waivers` (1 row) - Waiver templates
- `seasons` (26 rows) - Season definitions

#### 2. Database Functions (26 total)
Key functions include:
- User management: `handle_new_user`, `create_or_update_user_profile`, `check_and_fix_user_profile_*`
- Payment processing: `calculate_user_outstanding_balance`, `create_league_payment_for_team`, `update_payment_status`
- Team invites: `process_pending_invites_for_user`, `process_user_team_invites`, `schedule_process_team_invites`
- Utilities: `update_updated_at_column`, `get_current_user_id`, `is_current_user_admin`

#### 3. Database Triggers (11 total)
- **league_payments**: `update_league_payment_status`
- **leagues**: `sync_payment_due_dates_on_league_update`
- **stripe_products**: `update_stripe_products_updated_at`
- **team_invites**: `trigger_team_invites_updated_at`
- **teams**: `create_league_payment_on_team_insert`, `on_team_registration`, `update_teams_updated_at`
- **users**: `add_user_to_teams_on_signup`, `notify_new_user_trigger`
- **waivers**: `update_waivers_updated_at`

#### 4. Views (3 total)
- `stripe_user_orders`
- `stripe_user_subscriptions`
- `user_payment_summary`

#### 5. Extensions Installed
- Core: `plpgsql`, `uuid-ossp`, `pgcrypto`
- Supabase specific: `pgsodium`, `pg_graphql`, `supabase_vault`, `pg_net`, `pgjwt`
- Statistics: `pg_stat_statements`

#### 6. Edge Functions
Multiple edge functions detected (list too large, need to check separately)

## Migration Strategy

### Phase 1: Staging Instance Setup
1. **Create Staging Project**
   - Need to confirm if we're creating a new project or using an existing one
   - Ensure same region (us-east-1) for optimal performance
   - Match PostgreSQL version

### Phase 2: Schema Foundation
1. **Extensions**
   - Install required extensions in the same order as main
   - Priority: `uuid-ossp`, `pgcrypto`, `pgjwt`, `pg_stat_statements`

2. **Base Tables Structure**
   - Create all table schemas (without data initially)
   - Set up primary keys, indexes, and constraints

### Phase 3: Functions and Procedures
1. **Utility Functions First**
   - `update_updated_at_column`
   - `get_current_user_id`
   - `is_current_user_admin`
   - `check_table_exists`

2. **Business Logic Functions**
   - User management functions
   - Payment processing functions
   - Team invite functions

### Phase 4: Lookup Data Migration
1. **Static Reference Data**
   - `sports` table (4 rows)
   - `skills` table (5 rows)
   - `waivers` table (1 row)

2. **Semi-Static Data**
   - `gyms` table (38 rows)
   - `seasons` table (26 rows)

### Phase 5: Views
1. Create all views after base tables and functions are in place
   - `stripe_user_orders`
   - `stripe_user_subscriptions`
   - `user_payment_summary`

### Phase 6: Triggers
1. Install triggers in dependency order
   - Start with simple update triggers
   - Then complex business logic triggers

### Phase 7: Row Level Security (RLS)
1. Migrate RLS policies for all tables
2. Ensure policies match production exactly

### Phase 8: Edge Functions
1. Deploy all edge functions to staging
2. Update environment variables
3. Test webhook endpoints

## Execution Steps

### Step 1: Confirm Staging Instance
- [ ] Verify if staging project exists or needs creation
- [ ] Get staging project credentials
- [ ] Confirm migration scope with user

### Step 2: Generate Migration Scripts
- [ ] Export schema definitions from main
- [ ] Export lookup table data
- [ ] Export function definitions
- [ ] Export trigger definitions
- [ ] Export RLS policies

### Step 3: Execute Migration
- [ ] Run migrations in order
- [ ] Verify each step
- [ ] Run validation checks

### Step 4: Validation
- [ ] Compare table counts
- [ ] Verify function existence
- [ ] Test trigger functionality
- [ ] Validate RLS policies
- [ ] Test edge functions

## Risk Mitigation
- All migrations will be idempotent (using IF NOT EXISTS)
- Each phase will be validated before proceeding
- Rollback scripts will be prepared
- No production data will be migrated (only lookup tables)

## Questions to Resolve
1. Do we have an existing staging project or need to create one?
2. Should we migrate all edge functions or only specific ones?
3. Any specific environment variables needed for staging?
4. Should staging use the same Stripe test keys or different ones?

## Next Steps
1. Get confirmation on staging project details
2. Begin generating migration scripts
3. Execute migration in phases with validation