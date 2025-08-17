# Individual Registration Migration Plan

## Overview
Implement support for individual league registrations (non-team based) for certain sports like Badminton, while maintaining team-based registrations for sports like Volleyball.

## Current State Analysis

### Database Structure
- **users table**: Has `team_ids` array tracking which teams a user belongs to
- **teams table**: Stores team information with captain, roster, and league association
- **leagues table**: Currently all leagues assume team-based registration
- **league_payments table**: Tracks payments with both user_id and team_id

### Current Registration Flow
1. User registers for a league → Creates a team entry
2. User becomes captain of that team
3. User's ID is added to team's roster array
4. Team ID is added to user's team_ids array
5. Payment record created with team_id reference

### Problem with Current Approach for Badminton
- Every badminton player has their own "team" (usually named after themselves)
- No actual team management needed
- Creates unnecessary database entries and UI complexity

## Proposed Solution

### Phase 1: Database Schema Updates

#### 1.1 Add columns to leagues table
```sql
ALTER TABLE leagues 
ADD COLUMN team_registration BOOLEAN DEFAULT true;

-- Update existing data
UPDATE leagues 
SET team_registration = true 
WHERE sport_id = (SELECT id FROM sports WHERE name = 'Volleyball');

UPDATE leagues 
SET team_registration = false 
WHERE sport_id = (SELECT id FROM sports WHERE name = 'Badminton');
```

#### 1.2 Add league tracking to users table
```sql
ALTER TABLE users 
ADD COLUMN league_ids BIGINT[] DEFAULT '{}'::bigint[];
```

#### 1.3 Update league_payments table to support individual registrations
```sql
-- Make team_id nullable since individual registrations won't have teams
ALTER TABLE league_payments 
ALTER COLUMN team_id DROP NOT NULL;
```

### Phase 2: Data Migration Strategy

#### 2.1 Backup Strategy
1. Create backup tables before migration
```sql
CREATE TABLE teams_backup AS SELECT * FROM teams;
CREATE TABLE users_backup AS SELECT * FROM users;
CREATE TABLE league_payments_backup AS SELECT * FROM league_payments;
```

#### 2.2 Migrate Badminton Registrations
```sql
-- Step 1: Identify all badminton teams
WITH badminton_teams AS (
  SELECT t.* 
  FROM teams t
  JOIN leagues l ON t.league_id = l.id
  JOIN sports s ON l.sport_id = s.id
  WHERE s.name = 'Badminton'
)

-- Step 2: Add league_ids to users for their badminton registrations
UPDATE users u
SET league_ids = array_append(
  COALESCE(u.league_ids, '{}'), 
  bt.league_id
)
FROM badminton_teams bt
WHERE u.id = bt.captain_id;

-- Step 3: Update payment records to remove team association
UPDATE league_payments lp
SET team_id = NULL
FROM badminton_teams bt
WHERE lp.team_id = bt.id;

-- Step 4: Remove badminton team IDs from users.team_ids
UPDATE users u
SET team_ids = array_remove(u.team_ids, bt.id)
FROM badminton_teams bt
WHERE bt.id = ANY(u.team_ids);

-- Step 5: Delete badminton teams (after confirming above steps)
DELETE FROM teams t
WHERE t.id IN (
  SELECT t2.id 
  FROM teams t2
  JOIN leagues l ON t2.league_id = l.id
  JOIN sports s ON l.sport_id = s.id
  WHERE s.name = 'Badminton'
);
```

### Phase 3: Frontend Updates

#### 3.1 Registration Flow Updates
**File: `src/screens/LeagueDetailPage/components/TeamRegistrationModal.tsx`**
- Check `league.team_registration` flag
- If false:
  - Hide team name input
  - Skip team creation
  - Add league_id directly to user.league_ids
  - Create payment record without team_id

#### 3.2 League Management Updates
**File: League edit form component**
- Add toggle for `team_registration` field
- Only show for admin users
- Include help text explaining the difference

#### 3.3 User Dashboard Updates
**File: User teams/leagues page**
- Rename "My Teams" to "My Leagues"
- Show two sections:
  - Team-based leagues (from teams table)
  - Individual leagues (from user.league_ids)

#### 3.4 Update Email Templates
- Modify registration confirmation email to handle both team and individual registrations
- Update language from "team registration" to "league registration" where appropriate

### Phase 4: Testing Strategy

#### 4.1 Data Integrity Tests
- Verify all badminton players maintain their league registrations
- Confirm payment records are preserved
- Check that volleyball teams remain unchanged

#### 4.2 Functional Tests
- Test new individual registration flow
- Test team registration flow still works
- Verify "My Leagues" page shows both types correctly
- Test league edit form with new field

#### 4.3 Edge Cases
- User registered for both team and individual leagues
- Switching league from team to individual (should be prevented)
- Payment processing for both registration types

### Phase 5: Rollback Plan

If issues arise:
1. Restore from backup tables
2. Revert code changes
3. Re-deploy previous version

```sql
-- Restore original data if needed
DROP TABLE teams;
ALTER TABLE teams_backup RENAME TO teams;

DROP TABLE users;
ALTER TABLE users_backup RENAME TO users;

DROP TABLE league_payments;
ALTER TABLE league_payments_backup RENAME TO league_payments;
```

## Implementation Order

1. **Create feature branch**
   ```bash
   git checkout -b feature/individual-league-registration
   ```

2. **Database migrations** (create in order):
   - `20250818000001_add_team_registration_to_leagues.sql`
   - `20250818000002_add_league_ids_to_users.sql`
   - `20250818000003_make_team_id_nullable_in_payments.sql`
   - `20250818000004_migrate_badminton_registrations.sql`

3. **Backend updates**:
   - Update Supabase types
   - Modify RLS policies if needed

4. **Frontend updates** (in order):
   - Update registration modal logic
   - Update user dashboard
   - Update league edit form
   - Update email templates

5. **Testing**:
   - Run migrations on staging first
   - Test all flows on staging
   - Get user acceptance

6. **Production deployment**:
   - Deploy during low-traffic period
   - Monitor for errors
   - Have rollback ready

## Risk Assessment

### High Risk Areas
1. **Data Loss**: Mitigated by backup tables and careful migration scripts
2. **Payment Disruption**: Mitigated by preserving all payment records
3. **User Confusion**: Mitigated by clear UI updates and communication

### Medium Risk Areas
1. **Performance**: Adding league_ids array might affect query performance
2. **Edge Cases**: Mixed registrations need careful handling

### Low Risk Areas
1. **Future leagues**: New leagues will use the appropriate registration type
2. **Admin interface**: Changes are backward compatible

## Success Criteria
- [ ] All existing badminton registrations preserved
- [ ] All volleyball teams unchanged
- [ ] Payment records intact
- [ ] Users can register individually for badminton
- [ ] Users can still register teams for volleyball
- [ ] "My Leagues" page shows all registrations correctly
- [ ] No data loss during migration

## Timeline Estimate
- Database changes: 2-3 hours
- Frontend updates: 4-6 hours
- Testing: 2-3 hours
- Total: 8-12 hours of development

## Questions to Clarify
1. Should we preserve any historical badminton "team" data for records?
2. How should we handle mixed leagues that might want both types?
3. Should league creators be able to change registration type after creation?
4. How should roster management work for individual leagues (if at all)?

---

**Note**: This plan prioritizes data safety and provides clear rollback procedures. All data migrations should be tested thoroughly on staging before production deployment.