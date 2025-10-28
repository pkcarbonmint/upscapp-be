# The Helios Engine: Automated Planning & Rebalancing

  The Helios Engine is the intelligent core of the mentorship
  platform. Its mission is to provide a clear, structured, and
  responsive path to success by generating a personalized study plan
  at the start of a student's journey and dynamically adapting it
  based on their real-world progress.

  The engine operates in two distinct phases: Initial Plan Generation and Dynamic Rebalancing.

## Timeline-Based Study Phases

The Helios Engine implements a sophisticated timeline-based approach that adapts study focus based on exam preparation phases:

### Phase 1: Mains-Heavy Period (June–January)
- **Focus Distribution**: ~70% Mains preparation, 30% Prelims (if planned and needed)
- **Practice Type**: Mains Practice - 10Q/20Q answers + PYQs
- **Subject Targeting**: Some subjects like Polity overlap - in such subjects we target mains areas and separate mains only areas using the DNA
- **Current Affairs**: To be included along with the respective topics (e.g., Polity, Judiciary – CA Judicial Overreach)

### Phase 2: Prelims-Only Period (February–May)
- **Focus Distribution**: 100% Prelims preparation
- **Exclusions**: No Optional subjects, no Governance, no Essay/Ethics
- **Practice Type**: Prelims Practice - MCQs + PYQs

### Subject Hour Allocation (Rough Guide)
For subjects like Polity (150 hours baseline):
- **Mains-only areas**: 80 hours
- **Prelims-only areas**: 50 hours
- **Current Affairs**: 20 hours

**Conservative Modifications**: The engine is extremely conservative about modifications and extremely thorough in implementation.

