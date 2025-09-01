# Phone Number Sharing Opt-in Feature Implementation Plan

## Overview
Implement a comprehensive phone number sharing opt-in feature for the spares system that prioritizes user privacy by defaulting to NOT sharing phone numbers, while allowing users to easily opt-in during signup.

## Current State Analysis
Based on code review:
- Spares table exists with basic structure (id, user_id, sport_id, skill_level, availability_notes, is_active, timestamps)
- SparesSignupModal shows privacy notice but assumes all contact info is shared
- SparesListView displays phone copy buttons for all users when phone exists
- MySparesRegistrations shows privacy reminder about sharing all contact info
- register_spare RPC function accepts sport_id, skill_level, availability_notes
- TypeScript interfaces define the current structure

## Implementation Plan

### 1. Database Migration
**File:** `/Users/hongzhang/Workspace/ofsl-web-org/supabase/migrations/20250828220000_add_share_phone_to_spares.sql`

- Add `share_phone` boolean column to spares table (default: false)
- Update register_spare RPC function to accept phone sharing preference parameter
- Update RLS policies if needed (likely no changes required)
- Add appropriate indexes for performance

### 2. Update RPC Function
**Function:** `register_spare`

- Add `p_share_phone` parameter with default value false
- Include share_phone in INSERT statement
- Update function comments and validation

### 3. Update TypeScript Interfaces
**Files:** 
- `/Users/hongzhang/Workspace/ofsl-web-org/src/components/spares/SparesListView.tsx`
- `/Users/hongzhang/Workspace/ofsl-web-org/src/components/spares/MySparesRegistrations.tsx`

- Add `share_phone: boolean` to Spare and SparesRegistration interfaces
- Ensure type safety across all components

### 4. Update SparesSignupModal
**File:** `/Users/hongzhang/Workspace/ofsl-web-org/src/components/spares/SparesSignupModal.tsx`

- Add phone sharing checkbox with clear labeling
- Update privacy notice to reflect opt-in behavior
- Add sharePhone state management
- Update handleSubmit to pass share_phone parameter to register_spare RPC
- Show conditional messaging based on phone sharing choice

### 5. Update SparesListView
**File:** `/Users/hongzhang/Workspace/ofsl-web-org/src/components/spares/SparesListView.tsx`

- Conditionally show phone copy button only when share_phone is true
- Update contact actions section logic
- Maintain email copy functionality (always available)
- Update interface to include share_phone field

### 6. Update MySparesRegistrations
**File:** `/Users/hongzhang/Workspace/ofsl-web-org/src/components/spares/MySparesRegistrations.tsx`

- Display phone sharing preference status for each registration
- Update privacy notice to reflect opt-in behavior
- Add visual indicators for phone sharing status
- Include share_phone in interface and data fetching

### 7. Privacy-First Approach
**Key Principles:**
- Default to NOT sharing phone numbers (privacy by default)
- Clear, explicit opt-in during signup
- Transparent display of sharing preferences in user's registrations
- Only show phone contact options when explicitly consented

## Technical Implementation Details

### Database Schema Changes
```sql
ALTER TABLE public.spares ADD COLUMN share_phone BOOLEAN DEFAULT false NOT NULL;
```

### RPC Function Update
```sql
CREATE OR REPLACE FUNCTION register_spare(
    p_sport_id BIGINT,
    p_skill_level TEXT,
    p_availability_notes TEXT DEFAULT NULL,
    p_share_phone BOOLEAN DEFAULT false
)
```

### UI/UX Improvements
- Checkbox with clear label: "Share my phone number with team captains"
- Help text explaining the feature
- Visual indicators in MySparesRegistrations showing sharing status
- Updated privacy notices reflecting opt-in approach

## Testing Strategy
- Unit tests for RPC function with new parameter
- Integration tests for signup flow with phone sharing options
- UI tests for conditional phone button display
- Privacy compliance testing (ensure phone not shown when share_phone=false)

## Migration Safety
- Non-breaking change (new column with default value)
- Backward compatible (existing registrations default to not sharing)
- Can be rolled back safely if needed

## User Experience Goals
1. **Privacy by Default**: Users must explicitly choose to share phone
2. **Clear Communication**: Users understand what they're opting into
3. **Easy Control**: Users can see their sharing preferences clearly
4. **Transparent Display**: Other users only see phone when consented

## Implementation Order
1. Database migration (foundation)
2. TypeScript interface updates (type safety)
3. RPC function update (backend logic)
4. SparesSignupModal updates (user input)
5. SparesListView updates (display logic)
6. MySparesRegistrations updates (user management)

This approach ensures a privacy-first implementation that gives users complete control over their phone number sharing while maintaining the existing functionality for email contact.