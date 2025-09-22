# Volleyball Spares Migration Documentation

## Overview

This migration creates a comprehensive volleyball spares system that allows players to register as "spares" for volleyball leagues. Team captains can then view and contact these spare players when their teams need additional players for games.

## Files Created

1. **`20250828000000_create_volleyball_spares_table.sql`** - Main migration file
2. **`test_volleyball_spares_migration.sql`** - Comprehensive test suite
3. **`rollback_20250828000000_create_volleyball_spares_table.sql`** - Rollback script
4. **`README_volleyball_spares.md`** - This documentation

## Migration Details

### Table Structure

The `volleyball_spares` table includes:

- **`id`** (UUID, Primary Key) - Unique identifier
- **`user_id`** (TEXT, Foreign Key) - Links to users table
- **`league_id`** (BIGINT, Foreign Key) - Links to leagues table
- **`skill_level`** (TEXT) - 'beginner', 'intermediate', or 'advanced'
- **`availability_notes`** (TEXT, Optional) - Player's availability information
- **`is_active`** (BOOLEAN) - Whether the spare registration is active
- **`created_at`** (TIMESTAMPTZ) - When registered
- **`updated_at`** (TIMESTAMPTZ) - Last modification time

### Key Constraints

1. **Unique Constraint**: One spare registration per user per league
2. **Skill Level Check**: Only accepts 'beginner', 'intermediate', 'advanced'
3. **Volleyball Only**: Enforces that only volleyball leagues can have spares
4. **Foreign Keys**: CASCADE delete when user/league is removed

### Security & Access Control

**Row Level Security (RLS) Policies:**

- **Users**: Can create, view, and manage their own spare registrations
- **Team Captains**: Can view spares for leagues where they captain teams
- **Co-Captains**: Can view spares for leagues where they are co-captains  
- **Admins**: Full access to all spare registrations
- **Public**: No access (authentication required)

### Performance Optimizations

**Indexes Created:**
- `league_id` - For captain queries
- `user_id` - For user management
- `(league_id, is_active)` - For active spares queries
- `skill_level` - For skill filtering
- `(league_id, skill_level, is_active)` - For efficient spare matching

### Helper Functions

#### `register_volleyball_spare(league_id, skill_level, availability_notes)`
Registers the current user as a spare for a volleyball league.
```sql
SELECT register_volleyball_spare(123, 'intermediate', 'Available Tuesday evenings');
```

#### `get_volleyball_spares_for_league(league_id, skill_level, include_inactive)`
Returns spares for a league (with proper access control).
```sql
SELECT * FROM get_volleyball_spares_for_league(123, 'intermediate', false);
```

#### `deactivate_volleyball_spare(league_id, user_id)`
Deactivates a spare registration.
```sql
SELECT deactivate_volleyball_spare(123, 'user123');
```

## Usage Examples

### For Players (Registering as Spares)

```sql
-- Register as an intermediate spare for league 123
SELECT register_volleyball_spare(123, 'intermediate', 'Available most weekday evenings');

-- Update your spare registration
UPDATE volleyball_spares 
SET skill_level = 'advanced', 
    availability_notes = 'Available all evenings except Fridays'
WHERE user_id = get_current_user_id() AND league_id = 123;

-- Deactivate your spare registration
SELECT deactivate_volleyball_spare(123);
```

### For Team Captains (Finding Spares)

```sql
-- View all active spares for your league
SELECT * FROM get_volleyball_spares_for_league(123);

-- View only intermediate level spares
SELECT * FROM get_volleyball_spares_for_league(123, 'intermediate');

-- Direct table query (if you have access)
SELECT 
    u.name, u.email, u.phone,
    vs.skill_level, vs.availability_notes
FROM volleyball_spares vs
JOIN users u ON vs.user_id = u.id
WHERE vs.league_id = 123 
    AND vs.is_active = true
    AND vs.skill_level = 'intermediate'
ORDER BY u.name;
```

### For Admins (Managing System)

```sql
-- View all spares across all leagues
SELECT 
    l.name as league_name,
    u.name as user_name,
    vs.skill_level,
    vs.is_active,
    vs.created_at
FROM volleyball_spares vs
JOIN users u ON vs.user_id = u.id
JOIN leagues l ON vs.league_id = l.id
ORDER BY l.name, vs.created_at;

-- Deactivate a specific user's spare registration
SELECT deactivate_volleyball_spare(123, 'user456');

-- View spare registration statistics
SELECT 
    l.name as league_name,
    vs.skill_level,
    COUNT(*) as spare_count
FROM volleyball_spares vs
JOIN leagues l ON vs.league_id = l.id
WHERE vs.is_active = true
GROUP BY l.name, vs.skill_level
ORDER BY l.name, vs.skill_level;
```

## Testing

Run the test suite to validate the migration:

```sql
-- Run comprehensive tests
\i test_volleyball_spares_migration.sql
```

The test suite validates:
- Table structure and constraints
- Data integrity rules
- Security policies
- Helper functions
- Trigger functions
- Index creation
- RLS enforcement

## Rollback

If you need to remove the volleyball spares feature:

```sql
-- WARNING: This will delete all spare registration data
\i rollback_20250828000000_create_volleyball_spares_table.sql
```

The rollback script:
- Optionally backs up existing data
- Removes all functions, triggers, and policies
- Drops all indexes
- Removes the table completely
- Verifies clean removal

## Integration Points

### Frontend Integration

The frontend should:

1. **Player Registration Page**: Allow users to register as spares
2. **Captain Dashboard**: Show available spares for captain's leagues  
3. **League Management**: Allow admins to view spare statistics
4. **User Profile**: Show user's spare registrations

### API Endpoints Needed

Consider creating these API endpoints:

- `POST /api/volleyball-spares` - Register as spare
- `GET /api/volleyball-spares/league/:id` - Get spares for league
- `PUT /api/volleyball-spares/:id` - Update spare registration  
- `DELETE /api/volleyball-spares/:id` - Deactivate spare registration

### Email Notifications

Consider adding email notifications when:
- A new spare registers for a league
- A captain views spare contact information
- Spare registrations are about to expire (if you add expiration)

## Monitoring & Maintenance

### Recommended Monitoring

- Track spare registration rates by league
- Monitor captain usage of spare system
- Watch for inactive spare registrations
- Check for leagues with no spare coverage

### Periodic Maintenance

Consider adding:
- Automated cleanup of very old inactive registrations
- Notification system for captains about available spares
- Seasonal reminders for players to update spare status

## Security Considerations

1. **Contact Information**: Captains can see player contact info - ensure this is acceptable
2. **Spam Prevention**: Consider rate limiting for spare registrations
3. **Data Retention**: Plan for how long to keep spare registration data
4. **Audit Trail**: All changes are timestamped for accountability

## Future Enhancements

Potential future improvements:

1. **Expiration Dates**: Auto-expire spare registrations after a season
2. **Skill Verification**: Allow captains to rate/verify player skill levels
3. **Availability Calendar**: More detailed availability tracking
4. **Automated Matching**: Smart spare suggestion algorithms
5. **Mobile Notifications**: Push notifications for spare requests
6. **Geographic Preferences**: Location-based spare matching

## Support

For issues or questions about this migration:

1. Check the test results from `test_volleyball_spares_migration.sql`
2. Verify RLS policies are working correctly
3. Check database logs for constraint violations
4. Review function execution plans for performance issues

## Migration History

- **v1.0** (2025-08-28): Initial volleyball spares system implementation
  - Basic table structure with constraints
  - RLS policies for secure access
  - Helper functions for common operations
  - Comprehensive test suite
  - Complete rollback capability