## Phase 1: Initial Plan Generation

  This phase runs once for each new student upon successful onboarding.

  A. Inputs:
  The engine's primary input for plan generation is a single, structured `Persona` object, submitted by the frontend wizard. This object contains the complete, final set of user-approved parameters, including any overrides to the initial defaults. The canonical data structure is defined in `src/helios/persona.py`.

  B. Helper Service for Frontend Wizard:
  To support the persona-driven workflow, the engine provides a helper service (e.g., an API endpoint `GET /api/v1/persona-defaults`) for the intake wizard.

   * **Request:** The wizard sends the user's chosen `archetype` (e.g., "Working Professional") and `background` (e.g., "Engineering").
   * **Logic:** The backend combines the base template for the archetype with adjustments for the background.
   * **Response:** It returns a JSON object containing the suggested default parameters (e.g., `weekly_study_hours`, `study_pacing`, and the `confidence_profile`).

  The frontend then uses these defaults to populate the review step for the user.

  C. Core Logic:
  The engine processes the inputs in three sequential steps:

   1. The Subject Sequencer: First, it determines the high-level order
      of all subjects. It sorts the subjects based on the student's
      Study Pacing preference ("Weak subjects first" or "Strong
      subjects first") and their self-assessed ratings.

   2. The Block Planner: Next, it groups the ordered subjects into
      multi-week "Study Blocks". It uses the Subject Approach
      preference to decide how many subjects are in a block and
      consults a central Subject Metadata Table to determine the
      standard duration (in weeks) for each block.

   3. The Weekly Scheduler: Finally, it creates a detailed, day-by-day
      schedule for the first study block. It allocates the student's
      Weekly Study Hours into tasks for new topic study, revision, and
      practice based on a predefined 60/20/20 percentage split.

  C. Outputs:
   * A Complete High-Level Study Timeline showing all subjects across all blocks (typically 6-12 months).
   * Detailed Weekly Plans for ALL blocks, with the first block presented as a **draft** for review.
   * A Curated Resource List for all subjects in the complete study plan.

  **D. Manual Review and Override (New Step)**
  Before the plan is finalized, it enters a "Draft" state to allow for manual review.
   * **For Mentorship Programs**: The generated plan is presented to the **mentor** as an editable draft. The mentor can fine-tune the weekly schedule, adjust task durations, add or remove specific tasks, and re-sequence topics within the first block.
   * **For Study Planner Product**: The student has direct access to this editable draft to make their own adjustments.
   * Once the review is complete, the mentor or student "publishes" the plan, making it the active schedule.

### Initial Plan Generation Logic

* Inputs (from Student Intake Form) - The engine needs three sets of inputs:
  * History & Status Sheet Data (see mockup)
  * Strategy Sheet Data (see mockup)
  * Mentor/Program Context (if enrolled in mentorship)

* Core Logic (Three Sequential Steps)

**IMPORTANT: Complete Plan Generation**
The engine MUST generate a complete study plan covering ALL subjects from the student's confidence assessment. This includes:
- All Prelims subjects (Current Events, History, Geography, Polity, Economy, Environment, Science, CSAT)
- All Mains GS1 subjects (Essay, Indian Culture, Modern History, World History, Post-Independence India, Indian Society, Geography)
- All Mains GS2 subjects (Constitution, Polity, Governance, Social Justice, International Relations)
- All Mains GS3 subjects (Economy, Agriculture, Environment, Science, Disaster Management, Internal Security)
- All Mains GS4 subjects (Ethics, Integrity, Aptitude)
- All Optional subjects (Paper 1 and Paper 2)

The plan should span the entire preparation timeline (typically 6-12 months) with all subjects distributed across multiple blocks.

1. Subject Sequencer
   * Orders ALL subjects according to:
      * Student's declared study approach (e.g., weak subjects first).
      * Self-assessment levels (from History/Status sheet).
   * Processes ALL subjects from the confidence assessment (Prelims, Mains GS1-4, Optional).
   * Macro subjects (Polity, Economy, History, Ethics, Essay, etc.) are prioritized before micro subjects (Disaster Management, Security, IR, etc.), unless student chooses otherwise.
   * **Timeline Phase Integration**: Respects timeline phases (June-Jan Mains-heavy, Feb-May Prelims-only) when sequencing subjects.
   * Ensures no subjects are left unplanned in the final study timeline.
2. Block Planner
   * Groups ALL subjects into multi-week Blocks (each ≈ 4–6 weeks).
   * Number of subjects per block = chosen Study Focus Combo.
   * Uses subject metadata table (baseline hours, recommended sequence).
   * Processes ALL subjects from the student's confidence assessment (Prelims, Mains GS1-4, Optional).
   * Adjusts hours per subject:
     * Very Strong → 25% trimmed
     * Very Weak → 25% increased
   * Calculates total timeline duration based on all subjects and weekly study hours.
   * If total timeline is shorter (e.g., 6 months instead of 9), block durations are proportionally trimmed.
   * Ensures complete coverage of the UPSC syllabus across all blocks.
3. Weekly Scheduler
   * Breaks ALL Blocks into detailed weekly plans.
   * Allocates hours based on Weekly Study Hours input and ratio preference.
   * **Daily Hour Limits**: Enforces realistic daily study limits to prevent burnout:
     * Monday-Friday: Maximum 8 hours/day (regular study days)
     * Saturday: Maximum 6 hours/day (catch-up day)
     * Sunday: Maximum 7 hours/day (test + review + planning day)
   * **Day-Specific Task Structure**:
     * **Monday-Friday**: Study (new content), Revision (past content), Practice (PYQs/MCQs/answer writing)
     * **Saturday**: Pure catch-up day - pending tasks, light revision, practice catch-up, buffer time
     * **Sunday**: Test + Review + Planning day - weekly test, comprehensive review, next week planning
   * **Practice Type Integration**: 
     * **Mains-Heavy Phase**: Practice tasks include 10Q/20Q answers + PYQs
     * **Prelims-Only Phase**: Practice tasks include MCQs + PYQs
   * Practice and Test tasks will have predefined links to tests at the topic level.
   * Standard ratio applied: 50% study, 20% revision, 15% practice, 15% test, with scope to adjust by mentor.
   * Generates complete weekly schedules for the entire study timeline, not just the first block.
   * **Ensures weekly total matches student's weekly study hours** (e.g., 55 hours/week for full-time students).

* Outputs
   1. Complete High-Level Study Timeline
      * A comprehensive roadmap showing ALL subjects across ALL blocks (typically 6-12 months).
      * Covers every subject from the student's confidence assessment (Prelims, Mains GS1-4, Optional).
      * Highlights seasonal windows (Prelims, Mains) and exam preparation phases.
      * Shows the complete journey from start to exam readiness.
   2. Detailed Weekly Plans (ALL Blocks)
      * Week-by-week tasks for EVERY block in the complete timeline.
      * Each block includes: reading targets (linked to specific topics), practice sets, revision slots, test schedule.
      * Each task is an object with properties like `title`, `duration`, and an optional `details` property which can store a link for practice/test tasks.
      * **Practice Task Integration**: Both Mains practice (10Q/20Q answers + PYQs) and Prelims practice (MCQs + PYQs) are included as part of tasks.
      * Linked to accountability sheet (student must tick off completed tasks).
      * First block is presented as "draft" for mentor/student review and approval.
   3. Complete Curated Resource List
      * Suggested materials (NCERTs, standard books, mentor notes, PYQ sets) tied to ALL subjects in the complete study plan.
      * Resources are organized by subject and block for easy reference throughout the preparation journey.

## Phase 2: Dynamic Monthly Rebalancing

  This phase is triggered at the end of each month to ensure the plan remains relevant.

  A. Trigger and Inputs:
   * Trigger: The monthly review session for mentorship students. Triggered by user action at the review session.
   * Inputs: The student's performance data from the past month (Plan
     Adherence Rate, Completed vs. Pending Tasks, test scores) and
     qualitative feedback from the mentor (Ahead of schedule, On
     track, Behind schedule).

  B. Rebalancing Rules:
  The engine adjusts the plan based on the following logic:

   1. Adjust Block Duration: If a student's adherence was low or the mentor flags them as "Behind schedule," the engine automatically extends the current study block by one
      week, pushing back all future dates.

   2. Adjust pace - If the student is not able to put in the time he
      had projected, it lowers the time allocated for study, based on
      actual data.

   3. Incorporate Pending Tasks: All incomplete tasks from the previous month are automatically scheduled into the Saturday "Catch-up Day" slots of the next month's plan.

   4. Allow Manual Re-Sequencing: The engine allows the mentor to manually re-order the sequence of upcoming study blocks, providing flexibility to adapt to the student's
      evolving needs.

  C. Outputs:
   * An Updated Study Plan (v2.0, v3.0, etc.).
   * A Change Summary for the student and mentor, highlighting the key adjustments made.

