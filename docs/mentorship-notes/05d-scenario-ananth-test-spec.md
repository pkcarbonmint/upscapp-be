# Test Case Specification: Ananth (The Working Professional)

This document outlines the test inputs and expected outputs for the persona "Ananth".

## Mock CMS Service Integration

This test specification uses the `MockCMSService` to provide consistent, predictable data for testing. The mock service ensures that:

- **Subject metadata** matches the test calculations exactly
- **Curated resources** are consistent across test runs
- **Test assertions** can be deterministic and reliable

The mock service provides the following data for this test:
- **History**: 120 baseline hours, resources: ["Tamil Nadu History", "Spectrum", "PYQs (History)"]

---

## 1. Test Input

This is the JSON payload representing Ananth's submission from the student intake wizard.

```json
{
  "subject_confidence": {
    "prelims_confidence": {
      "current_events": "Moderate",
      "history_of_india": "Strong",
      "indian_world_geography": "Moderate",
      "polity_governance": "Moderate",
      "economy_social_development": "Average",
      "environment_ecology": "Average",
      "science_technology": "Average",
      "csat": "Strong"
    },
    "mains_gs1_confidence": {
      "essay": "Average",
      "indian_culture": "Average",
      "modern_history": "Strong",
      "world_history": "Moderate",
      "post_independence_india": "Average",
      "indian_society": "Average",
      "indian_world_geography": "Moderate"
    },
    "mains_gs2_confidence": {
      "constitution": "Moderate",
      "polity": "Moderate",
      "governance": "Average",
      "social_justice": "Average",
      "international_relations": "Average"
    },
    "mains_gs3_confidence": {
      "economy": "Average",
      "agriculture": "Average",
      "environment": "Average",
      "science_technology": "Average",
      "disaster_management": "Moderate",
      "internal_security": "Moderate"
    },
    "mains_gs4_optional_confidence": {
      "ethics_integrity_aptitude": "Average",
      "optional_subject_paper1": "Moderate",
      "optional_subject_paper2": "Moderate"
    }
  },
  "study_strategy": {
    "study_focus_combo": "One GS at a time",
    "weekly_study_hours": "22 hours",
    "time_distribution": "Equal time for all parts of syllabus",
    "study_approach": "Strong subjects first",
    "revision_strategy": "Regular revision",
    "test_frequency": "Weekly tests",
    "seasonal_windows": [],
    "catch_up_day_preference": "Weekends"
  }
}
```

---

## 2. Expected Output

This describes the precise `StudyPlan` object that the engine should generate for Ananth.

