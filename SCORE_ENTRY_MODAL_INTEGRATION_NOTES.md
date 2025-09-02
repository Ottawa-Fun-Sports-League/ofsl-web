# Score Entry Modal Integration Notes

## Overview
The score entry modal needs to dynamically handle different game formats for each tier, with formats potentially changing on a per-week basis. Each format requires a different scorecard layout and database schema.

## Current Implementation Status
- **Submit Scores links**: ✅ Implemented in both public (`LeagueSchedule.tsx`) and admin (`AdminLeagueSchedule.tsx`) views
- **Modal trigger**: ✅ Working - shows placeholder message
- **Dynamic format handling**: ❌ **NEEDS TO BE BUILT**
- **Database integration**: ❌ **NEEDS TO BE BUILT**

## Game Formats (7 Total)

Based on `TierEditModal.tsx` and `AdminLeagueSchedule.tsx`:

| Format Value | Display Name | Team Count | Score Card Requirements |
|--------------|--------------|------------|------------------------|
| `3-teams-6-sets` | 3 teams (6 sets) | 3 | Team A, B, C scores for 6 sets |
| `2-teams-4-sets` | 2 teams (4 sets) | 2 | Team A, B scores for 4 sets |
| `2-teams-best-of-5` | 2 teams (Best of 5) | 2 | Team A, B scores - best of 5 format |
| `2-teams-best-of-3` | 2 teams (Best of 3) | 2 | Team A, B scores - best of 3 format |
| `4-teams-head-to-head` | 4 teams (Head-to-head) | 4 | Team A, B, C, D head-to-head results |
| `6-teams-head-to-head` | 6 teams (head-to-head) | 6 | Team A, B, C, D, E, F head-to-head results |
| `2-teams-elite` | 2 teams (Elite) | 2 | Team A, B scores - elite format |

## Dynamic Format Requirements

### Per-Week Flexibility
- **Each tier can change format between weeks**
- **Format is stored in `weekly_schedules.format` column**
- **Different tiers in same week can have different formats**
- **Score entry modal must read current week's format for the specific tier**

### Data Flow
```
SubmitScoresModal receives:
├── tierData.tier_number (current)
├── tierData.week_number (current) 
└── **NEEDS**: tierData.format (from weekly_schedules.format)
```

## Score Card Layout Requirements

### 1. **3-teams-6-sets** (Current Default)
```
Team A: [__] vs Team B: [__] (Set 1)
Team A: [__] vs Team C: [__] (Set 2)
Team B: [__] vs Team C: [__] (Set 3)
Team A: [__] vs Team B: [__] (Set 4)
Team A: [__] vs Team C: [__] (Set 5)
Team B: [__] vs Team C: [__] (Set 6)
```

### 2. **2-teams-4-sets**
```
Team A: [__] vs Team B: [__] (Set 1)
Team A: [__] vs Team B: [__] (Set 2)
Team A: [__] vs Team B: [__] (Set 3)
Team A: [__] vs Team B: [__] (Set 4)
```

### 3. **2-teams-best-of-5**
```
Team A: [__] vs Team B: [__] (Set 1)
Team A: [__] vs Team B: [__] (Set 2)
Team A: [__] vs Team B: [__] (Set 3)
Team A: [__] vs Team B: [__] (Set 4) [Optional]
Team A: [__] vs Team B: [__] (Set 5) [Optional]
Winner: [A/B] (First to win 3 sets)
```

### 4. **4-teams-head-to-head**
```
Team A vs Team B: Winner [A/B]
Team A vs Team C: Winner [A/C]
Team A vs Team D: Winner [A/D]
Team B vs Team C: Winner [B/C]
Team B vs Team D: Winner [B/D]
Team C vs Team D: Winner [C/D]
Final Ranking: [1st][2nd][3rd][4th]
```

### 5. **6-teams-head-to-head**
```
15 total matchups (each team plays every other team)
Team A vs [B,C,D,E,F]
Team B vs [C,D,E,F]
... etc
Final Ranking: [1st][2nd][3rd][4th][5th][6th]
```

## Database Schema Requirements

### Current Schema (Needs Extension)
```sql
-- game_results table (current - needs to be flexible)
CREATE TABLE game_results (
  id INTEGER PRIMARY KEY,
  weekly_schedule_id INTEGER REFERENCES weekly_schedules(id),
  league_id INTEGER,
  week_number INTEGER,
  tier_number INTEGER,
  -- CURRENT (3-team specific):
  team_a_score INTEGER,
  team_b_score INTEGER, 
  team_c_score INTEGER,
  -- NEEDS: Format-specific columns or JSON structure
);
```