### Rebalancing Logic

* Trigger and Inputs
  * Trigger: End-of-month review, usually tied to a mentor–student review session.
  * Inputs:
    * Plan Adherence Rate (completed vs. pending tasks).
    * Test scores (prelims, mains, optional) – subject-wise and accuracy-based.
    * Student-reported actual hours studied (vs. projected).
    * Mentor feedback: “Ahead of schedule / On track / Behind schedule.”
    * Pending tasks that were not completed.

* Rebalancing Rules
The system uses layered decision logic:
1. Extend Block Duration (Push Schedule)
  * If a student is behind, extend the current block by +1 week.
  * All future blocks shift forward by the same margin.
  * This option is suitable when deadlines are flexible (no immediate exam/test date).
2. Add Extra Hours (Catch-up Option)
  * If student can afford more time:
    * Add +1 hour/day (or agreed margin) across the next 6–7 days.
    * Pending topics are distributed into this extra time.
  * Example: Student had projected 6 hrs/day but can now stretch to 7 hrs/day.
3. Trim Low-Priority Topics (Smart Compression)
  * If student cannot add hours or cannot extend schedule (e.g., exam date fixed), the system trims non-core/low-weightage topics.
  * Each subject has a priority ladder:
    * Core topics (must-read).
    * Medium-weightage topics.
    * Peripheral/low-weightage topics.
  * Example: Polity baseline = 100 hrs → if compressed, system auto-trims 10–15 hrs by reducing low-priority readings.
4. Pending Task Redistribution
  * All leftover tasks from previous month are moved into Saturday "Catch-up Day" slots.
  * If tasks exceed available catch-up slots, they spill over into the next week's daily schedule (low-priority topics are displaced first).
  * **Daily hour limits are respected** - no day can exceed the maximum hours (8h Mon-Fri, 6h Sat, 7h Sun).
