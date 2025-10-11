# Block-Level Resource Curation Design
*Granular Resource Management with Plan-Level Aggregation*

## Overview

The current system has a placeholder for curated resources at the plan level, but lacks granular resource management. This design proposes a more sophisticated approach where resources are curated at the block level and intelligently aggregated at the plan level.

## Current State Analysis

### What Exists:
```haskell
-- In Types.hs
data StudyPlan = StudyPlan
  { study_plan_id :: UUID
  , user_id :: Text
  , title :: Text
  , blocks :: [Block]
  , curated_resources :: Value  -- Currently just a JSON blob
  }

-- In Engine.hs
getCuratedResources :: StudentIntake -> [Text] -> IO Value
getCuratedResources _intake _subjects = return (object [])  -- Placeholder
```

### Issues with Current Approach:
1. **No granularity**: Resources lumped at plan level
2. **No context**: Resources not tied to specific blocks or subjects
3. **No progressive discovery**: Students can't access resources as they progress through blocks
4. **No block-specific optimization**: Can't tailor resources to block content and duration
5. **Maintenance nightmare**: One large resource list vs. manageable block-level lists

## Proposed Design: Block-Level Resource Curation

### **Core Concept**

Each block gets its own curated resource list, and the plan-level resources become an intelligent aggregation/summary of all block resources.

### **Architecture Overview**

```
┌─────────────────┐
│   StudyPlan     │
│                 │
│ ┌─────────────┐ │    ┌──────────────────┐
│ │   Block 1   │ │────│ Block Resources  │
│ │ Resources   │ │    │ Service Call     │
│ └─────────────┘ │    └──────────────────┘
│                 │
│ ┌─────────────┐ │    ┌──────────────────┐
│ │   Block 2   │ │────│ Block Resources  │
│ │ Resources   │ │    │ Service Call     │
│ └─────────────┘ │    └──────────────────┘
│                 │
│ ┌─────────────┐ │    ┌──────────────────┐
│ │ Plan Level  │ │────│ Aggregated       │
│ │ Resources   │ │    │ Resources        │
│ └─────────────┘ │    └──────────────────┘
└─────────────────┘
```

## Enhanced Data Types

### **1. Enhanced Block with Resources**

```haskell
data Block = Block
  { block_id :: UUID
  , title :: Text
  , subjects :: [Text]
  , duration_weeks :: Int
  , weekly_plan :: WeeklyPlan
  , block_resources :: BlockResources  -- NEW: Block-specific resources
  } deriving (Show, Eq, Generic, FromJSON, ToJSON)
```

### **2. Block Resources Structure**

```haskell
data BlockResources = BlockResources
  { primary_books :: [Resource]           -- Core textbooks for this block
  , supplementary_materials :: [Resource] -- Additional reading materials
  , practice_resources :: [Resource]      -- MCQ/practice test resources
  , video_content :: [Resource]           -- Video lectures/content
  , current_affairs_sources :: [Resource] -- CA sources relevant to subjects
  , revision_materials :: [Resource]      -- Quick revision notes/materials
  , expert_recommendations :: [Resource]  -- Mentor/expert suggested resources
  } deriving (Show, Eq, Generic, FromJSON, ToJSON)

data Resource = Resource
  { resource_id :: UUID
  , title :: Text
  , resource_type :: ResourceType
  , url :: Maybe Text
  , description :: Text
  , subjects :: [Text]                   -- Which subjects this resource covers
  , difficulty_level :: DifficultyLevel
  , estimated_hours :: Int               -- Time needed to complete
  , priority :: ResourcePriority
  , cost :: ResourceCost
  } deriving (Show, Eq, Generic, FromJSON, ToJSON)

data ResourceType 
  = Book | VideoLecture | OnlineCourse | PracticePaper 
  | CurrentAffairsSource | RevisionNotes | MockTest
  deriving (Show, Eq, Generic, FromJSON, ToJSON)

data DifficultyLevel = Beginner | Intermediate | Advanced
  deriving (Show, Eq, Generic, FromJSON, ToJSON)

data ResourcePriority = Essential | Recommended | Optional
  deriving (Show, Eq, Generic, FromJSON, ToJSON)

data ResourceCost = Free | Paid Int | Subscription Text
  deriving (Show, Eq, Generic, FromJSON, ToJSON)
```

### **3. Plan-Level Aggregated Resources**

