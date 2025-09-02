# Clean Tier Management Refactor Plan

## Functions to Keep (Time/Location/Court Management):
- `loadDefaults()` - Load tier-specific defaults
- `updateTierDefaults()` - Save tier-specific defaults 
- `handleSaveWeeklyTier()` - Save tier edits with defaults
- `loadWeeklySchedule()` - Load weekly schedule data
- All drag & drop functionality for teams
- All team management functions

## Functions to Remove (Broken Tier Add/Remove):
- `shiftTierDefaultsUp()` - REMOVE
- `shiftTierDefaultsDown()` - REMOVE  
- `confirmRemoveTier()` - REMOVE
- `handleRemoveTier()` - REMOVE
- `handleWeeklyRemoveTier()` - REMOVE
- `handleWeeklyInsertTier()` - REMOVE
- `fixTierNumberingGaps()` - REMOVE
- All tier removal confirmation modal code
- All tier insertion UI buttons

## New Clean Functions to Implement:

### 1. Add Tier Function:
```typescript
const addTier = async (afterTierNumber: number) => {
  // 1. Get max week for this league
  // 2. For each week >= currentWeek:
  //    - Shift tier_number +1 for tiers > afterTierNumber  
  //    - Insert new tier at afterTierNumber + 1
  // 3. Refresh UI
}
```

### 2. Remove Tier Function:
```typescript  
const removeTier = async (tierNumber: number) => {
  // 1. Check if tier has teams - prevent if yes
  // 2. For each week >= currentWeek:
  //    - Delete tier with tier_number = tierNumber
  //    - Shift tier_number -1 for tiers > tierNumber
  // 3. Refresh UI
}
```

### 3. Simple UI:
- One "Add Tier" button after last tier
- One "Remove Tier" button on empty tiers only
- No complex modals, just simple confirm()

## Benefits:
- Clean, predictable code
- Multi-week consistency guaranteed
- No complex tier defaults shifting
- No gaps in tier numbering
- Easy to debug and maintain