```json
{
  "__comment": "A unique ID for the study plan.",
  "study_plan_id": "<uuid>",
  "user_id": "ananth-456",
  "title": "Helios Study Plan",
  "blocks": [
    {
      "__comment": "First block, containing Ananth's strongest subject to build momentum.",
      "block_id": "<uuid>",
      "title": "Block 1: History",
      "subjects": ["History"],
      "duration_weeks": 6,
      "__duration_comment": "Calculation: (History: 120hrs, no adjustment for 'Strong') = 120 total hrs. 120 / 22 hrs/week = 5.45 weeks. ceil(5.45) = 6. Clamped to 4-6 weeks, so result is 6.",
      "weekly_plan": {
        "week": 1,
        "daily_plans": [
          {
            "day": 1,
            "tasks": [
              {"task_id": "<uuid>", "title": "Study: New Topics", "duration_minutes": 113},
              {"task_id": "<uuid>", "title": "Revision", "duration_minutes": 37},
              {"task_id": "<uuid>", "title": "Practice (PYQs/MCQs/Answers)", "duration_minutes": 37}
            ]
          },
          {
            "day": 2,
            "tasks": [
              {"task_id": "<uuid>", "title": "Study: New Topics", "duration_minutes": 113},
              {"task_id": "<uuid>", "title": "Revision", "duration_minutes": 37},
              {"task_id": "<uuid>", "title": "Practice (PYQs/MCQs/Answers)", "duration_minutes": 37}
            ]
          },
          {
            "day": 3,
            "tasks": [
              {"task_id": "<uuid>", "title": "Study: New Topics", "duration_minutes": 113},
              {"task_id": "<uuid>", "title": "Revision", "duration_minutes": 37},
              {"task_id": "<uuid>", "title": "Practice (PYQs/MCQs/Answers)", "duration_minutes": 37}
            ]
          },
          {
            "day": 4,
            "tasks": [
              {"task_id": "<uuid>", "title": "Study: New Topics", "duration_minutes": 113},
              {"task_id": "<uuid>", "title": "Revision", "duration_minutes": 37},
              {"task_id": "<uuid>", "title": "Practice (PYQs/MCQs/Answers)", "duration_minutes": 37}
            ]
          },
          {
            "day": 5,
            "tasks": [
              {"task_id": "<uuid>", "title": "Study: New Topics", "duration_minutes": 113},
              {"task_id": "<uuid>", "title": "Revision", "duration_minutes": 37},
              {"task_id": "<uuid>", "title": "Practice (PYQs/MCQs/Answers)", "duration_minutes": 37}
            ]
          },
          {
            "day": 6,
            "tasks": [
              {"task_id": "<uuid>", "title": "Study: New Topics", "duration_minutes": 113},
              {"task_id": "<uuid>", "title": "Revision", "duration_minutes": 37},
              {"task_id": "<uuid>", "title": "Practice (PYQs/MCQs/Answers)", "duration_minutes": 37}
            ]
          },
          {
            "day": 7,
            "tasks": [
              {"task_id": "<uuid>", "title": "Study: New Topics", "duration_minutes": 113},
              {"task_id": "<uuid>", "title": "Revision", "duration_minutes": 37},
              {"task_id": "<uuid>", "title": "Practice (PYQs/MCQs/Answers)", "duration_minutes": 37}
            ]
          }
        ]
      }
    },
    {
      "__comment": "Subsequent blocks also have a detailed weekly plan. The structure is identical to the first block.",
      "block_id": "<uuid>",
      "title": "Block 2: <Subject 2>",
      "subjects": ["<Subject 2>"],
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
    "__comment": "Resources are pulled from mock CMS service for the first block's subject.",
    "History": ["Tamil Nadu History", "Spectrum", "PYQs (History)"]
  }
}
```

---

## 3. Test Assertions

This section lists the specific assertions for the test case based on the expected output.

### Test Function: `test_generate_plan_for_ananth`

**Objective**: Verify that the Helios Engine correctly generates a study plan for the "Working Professional" persona using the mock CMS service for consistent test data.

#### **Setup**
1.  Load the `StudentIntakeWizard` JSON data for Ananth.
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

# The plan should have curated resources for all subjects in the plan
assert study_plan.curated_resources is not None
assert "History" in study_plan.curated_resources
assert len(study_plan.curated_resources) == len(study_plan.blocks)

# The plan must contain at least one study block
assert len(study_plan.blocks) > 0
```

**2. Block-by-Block Assertions**
```python
# Check the first block
first_block = study_plan.blocks[0]
assert set(first_block.subjects) == {"History"}
assert first_block.duration_weeks == 6
assert first_block.weekly_plan is not None

# Check that subsequent blocks also have a weekly plan
if len(study_plan.blocks) > 1:
    for i, block in enumerate(study_plan.blocks[1:]):
        assert block.weekly_plan is not None, f"Block {i+2} should have a weekly plan"
```

**3. Weekly Plan Assertions (First Block)**

Let `weekly_plan = study_plan.blocks[0].weekly_plan`
```python
# The plan should be for the first week
assert weekly_plan.week == 1

# The weekly plan should contain exactly 7 days
assert len(weekly_plan.daily_plans) == 7
```

**4. Daily Plan and Task Assertions (First Block)**
```python
# Check the details for each of the 7 daily plans in the first block
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
    assert study_task.duration_minutes == 113

    assert revision_task.title == "Revision"
    assert revision_task.duration_minutes == 37

    assert practice_task.title == "Practice (PYQs/MCQs/Answers)"
    assert practice_task.duration_minutes == 37
```

**5. Curated Resources Assertions**
```python
# Verify that curated resources match the mock CMS service data
assert "History" in plan.curated_resources

# Check History resources from mock service
history_resources = plan.curated_resources["History"]
assert "Tamil Nadu History" in history_resources
assert "Spectrum" in history_resources
assert "PYQs (History)" in history_resources
assert len(history_resources) == 3
```
