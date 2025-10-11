# Test Case Specification: Priya (The Ambitious Achiever)

This document outlines the test inputs and expected outputs for the persona "Priya".

## Mock CMS Service Integration

This test specification uses the `MockCMSService` to provide consistent, predictable data for testing. The mock service ensures that:

- **Subject metadata** matches the test calculations exactly
- **Curated resources** are consistent across test runs
- **Test assertions** can be deterministic and reliable

The mock service provides the following data for this test:
- **Ethics**: 80 baseline hours, resources: ["Lexicon Ethics", "Case Studies", "PYKs (Ethics)"]
- **Economy**: 110 baseline hours, resources: ["Sriram Economy Notes", "NCERT Economy", "PYQs (Economy)"]

---

## 1. Test Input

This is the JSON payload representing Priya's submission from the student intake wizard. It will be passed to the `generate_initial_plan_from_wizard` method.

```json
{
  "subject_confidence": {
    "prelims_confidence": {
      "current_events": "Strong",
      "history_of_india": "Strong",
      "indian_world_geography": "Moderate",
      "polity_governance": "Strong",
      "economy_social_development": "Very Weak",
      "environment_ecology": "Moderate",
      "science_technology": "Moderate",
      "csat": "Strong"
    },
    "mains_gs1_confidence": {
      "essay": "Moderate",
      "indian_culture": "Moderate",
      "modern_history": "Strong",
      "world_history": "Moderate",
      "post_independence_india": "Strong",
      "indian_society": "Moderate",
      "indian_world_geography": "Moderate"
    },
    "mains_gs2_confidence": {
      "constitution": "Strong",
      "polity": "Strong",
      "governance": "Moderate",
      "social_justice": "Moderate",
      "international_relations": "Moderate"
    },
    "mains_gs3_confidence": {
      "economy": "Very Weak",
      "agriculture": "Moderate",
      "environment": "Moderate",
      "science_technology": "Moderate",
      "disaster_management": "Strong",
      "internal_security": "Strong"
    },
    "mains_gs4_optional_confidence": {
      "ethics_integrity_aptitude": "Very Weak",
      "optional_subject_paper1": "Strong",
      "optional_subject_paper2": "Strong"
    }
  },
  "study_strategy": {
    "study_focus_combo": "One GS + Optional",
    "weekly_study_hours": "55 hours",
    "time_distribution": "Equal time for all parts of syllabus",
    "study_approach": "Weak subjects first",
    "revision_strategy": "Regular revision",
    "test_frequency": "Weekly tests",
    "seasonal_windows": [],
    "catch_up_day_preference": "Weekends"
  }
}
```

---

## 2. Expected Output

This describes the precise `StudyPlan` object that the engine should generate for Priya. Fields with dynamic values are represented as placeholders (e.g., `"<uuid>"`), with annotations explaining how the value is derived.

```json
{
  "__comment": "A unique ID for the study plan.",
  "study_plan_id": "<uuid>",
  "user_id": "priya-123",
  "title": "Helios Study Plan",
  "blocks": [
    {
      "__comment": "First block, containing Priya's weakest subjects.",
      "block_id": "<uuid>",
      "title": "Block 1: Ethics, Economy",
      "subjects": ["Ethics", "Economy"],
      "duration_weeks": 5,
      "__duration_comment": "Calculation: (Ethics: 80hrs * 1.25) + (Economy: 110hrs * 1.25) = 237.5 total hrs. 237.5 / 55 hrs/week = 4.31 weeks. ceil(4.31) = 5. Clamped to 4-6 weeks, so result is 5.",
      "weekly_plan": {
        "week": 1,
        "daily_plans": [
          {
            "day": 1,
            "tasks": [
              {"task_id": "<uuid>", "title": "Study: New Topics", "duration_minutes": 282},
              {"task_id": "<uuid>", "title": "Revision", "duration_minutes": 94},
              {"task_id": "<uuid>", "title": "Practice (PYQs/MCQs/Answers)", "duration_minutes": 94}
            ]
          },
          {
            "day": 2,
            "tasks": [
              {"task_id": "<uuid>", "title": "Study: New Topics", "duration_minutes": 282},
              {"task_id": "<uuid>", "title": "Revision", "duration_minutes": 94},
              {"task_id": "<uuid>", "title": "Practice (PYQs/MCQs/Answers)", "duration_minutes": 94}
            ]
          },
          {
            "day": 3,
            "tasks": [
              {"task_id": "<uuid>", "title": "Study: New Topics", "duration_minutes": 282},
              {"task_id": "<uuid>", "title": "Revision", "duration_minutes": 94},
              {"task_id": "<uuid>", "title": "Practice (PYQs/MCQs/Answers)", "duration_minutes": 94}
            ]
          },
          {
            "day": 4,
            "tasks": [
              {"task_id": "<uuid>", "title": "Study: New Topics", "duration_minutes": 282},
              {"task_id": "<uuid>", "title": "Revision", "duration_minutes": 94},
              {"task_id": "<uuid>", "title": "Practice (PYQs/MCQs/Answers)", "duration_minutes": 94}
            ]
          },
          {
            "day": 5,
            "tasks": [
              {"task_id": "<uuid>", "title": "Study: New Topics", "duration_minutes": 282},
              {"task_id": "<uuid>", "title": "Revision", "duration_minutes": 94},
              {"task_id": "<uuid>", "title": "Practice (PYQs/MCQs/Answers)", "duration_minutes": 94}
            ]
          },
          {
            "day": 6,
            "tasks": [
              {"task_id": "<uuid>", "title": "Study: New Topics", "duration_minutes": 282},
              {"task_id": "<uuid>", "title": "Revision", "duration_minutes": 94},
              {"task_id": "<uuid>", "title": "Practice (PYQs/MCQs/Answers)", "duration_minutes": 94}
            ]
          },
          {
            "day": 7,
            "tasks": [
              {"task_id": "<uuid>", "title": "Study: New Topics", "duration_minutes": 282},
              {"task_id": "<uuid>", "title": "Revision", "duration_minutes": 94},
              {"task_id": "<uuid>", "title": "Practice (PYQs/MCQs/Answers)", "duration_minutes": 94}
            ]
          }
        ]
      }
    },
    {
      "__comment": "Subsequent blocks also have a detailed weekly plan. The structure is identical to the first block, with tasks and durations calculated for the block's subjects and duration.",
      "block_id": "<uuid>",
      "title": "Block 2: <Subject 3>, <Subject 4>",
      "subjects": ["<Subject 3>", "<Subject 4>"],
      "duration_weeks": "<calculated>",
      "weekly_plan": {
        "week": 1,
        "daily_plans": [
          { "day": 1, "tasks": [ /* ... 3 tasks ... */ ] },
          { "day": 2, "tasks": [ /* ... 3 tasks ... */ ] },
          { "day": 3, "tasks": [ /* ... 3 tasks ... */ ] },
          { "day": 4, "tasks": [ /* ... 3 tasks ... */ ] },
          { "day": 5, "tasks": [ /* ... 3 tasks ... */ ] },
          { "day": 6, "tasks": [ /* ... 3 tasks ... */ ] },
          { "day": 7, "tasks": [ /* ... 3 tasks ... */ ] }
        ]
      }
    }
  ],
  "curated_resources": {
    "__comment": "Resources are pulled from mock CMS service for the first block's subjects.",
    "Ethics": ["Lexicon Ethics", "Case Studies", "PYKs (Ethics)"],
    "Economy": ["Sriram Economy Notes", "NCERT Economy", "PYQs (Economy)"]
  }
}
```