```haskell
data PlanResources = PlanResources
  { essential_resources :: [Resource]      -- Must-have resources across all blocks
  , recommended_timeline :: ResourceTimeline  -- When to use which resources
  , budget_summary :: BudgetSummary        -- Cost breakdown
  , alternative_options :: [Resource]      -- Alternative resource suggestions
  , progress_resources :: ProgressResources -- Resources for different completion stages
  } deriving (Show, Eq, Generic, FromJSON, ToJSON)

data ResourceTimeline = ResourceTimeline
  { immediate_needs :: [Resource]    -- Resources needed for first 2-4 weeks
  , mid_term_needs :: [Resource]     -- Resources for weeks 5-12
  , long_term_needs :: [Resource]    -- Resources for full plan duration
  } deriving (Show, Eq, Generic, FromJSON, ToJSON)

data BudgetSummary = BudgetSummary
  { total_cost :: Int
  , essential_cost :: Int
  , optional_cost :: Int
  , free_alternatives :: Int
  , subscription_cost :: Int
  } deriving (Show, Eq, Generic, FromJSON, ToJSON)
```

## Service Integration Design

### **1. Block Resource Service Interface**

```haskell
-- External service interface for fetching block resources
class BlockResourceService where
  getResourcesForBlock :: BlockDefinition -> StudentProfile -> IO BlockResources
  
data BlockDefinition = BlockDefinition
  { block_subjects :: [Text]
  , block_duration :: Int
  , block_focus :: StudySeason
  , student_archetype :: Archetype
  , confidence_levels :: SubjectConfidenceMap
  } deriving (Show, Eq)

data StudentProfile = StudentProfile
  { archetype :: Archetype
  , confidence_map :: SubjectConfidenceMap
  , study_preferences :: StudyStrategy
  , budget_preference :: BudgetPreference
  , learning_style :: LearningStyle
  } deriving (Show, Eq)

data BudgetPreference = BudgetFree | BudgetLow | BudgetMedium | BudgetHigh
  deriving (Show, Eq)

data LearningStyle = Visual | Auditory | ReadingWriting | Kinesthetic | Mixed
  deriving (Show, Eq)
```

### **2. Implementation Interface**

```haskell
-- Concrete implementation (placeholder for actual service)
instance BlockResourceService where
  getResourcesForBlock blockDef studentProfile = do
    -- Call external resource curation service
    -- This could be an HTTP API, database query, ML service, etc.
    resourceServiceResponse <- callResourceCurationAPI blockDef studentProfile
    return $ parseBlockResources resourceServiceResponse

-- HTTP service call example
callResourceCurationAPI :: BlockDefinition -> StudentProfile -> IO ResourceServiceResponse
callResourceCurationAPI blockDef profile = do
  let requestPayload = ResourceRequest
        { subjects = block_subjects blockDef
        , duration_weeks = block_duration blockDef
        , season = block_focus blockDef
        , archetype = student_archetype blockDef
        , confidence = confidence_levels blockDef
        , budget = budget_preference profile
        , learning_style = learning_style profile
        }
  
  -- HTTP POST to resource service
  response <- postJSON "https://api.helios.com/resources/curate" requestPayload
  return $ parseResponse response
```

## Enhanced Engine Implementation

### **1. Modified Block Planning with Resources**

```haskell
-- Enhanced block creation with resource curation
createFinalBlockFrom :: Config -> StudentIntake -> [Subject] -> IO Block
createFinalBlockFrom config studentIntake subjectChunk = do
  -- Existing block creation logic...
  basicBlock <- createBasicBlock config studentIntake subjectChunk
  
  -- NEW: Curate resources for this specific block
  let blockDef = BlockDefinition
        { block_subjects = map subjectCode subjectChunk
        , block_duration = duration_weeks basicBlock
        , block_focus = getCurrentStudySeason  -- TODO: Should be contextual
        , student_archetype = determineArchetype studentIntake
        , confidence_levels = subject_confidence studentIntake
        }
      
      studentProfile = StudentProfile
        { archetype = determineArchetype studentIntake
        , confidence_map = subject_confidence studentIntake
        , study_preferences = study_strategy studentIntake
        , budget_preference = extractBudgetPreference studentIntake
        , learning_style = extractLearningStyle studentIntake
        }
  
  blockResources <- getResourcesForBlock blockDef studentProfile
  
  return $ basicBlock { block_resources = blockResources }
```

### **2. Plan-Level Resource Aggregation**

```haskell
-- Aggregate block resources into plan-level resources
aggregatePlanResources :: [Block] -> StudentProfile -> IO PlanResources
aggregatePlanResources blocks studentProfile = do
  let allBlockResources = map block_resources blocks
  
  -- Extract essential resources across all blocks
  let essentialResources = concatMap primary_books allBlockResources
                        ++ concatMap (filter (\r -> priority r == Essential) . supplementary_materials) allBlockResources
  
  -- Create resource timeline
  let immediateResources = extractResourcesForBlocks (take 2 blocks)
      midTermResources = extractResourcesForBlocks (take 8 (drop 2 blocks))
      longTermResources = extractResourcesForBlocks (drop 8 blocks)
      
      timeline = ResourceTimeline immediateResources midTermResources longTermResources
  
  -- Calculate budget summary
  budgetSummary <- calculateBudgetSummary allBlockResources
  
  -- Find alternative options
  alternatives <- findAlternativeResources allBlockResources studentProfile
  
  return $ PlanResources
    { essential_resources = deduplicateResources essentialResources
    , recommended_timeline = timeline
    , budget_summary = budgetSummary
    , alternative_options = alternatives
    , progress_resources = createProgressResources blocks
    }
```

