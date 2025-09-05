# Team League Transfer Feature Enhancement Plan

## Overview
Enhance the team league transfer functionality with additional safety checks, better UX, and audit capabilities.

## Current State
- Basic transfer functionality implemented and deployed
- Edge Function handles transfers with admin authentication
- UI allows transfers through modal dialog
- Payment records migrate with team
- Audit trail in team_transfer_history table

## Proposed Enhancements

### 1. Transfer History View
**Goal**: Provide admins visibility into all team transfers

**Implementation**:
- Add new tab in ManageTeamsTab: "Transfer History"
- Create TransferHistoryTable component
- Query team_transfer_history with team/league details
- Display: Team Name, From League, To League, Transferred By, Date, Reason
- Add filtering by date range and league

**Files to modify**:
- `/src/screens/MyAccount/components/ManageTeamsTab/ManageTeamsTab.tsx`
- Create: `/src/screens/MyAccount/components/ManageTeamsTab/TransferHistoryTable.tsx`

### 2. Bulk Transfer Capability
**Goal**: Allow admins to transfer multiple teams at once (e.g., moving all teams from one league to another)

**Implementation**:
- Add checkbox selection to team cards/table
- "Bulk Actions" dropdown with "Transfer Selected" option
- Modal to select target league with confirmation
- New Edge Function: `/supabase/functions/bulk-transfer-teams`
- Progress indicator during bulk operation

**Files to create/modify**:
- Create: `/supabase/functions/bulk-transfer-teams/index.ts`
- Modify: `/src/screens/MyAccount/components/ManageTeamsTab/ManageTeamsTab.tsx`
- Create: `/src/screens/MyAccount/components/ManageTeamsTab/BulkTransferModal.tsx`

### 3. Transfer Validation Enhancements
**Goal**: Add more comprehensive checks before allowing transfers

**Additional Checks**:
- League capacity check (prevent over-filling leagues)
- Season timing check (warn if mid-season)
- Outstanding balance check (warn if team has unpaid fees)
- Duplicate team name check in target league

**Files to modify**:
- `/supabase/functions/transfer-team/index.ts` - Add validation checks
- `/src/screens/MyAccount/components/ManageTeamsTab/TransferTeamModal.tsx` - Display warnings

### 4. Undo Transfer Capability
**Goal**: Allow admins to reverse a recent transfer within a time window

**Implementation**:
- Add "undo_until" timestamp to team_transfer_history
- 24-hour undo window
- New Edge Function: `/supabase/functions/undo-team-transfer`
- "Undo" button in transfer history view
- Restore previous league_id and payment records

**Files to create/modify**:
- Migration: Add undo_until column to team_transfer_history
- Create: `/supabase/functions/undo-team-transfer/index.ts`
- Modify: `/src/screens/MyAccount/components/ManageTeamsTab/TransferHistoryTable.tsx`

### 5. Email Notifications
**Goal**: Notify team captain when their team is transferred

**Implementation**:
- Add email template for transfer notification
- Send email from Edge Function after successful transfer
- Include: New league details, reason for transfer, contact info

**Files to modify**:
- `/supabase/functions/transfer-team/index.ts` - Add email sending

## Testing Strategy

### Integration Tests to Create:
1. Test successful single team transfer
2. Test transfer with active matches (should fail)
3. Test transfer to inactive league (should fail)
4. Test payment record migration
5. Test transfer history logging
6. Test bulk transfer operation
7. Test undo transfer within window
8. Test undo transfer after window expires

### Test Files:
- Create: `/src/__tests__/team-transfer.test.tsx`
- Create: `/src/__tests__/bulk-transfer.test.tsx`

## Implementation Order

1. **Phase 1** (Core Enhancements):
   - Transfer history view
   - Enhanced validation checks
   - Integration tests

2. **Phase 2** (Advanced Features):
   - Bulk transfer capability
   - Undo transfer functionality

3. **Phase 3** (Polish):
   - Email notifications
   - Performance optimizations
   - Additional filtering/sorting options

## Database Changes

### Migration: Add undo capability
```sql
ALTER TABLE team_transfer_history
ADD COLUMN undo_until TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
ADD COLUMN undone_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN undone_by UUID REFERENCES auth.users(id);
```

### Migration: Add league capacity
```sql
ALTER TABLE leagues
ADD COLUMN max_teams INTEGER DEFAULT 20;
```

## Security Considerations

- All operations require admin authentication
- Audit trail for all transfers and undos
- Rate limiting on bulk operations
- Validation of all input parameters
- Proper CORS headers on Edge Functions

## Performance Considerations

- Paginate transfer history table
- Index team_transfer_history on common query fields
- Batch database operations in bulk transfer
- Use database transactions for consistency

## Success Metrics

- Zero data loss during transfers
- All payment records correctly migrated
- Complete audit trail maintained
- Sub-second response time for single transfers
- < 10 second completion for bulk transfers (up to 20 teams)

## Rollback Plan

If issues arise:
1. Disable transfer UI components
2. Keep Edge Functions active for debugging
3. Use undo capability to reverse problematic transfers
4. Manual database corrections if needed
5. Restore from backups as last resort

## Next Steps

1. Review and approve this plan
2. Implement Phase 1 features
3. Create comprehensive tests
4. Deploy to staging for testing
5. Gather admin feedback
6. Implement Phase 2 & 3 based on priority