---

## 3. Test Assertions

This section lists the specific assertions for the test case based on the expected output.

### Test Function: `test_generate_plan_for_priya`

**Objective**: Verify that the Helios Engine correctly generates a study plan for the "Ambitious Achiever" persona using the mock CMS service for consistent test data.

#### **Setup**
1.  Load the `StudentIntakeWizard` JSON data for Priya.
2.  Create a `MockCMSService` instance for consistent test data.
3.  Instantiate the `HeliosEngine` with the mock CMS service.
4.  Call `engine.generate_initial_plan_from_wizard` with the test data to get the `study_plan` result.

#### **Assertions**

Let `study_plan` be the `StudyPlan` object returned by the engine.

**1. Top-Level Plan Assertions**
```python
# The plan object should exist
assert study_plan is not None

# The title should be the default title
assert study_plan.title == "Helios Study Plan"

# The plan should have curated resources
assert study_plan.curated_resources is not None

# The resources should be for the first block's subjects
assert set(study_plan.curated_resources.keys()) == {"Ethics", "Economy"}

# The plan must contain at least one study block
assert len(study_plan.blocks) > 0
```

**2. First Block Assertions**

Let `first_block = study_plan.blocks[0]`
```python
# The subjects in the first block should be Priya's weakest subjects
assert set(first_block.subjects) == {"Ethics", "Economy"}

# The block duration should be calculated correctly
# Calculation: (Ethics: 80*1.25) + (Economy: 110*1.25) = 237.5 hrs
# 237.5 / 55 hrs/week = 4.31 -> ceil(4.31) = 5 weeks
assert first_block.duration_weeks == 5

# The first block must have a detailed weekly plan
assert first_block.weekly_plan is not None
```

**3. Weekly Plan Assertions**

Let `weekly_plan = first_block.weekly_plan`
```python
# The plan should be for the first week
assert weekly_plan.week == 1

# The weekly plan should contain exactly 7 days
assert len(weekly_plan.daily_plans) == 7
```

**4. Daily Plan and Task Assertions**
```python
# Check the details for each of the 7 daily plans
for i, daily_plan in enumerate(weekly_plan.daily_plans):
    # Check that the day number is correct (1-indexed)
    assert daily_plan.day == i + 1

    # Each day should have exactly 3 tasks (Study, Revision, Practice)
    assert len(daily_plan.tasks) == 3

    # Verify the details of each task
    study_task = daily_plan.tasks[0]
    revision_task = daily_plan.tasks[1]
    practice_task = daily_plan.tasks[2]

    assert study_task.title == "Study: New Topics"
    assert study_task.duration_minutes == 282

    assert revision_task.title == "Revision"
    assert revision_task.duration_minutes == 94

    assert practice_task.title == "Practice (PYQs/MCQs/Answers)"
    assert practice_task.duration_minutes == 94
```

**5. Curated Resources Assertions**
```python
# Verify that curated resources match the mock CMS service data
assert set(plan.curated_resources.keys()) == {"Ethics", "Economy"}

# Check Ethics resources from mock service
ethics_resources = plan.curated_resources["Ethics"]
assert "Lexicon Ethics" in ethics_resources
assert "Case Studies" in ethics_resources
assert "PYKs (Ethics)" in ethics_resources
assert len(ethics_resources) == 3

# Check Economy resources from mock service
economy_resources = plan.curated_resources["Economy"]
assert "Sriram Economy Notes" in economy_resources
assert "NCERT Economy" in economy_resources
assert "PYQs (Economy)" in economy_resources
assert len(economy_resources) == 3
```