### **3. Enhanced Plan Generation**

```haskell
-- Modified generateInitialPlan with block-level resource curation
generateInitialPlan :: Config -> Archetype -> StudentIntake -> IO StudyPlan
generateInitialPlan config archetypeDetails intake = do
  -- Existing logic...
  finalBlocks <- scheduleWeeksInAllBlocks plannedBlocks finalIntake config
  
  -- NEW: Aggregate resources from all blocks
  let studentProfile = createStudentProfile archetypeDetails finalIntake
  planResources <- aggregatePlanResources finalBlocks studentProfile
  
  -- Create the final study plan
  planId <- nextRandom
  userId <- getUserIdFromRequest
  let planTitle = generateStudyPlanTitle archetypeDetails currentSeason
  
  return StudyPlan
    { study_plan_id = planId
    , user_id = userId
    , title = planTitle
    , blocks = finalBlocks
    , curated_resources = toJSON planResources  -- Structured instead of empty object
    }
```

## Service Interface Design

### **1. Resource Curation Service API**

```json
// POST /api/resources/curate-block
{
  "subjects": ["H01", "H02", "G"],
  "duration_weeks": 6,
  "season": "PrelimsSeason",
  "archetype": "The Working Professional",
  "confidence_levels": {
    "H01": "Weak",
    "H02": "Moderate", 
    "G": "Strong"
  },
  "budget_preference": "BudgetMedium",
  "learning_style": "Visual"
}

// Response
{
  "primary_books": [
    {
      "resource_id": "uuid-123",
      "title": "Ancient India by R.S. Sharma",
      "resource_type": "Book",
      "url": "https://amazon.com/...",
      "description": "Comprehensive coverage of ancient Indian history",
      "subjects": ["H01"],
      "difficulty_level": "Intermediate",
      "estimated_hours": 40,
      "priority": "Essential",
      "cost": {"Paid": 500}
    }
  ],
  "supplementary_materials": [...],
  "practice_resources": [...],
  "video_content": [...],
  "current_affairs_sources": [...],
  "revision_materials": [...],
  "expert_recommendations": [...]
}
```

### **2. Alternative Service Implementations**

**Option A: External ML Service**
```haskell
-- Call sophisticated ML-based resource curation
getResourcesViaML :: BlockDefinition -> StudentProfile -> IO BlockResources
```

**Option B: Rule-Based Internal Service**
```haskell
-- Use rule-based resource selection
getResourcesViaRules :: BlockDefinition -> StudentProfile -> IO BlockResources
```

**Option C: Hybrid Approach**
```haskell
-- Combine ML recommendations with rule-based fallbacks
getResourcesHybrid :: BlockDefinition -> StudentProfile -> IO BlockResources
```

## Benefits of This Design

### **1. Granular Management**
- Resources tied to specific blocks and subjects
- Context-aware resource suggestions
- Progressive resource discovery as students advance

### **2. Intelligent Aggregation**
- Plan-level resources provide high-level overview
- Timeline-based resource recommendations
- Budget planning and cost optimization

### **3. Service Flexibility**
- Pluggable resource curation services
- Can evolve from rule-based to ML-powered
- A/B testing different curation strategies

### **4. Student Experience**
- Resources appear when relevant (with each block)
- Clear understanding of resource costs upfront
- Alternative options for different budgets/preferences

### **5. Scalability**
- Block-level caching of resources
- Parallel resource curation for multiple blocks
- Easy to update resources for specific subjects/blocks

## Implementation Timeline

### **Phase 1: Data Structure Enhancement (Week 1)**
- Update Block and StudyPlan types
- Create Resource-related data types
- Implement basic placeholder service

### **Phase 2: Service Integration (Week 2)**
- Implement BlockResourceService interface
- Create rule-based resource curation logic
- Integrate with block creation process

### **Phase 3: Plan-Level Aggregation (Week 3)**
- Implement resource aggregation logic
- Create timeline and budget summary features
- Update plan generation to use aggregated resources

### **Phase 4: External Service Integration (Week 4)**
- Implement HTTP service calls for resource curation
- Add error handling and fallback strategies
- Performance optimization and caching

## Conclusion

This design provides a sophisticated, scalable approach to resource curation that:

1. **Maintains granularity** while providing plan-level summaries
2. **Integrates with external services** for intelligent curation
3. **Supports progressive enhancement** from simple rules to ML-powered recommendations
4. **Improves student experience** with contextual, timely resource suggestions
5. **Enables cost planning** and budget optimization

The block-level approach ensures resources are relevant and timely, while plan-level aggregation provides the strategic overview students need for planning and budgeting.

