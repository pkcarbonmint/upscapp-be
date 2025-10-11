# Resource Database Integration Guide

## Overview

This document outlines how the new resource database integrates with existing study plan generation and block creation systems.

## Files Created

1. **`resources/H01_resources.json`** - History-Ancient subject resources
2. **`resources/P01_resources.json`** - Indian-Polity subject resources 
3. **`resources/resource_index.json`** - Master index for quick lookups
4. **`ResourceService.ts`** - Updated service layer for modular resource management

## Integration Points

### 1. Block Resource Assignment

**Current Location**: `study-planner/helios-ts/src/engine/OneWeekPlan.ts`

**Integration Point**: In `generateStudyTasks` function, link topics to resources:

```typescript
// Current code (around line 260):
return createStudyTask(
  `Study: ${topic.topicName}`,
  topicDurationMinutes,
  topic.resourceLink, // Currently undefined
  taskResources // Currently empty array
);

// Enhanced with ResourceService:
const topicResources = await ResourceService.getResourcesForTopic(topic.topicCode);
const taskResourcesForTopic = topicResources.study; // Get study resources for this topic

return createStudyTask(
  `Study: ${topic.topicName}`,
  topicDurationMinutes,
  undefined, // Keep resourceLink for manual overrides
  taskResourcesForTopic
);
```

### 2. Block-Level Resource Curation

**Current Location**: `study-planner/helios-ts/src/engine/cycle-utils.ts`

**Integration Point**: In `createBlocksForSubjects` function:

```typescript
// Add after line 55 (before return statement):
const blockResources = await ResourceService.suggestResourcesForBlock(
  [subject.subjectCode],
  allocatedHours,
  'study', // or determine based on cycle_type
  'budget' // or get from student profile
);

return {
  block_id: `${blockPrefix}-${subject.subjectCode}`,
  block_title: `${blockPrefix} - ${subject.subjectName}`,
  // ... existing fields ...
  block_resources: blockResources // Populate with actual resources
};
```

### 3. Study Plan Resource Aggregation

**Current Location**: `study-planner/helios-ts/src/engine/NewEngine-generate-plan.ts`

**Integration Point**: Replace placeholder resources around line 234:

```typescript
// Current placeholder:
curated_resources: {
  essential_resources: [],
  recommended_timeline: {
    immediate_needs: [],
    mid_term_needs: [],
    long_term_needs: []
  }
}

// Enhanced with actual resource aggregation:
const allBlocks = finalCycles.flatMap(cycle => cycle.blocks);
const essentialResources = new Set<string>();
const timelineResources = {
  immediate_needs: [],
  mid_term_needs: [],
  long_term_needs: []
};

// Aggregate resources from all blocks
for (const block of allBlocks) {
  const blockResourceIds = [
    ...block.block_resources.primary_books.map(r => r.resource_id),
    ...block.block_resources.expert_recommendations.map(r => r.resource_id)
  ];
  
  blockResourceIds.forEach(id => essentialResources.add(id));
}

curated_resources: {
  essential_resources: Array.from(essentialResources).map(id => 
    await ResourceService.searchResources({ resourceId: id })
  ).flat(),
  recommended_timeline: timelineResources
}
```

## Resource Database Schema

### Subject Resource File Structure
```json
{
  "subject_info": {
    "code": "H01",
    "name": "History-Ancient",
    "category": "Macro",
    "exam_focus": "BothExams",
    "has_current_affairs": false,
    "baseline_hours": 25,
    "resource_count": 12
  },
  "topic_resources": {
    "H01/02": {
      "topic_name": "Harappan civilisation",
      "priority": "Essential",
      "resources": {
        "study": ["r001", "r004"],
        "revision": ["r001", "r002"],
        "practice": ["r003"],
        "expert": ["r002"]
      },
      "estimated_hours": 12
    }
  },
  "resources": {
    "r001": {
      "resource_id": "r001",
      "resource_title": "NCERT Class 12 - Themes in Indian History-I",
      "resource_type": "Book",
      "difficulty_level": "Beginner",
      "estimated_hours": 20,
      "resource_priority": "Essential",
      "resource_cost": {"type": "Free"},
      "learning_outcomes": ["Understanding of prehistoric cultures"],
      "tags": ["ncert", "foundation"]
    }
  }
}
```

### Quick Lookup System

1. **Subject-Level Lookup**: `H01_resources.json` → Get all resources for History-Ancient
2. **Topic-Level Lookup**: `resource_index.json` → Find which file contains `H01/02` 
3. **Resource-Level Lookup**: `resource_index.json` → Find which file contains `r001`
4. **Modular Structure**: Each subject maintains its own resource file for easier maintenance

## Usage Examples

### Getting Resources for a Historical Topic
```typescript
const harappanResources = await ResourceService.getResourcesForTopic("H01/02");
// Returns: { study: [...], revision: [...], practice: [...], expert: [...] }
```

### Finding Budget-Friendly Resources
```typescript
const freeResources = await ResourceService.getResourcesByBudgetTier('free');
const budgetQuery = await ResourceService.searchResources({
  subjects: ['H01'],
  cost: 'budget',
  estimatedHoursMax: 30
});
```

### Block Resource Assignment
```typescript
const blockResources = await ResourceService.suggestResourcesForBlock(
  ['H01', 'P01'], // History and Polity
  4, // 4 weeks duration
  'study', // Mainly for study tasks
  'budget' // Budget-conscious selection
);
```

## Data Population Strategy

### Phase 1: Foundation Data
- Populate essential NCERT textbooks and reference books
- Add free online resources (YouTube channels, government websites)
- Include major publishers' offerings

### Phase 2: Topic-Specific Resources
- Map each topic from `upsc_subjects.json` to specific resources
- Add topic-specific video lectures and practice tests
- Include current affairs sources for relevant subjects

### Phase 3: Advanced Features
- Price tracking and budget optimization
- Resource effectiveness scores
- Student feedback integration
- A/B testing different resource combinations

## Benefits

1. **Centralized Management**: All resources in one database
2. **Flexible Querying**: Multiple ways to find relevant resources
3. **Cost Optimization**: Budget-aware resource suggestions
4. **Scalable**: Easy to add new resources and subjects
5. **Type-Safe**: Full TypeScript integration with existing models

## Next Steps

1. **Approval**: Review and approve the proposed design
2. **Database Population**: Start adding real UPSC resources
3. **Integration**: Modify engine code to use ResourceService
4. **Testing**: Test resource assignment with sample study plans
5. **UI Integration**: Display resource suggestions in the user interface

## Questions for Review

1. Should we include video chapter timestamps for topic-specific resources?
2. How granular should topic-resource mapping be? (to subtopic level?)
3. Should resources have quality scores or just priority levels?
4. Do we need resource prerequisites (requires completion of resource X)?
5. How should we handle resource availability (seasonal courses, limited enrollments)?
