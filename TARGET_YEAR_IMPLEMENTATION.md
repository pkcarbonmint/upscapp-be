# Target Year Exclusive Focus Implementation

## Overview

This implementation addresses the requirement for **exclusive prelims/mains focus during target year seasons**. The key principle is:

- **Non-target year students**: Study both prelims and mains content regardless of season
- **Target year students**: Focus exclusively on the current season's content
  - During Prelims season (Feb-May): Only prelims content
  - During Mains season (Jun-Jan): Only mains content

## Business Logic

### Target Year Detection

```haskell
-- Example scenarios:
Student targeting 2027:
- In 2025: ComprehensiveStudy (all subjects)
- In 2026: ComprehensiveStudy (all subjects)  
- In 2027 Feb-May: ExclusivePrelims (only prelims subjects)
- In 2027 Jun-Jan: ExclusiveMains (only mains subjects)
```

### Subject Filtering Rules

| Effective Season | Included Subjects | Excluded Subjects |
|-----------------|-------------------|-------------------|
| ExclusivePrelims | PrelimsOnly + BothExams | MainsOnly |
| ExclusiveMains | MainsOnly + BothExams | PrelimsOnly |
| ComprehensiveStudy | All subjects | None |

## Implementation Components

### 1. New Data Types

#### `EffectiveStudySeason`
```haskell
data EffectiveStudySeason = 
    ExclusivePrelims    -- Target year + Prelims season
  | ExclusiveMains      -- Target year + Mains season  
  | ComprehensiveStudy  -- Non-target year or no target set
```

#### `StudySeasonContext`
```haskell
data StudySeasonContext = StudySeasonContext
  { baseSeason :: StudySeason      -- PrelimsSeason | MainsSeason | BalancedSeason
  , isTargetYear :: Bool           -- Whether current year matches target year
  , targetYear :: Maybe Int        -- Student's target year
  , currentYear :: Int             -- Current calendar year
  }
```

#### Enhanced `StudentIntake`
```haskell
data StudentIntake = StudentIntake
  { subject_confidence :: SubjectConfidenceMap
  , study_strategy :: StudyStrategy
  , target_year :: Maybe Int  -- NEW: Student's target exam year
  }
```

#### Enhanced `StudyPlan`
```haskell
data StudyPlan = StudyPlan
  { -- ... existing fields ...
  , effective_season_context :: Maybe EffectiveStudySeason  -- NEW
  , created_for_target_year :: Maybe Int                    -- NEW
  }
```

### 2. Core Logic Module: `TargetYearLogic.hs`

Key functions:
- `getEffectiveStudySeason :: Maybe Int -> IO EffectiveStudySeason`
- `filterByEffectiveSeason :: [Subject] -> EffectiveStudySeason -> [Subject]`
- `isCurrentYearTargetYear :: Maybe Int -> IO Bool`
- `generateStudyPlanTitleWithTargetYear :: Archetype -> EffectiveStudySeason -> Text`

### 3. Enhanced Sequencer

#### New Function: `sequenceSubjectsWithTargetYear`
- Uses `getEffectiveStudySeason` to determine filtering approach
- Applies `filterByEffectiveSeason` instead of legacy `filterBySeason`
- Maintains all existing sequencing logic (confidence-based sorting, etc.)

### 4. Enhanced Engine

#### New Function: `generateInitialPlanWithTargetYear`
- Replaces legacy seasonal detection with target year awareness
- Uses new sequencing function
- Stores effective season context in the generated plan
- Generates appropriate plan titles

## Usage Examples

### Scenario 1: Non-Target Year Student
```haskell
-- Student targeting 2027, current year is 2025, March (Prelims season)
studentIntake = StudentIntake { target_year = Just 2027, ... }

-- Result: ComprehensiveStudy
-- All subjects included: History, Geography, Essay, CSAT, etc.
```

### Scenario 2: Target Year Prelims Student  
```haskell
-- Student targeting 2025, current year is 2025, March (Prelims season)
studentIntake = StudentIntake { target_year = Just 2025, ... }

-- Result: ExclusivePrelims
-- Only: History, Geography, CSAT, etc. (PrelimsOnly + BothExams)
-- Excluded: Essay, Optional subjects (MainsOnly)
```

### Scenario 3: Target Year Mains Student
```haskell
-- Student targeting 2025, current year is 2025, August (Mains season)
studentIntake = StudentIntake { target_year = Just 2025, ... }

-- Result: ExclusiveMains  
-- Only: History, Geography, Essay, Optional subjects (MainsOnly + BothExams)
-- Excluded: CSAT (PrelimsOnly)
```

## Backward Compatibility

- Existing `generateInitialPlan` function unchanged
- Students without `target_year` field default to `ComprehensiveStudy`
- Legacy plans continue to work without modification
- Optional fields in JSON parsing ensure smooth migration

## Testing

### Unit Tests: `TargetYearLogicSpec.hs`
- Subject filtering correctness
- Plan title generation
- Property-based tests for filtering logic

### Demo Script: `DemoTargetYearLogic.hs`
- Interactive demonstration of different scenarios
- Shows filtering behavior for each effective season

## Migration Path

1. **Phase 1**: Deploy new logic alongside existing logic
2. **Phase 2**: Update frontend to include `target_year` field
3. **Phase 3**: Switch API endpoints to use `generateInitialPlanWithTargetYear`
4. **Phase 4**: Migrate existing student data to include target years

## Key Benefits

1. **Focused Preparation**: Target year students get laser-focused seasonal content
2. **Comprehensive Foundation**: Non-target year students build complete knowledge base
3. **Flexible Timing**: Students can prepare over multiple years without missing content
4. **Backward Compatible**: Existing functionality preserved
5. **Testable**: Clear business rules enable comprehensive testing

## Files Modified

- `src/Types/Student.hs` - Added target_year field
- `src/Types/Domain.hs` - Added new season types
- `src/Types/Planning.hs` - Enhanced StudyPlan with context
- `src/TargetYearLogic.hs` - NEW: Core target year logic
- `src/Sequencer.hs` - Added target year aware sequencing
- `src/Engine.hs` - Added new plan generation function
- `test/Spec/TargetYearLogicSpec.hs` - NEW: Unit tests
- `DemoTargetYearLogic.hs` - NEW: Demo script