5. Manual Mentor Overrides (Expanded)
  * The engine provides a powerful interface for mentors to manually adjust the rebalanced plan beyond the automated rules. Mentors can:
    * **Edit the Upcoming Block in Detail**: Directly modify the weekly and daily tasks for the next block. This includes changing task descriptions, adjusting time allocations, and adding custom tasks (e.g., "Watch specific lecture video").
    * **Adjust Block Duration**: Manually change a block's duration (e.g., from 4 to 5 weeks), which automatically recalculates and shifts the timeline for all subsequent blocks.
    * **Re-order Topics within a Block**: Change the sequence of topics inside the upcoming block.
    * **Drag-and-Drop Scheduling**: Visually move tasks between days or weeks to better suit the student's needs.
    * **Approve or Reject Automated Changes**: Review the engine's proposed changes (like extending a block) and either accept them or override them with a manual adjustment.
    * Mark specific topics as “Drop” (skip).

* Outputs
  * Updated Study Plan (v2.0, v3.0, etc.) reflecting changes.
  * Change Summary Report for student + mentor:
    * What blocks were extended/trimmed.
    * Which tasks shifted or dropped.
    * Adjusted daily/weekly hours.
  * Accountability Update: Student’s daily accountability sheet is regenerated with new tasks.

* Example Scenarios
1.	Student misses 20% of Polity tasks in August:
  * Option A: Add 1 hr/day in September to catch up.
  * Option B: Extend Polity block by 1 extra week.
  * Option C: Trim 15 hrs of low-priority polity subtopics.
2.	Student already studying 10 hrs/day (max capacity):
  * Extra hours option is not feasible.
  * Schedule cannot be extended (exam fixed in May).
  * Engine trims low-weightage topics + redistributes pending tasks to catch-up days.
3. Mentor feedback = “Ahead of schedule”:
  * Engine pulls future topics forward.
  * Next block begins earlier, creating buffer weeks before exam.


## Core Dependency: The CMS Service

  The Helios Engine is fully data-driven and relies on the CMS Service passed to it during initialization. This service is the single source of truth for all planning data, including:
  * The list of available subjects.
  * The metadata for each subject (e.g., baseline completion time, curated resources).
  * The list of topics for each subject.
  This dependency allows the engine's planning logic to remain separate from the data it operates on.

## Implementation Status

**Current Gap**: The engine currently generates plans for only the first few prioritized subjects (typically 2-4 subjects) instead of creating a complete multi-block study plan covering all subjects from the student's confidence assessment.

**Required Enhancement**: The engine must be updated to:
1. Process ALL subjects from the student intake data
2. Generate a complete timeline spanning 6-12 months
3. Create detailed weekly plans for ALL blocks
4. Ensure comprehensive coverage of the entire UPSC syllabus
5. **Implement Timeline-Based Phases**: 
   - June-January: Mains-heavy phase (70% Mains, 30% Prelims)
   - February-May: Prelims-only phase (100% Prelims)
6. **Practice Type Integration**: 
   - Mains practice: 10Q/20Q answers + PYQs
   - Prelims practice: MCQs + PYQs
7. **Current Affairs Integration**: Include current affairs with respective topics (e.g., Judiciary → CA Judicial Overreach)

This enhancement is critical for providing students with a complete roadmap for their preparation journey.

## Daily Hour Limits and Weekend Structure

**IMPORTANT: Realistic Daily Limits**
To prevent student burnout and ensure sustainable study habits, the engine enforces strict daily hour limits:

### **Daily Hour Caps:**
- **Monday-Friday**: Maximum 8 hours/day (regular study days)
- **Saturday**: Maximum 6 hours/day (catch-up day)
- **Sunday**: Maximum 7 hours/day (test + review + planning day)

### **Weekend Structure:**
- **Saturday**: Pure catch-up day
  - Complete pending tasks from the week
  - Light revision of week's topics
  - Practice catch-up for missed topics
  - Buffer time for unexpected delays
  - No new learning or planning

- **Sunday**: Test + Review + Planning day
  - Weekly Test (3-4 hours) - focused assessment
  - Weekly Review (2-3 hours) - comprehensive review
  - Weekly Planning (1 hour) - prep for next week
  - Rest/recovery time (1 hour)

### **Weekly Total Validation:**
- Engine ensures weekly total matches student's weekly study hours
- Example: 55 hours/week = 8h×5 + 6h + 7h = 53 hours (within limit)
- Any excess hours are redistributed across the week while respecting daily caps