### Proposed Schema Extensions
**Option 1: JSON Column (Recommended)**
```sql
ALTER TABLE game_results 
ADD COLUMN format_type TEXT,
ADD COLUMN scores_data JSONB;

-- Examples:
-- 3-teams-6-sets: {"sets": [{"a": 21, "b": 19}, {"a": 18, "c": 21}, ...]}
-- 2-teams-best-of-5: {"sets": [{"a": 21, "b": 19}, ...], "winner": "a"}
-- 4-teams-head-to-head: {"matchups": [{"teams": ["a","b"], "winner": "a"}, ...]}
```

**Option 2: Separate Tables**
```sql
-- Keep game_results minimal, add format-specific tables
CREATE TABLE game_result_sets (...);
CREATE TABLE game_result_matchups (...);
CREATE TABLE game_result_rankings (...);
```

## Implementation Architecture

### Component Structure
```
SubmitScoresModal/
├── index.tsx (main modal)
├── ScoreCardRenderer.tsx (format selector)
├── formats/
│   ├── ThreeTeamSixSets.tsx
│   ├── TwoTeamFourSets.tsx
│   ├── TwoTeamBestOfFive.tsx
│   ├── TwoTeamBestOfThree.tsx
│   ├── FourTeamHeadToHead.tsx
│   ├── SixTeamHeadToHead.tsx
│   └── TwoTeamElite.tsx
└── types/
    └── ScoreCardTypes.ts
```

### Data Flow
```typescript
// 1. Modal receives tier data with format
interface SubmitScoresModalProps {
  tierData: {
    id: number;
    tier_number: number;
    week_number: number;
    format: string; // ← KEY: from weekly_schedules.format
    team_names: string[]; // Dynamic based on format
    // ... other props
  };
}

// 2. ScoreCardRenderer selects appropriate component
const ScoreCardRenderer = ({ format, teams, onScoresChange }) => {
  switch (format) {
    case '3-teams-6-sets':
      return <ThreeTeamSixSets teams={teams} onChange={onScoresChange} />;
    case '2-teams-4-sets':
      return <TwoTeamFourSets teams={teams} onChange={onScoresChange} />;
    // ... etc
  }
};

// 3. Format-specific components handle scoring logic
const ThreeTeamSixSets = ({ teams, onChange }) => {
  const [sets, setSets] = useState([
    { teamA: 0, teamB: 0 },
    { teamA: 0, teamC: 0 },
    // ... 6 sets total
  ]);
};
```

### Team Assignment Logic
```typescript
// Current: Fixed A, B, C positions
team_a_name: string | null;
team_b_name: string | null; 
team_c_name: string | null;

// Needed: Dynamic team array based on format
const getTeamsForTier = (tier: WeeklyScheduleTier) => {
  const teamCount = getTeamCountForFormat(tier.format);
  const teams: string[] = [];
  
  if (tier.team_a_name) teams.push(tier.team_a_name);
  if (tier.team_b_name) teams.push(tier.team_b_name);
  if (tier.team_c_name && teamCount >= 3) teams.push(tier.team_c_name);
  // ... handle up to 6 teams for 6-teams-head-to-head
  
  return teams;
};
```

## Integration Checklist

### Phase 1: Modal Infrastructure
- [ ] Update `SubmitScoresModal` to receive format from `weekly_schedules.format`
- [ ] Create `ScoreCardRenderer` component for format switching
- [ ] Build basic score card components for each format
- [ ] Update `tierData` interface to include format and dynamic teams

### Phase 2: Database Integration  
- [ ] Extend `game_results` table schema (JSON column recommended)
- [ ] Update score submission API to handle different formats
- [ ] Create format-specific validation logic
- [ ] Test data persistence for all 7 formats

### Phase 3: Team Assignment
- [ ] Update database schema to support up to 6 teams per tier
- [ ] Modify `weekly_schedules` table team columns (or use JSON)
- [ ] Update tier editing to support dynamic team counts
- [ ] Update team assignment UI for different formats

### Phase 4: Score Display
- [ ] Create format-specific score display components
- [ ] Update standings calculation for different scoring systems
- [ ] Handle format-specific winner determination
- [ ] Update league results display

## Notes
- **Format changes between weeks**: Each week's schedule can have different formats per tier
- **Backward compatibility**: Ensure existing 3-team data continues to work
- **Validation**: Each format needs specific validation rules (e.g., best-of-5 can't have more than 5 sets)
- **Performance**: Consider caching format definitions and team assignments
- **Testing**: Need integration tests for all 7 formats
- **Migration**: Plan data migration strategy for existing leagues

## Key Files to Modify
1. `SubmitScoresModal.tsx` - Main modal logic
2. `weekly_schedules` table - Ensure format column exists
3. `game_results` table - Extend schema for flexible scoring
4. `LeagueSchedule.tsx` - Pass format data to modal
5. `AdminLeagueSchedule.tsx` - Pass format data to modal
6. `getTeamCountForFormat()` - Already exists, can be reused