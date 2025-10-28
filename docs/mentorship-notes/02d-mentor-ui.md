# Mentor UI

- [User Flow](#user-flow)
- [Dashboard](#1-dashboard)
- [Students](#2-students)
- [Student Detail](#3-student-detail)
- [Tests](#4-tests)
- [Sessions](#5-sessions)
- [Settings](#6-settings)
- [Future Enhancements](#future-enhancements-v2)

## Design principles
- Multi-student efficiency: batch-friendly actions; fast filters/search
- Task-centric: everything links back to block → week → task in the student plan
- Telegram-first nudges: actions available in-app; notifications via Telegram
- Low ceremony: minimal steps to create tests and attach to student tasks

## User Flow

- First-time setup
  1. Connect Telegram
  2. Publish weekly availability (slots + buffer slots)
  3. Receive mentee assignments (via supervisor)

- Daily loop
  1. Dashboard → Today’s sessions; join/on-site
  2. Review pending evaluations → grade and publish feedback
  3. Respond to reschedule requests (via Telegram link)
  4. Add corrective tasks to at-risk students’ plans

- Weekly loop
  1. Monday prompt → Create Weekly Test (due by Wednesday)
  2. System schedules approved weekly test for end of week → Tasks auto-attached
  3. Conduct weekly sessions → record highlights; inject tasks

- Block end
  1. Two weeks prior → create End-of-Block Test → goes to QA
  2. After approval → auto-scheduled in final week → tasks created across selected students

## Dashboard

Purpose: a command center for today’s sessions, pending work, and at-risk students.

Today
- Sessions: list with time, student, link/address; quick “Open agenda”
- Pending evaluations: submissions awaiting grading (count + queue link)
- Reschedule requests: quick review → open Telegram to coordinate

This week
- Test creation task: “Create weekly test for GS-II topics” (due Wed)
- Upcoming end-of-block test tasks (if any)
- At-risk students: flags (missed sessions/tests, low adherence)

Quick actions
- Create test → opens test creation flow
- Assign task → open student/task form
- Message student (Telegram link)

## Students

Purpose: manage multiple students efficiently.

List & filters
- Search by name, subject/optional, program, city/online
- Filters: flagged, missing check-ins, pending test evaluation, upcoming session

Student card
- Name, program, optional
- This week adherence %, last check-in, next session time
- Flags (if any)
- Actions: Open, Message, Assign task

Bulk actions
- Message selected (Telegram group DM or per-student)
- Assign common task to selected (e.g., revision block)

## Student Detail

Purpose: a focused lens per student with quick actions.

Header
- Student profile summary; plan strategy; optional
- Next session info + Telegram link to reschedule

Overview
- This week snapshot: adherence %, check-in count, hours (if available)
- Recent test(s): last score/status; link to evaluate if pending
- Flags and notes

Planner lens (read/write)
- Current week tasks (grouped by Study / Revision / Practice / Tests)
- Actions per task: View, Mark done (if student submitted), Add mentor note
- **"Edit Plan" Mode**: 
  - An "Edit Plan" button will be available when a plan is in a "Draft" state (either after initial generation or during rebalancing).
  - **Editing Capabilities**: In this mode, the planner becomes fully interactive:
      - **Block-Level Adjustments**: At the top of the block view, the mentor can change the block's total duration (e.g., from 4 weeks to 5 weeks). This will update the high-level timeline.
      - **Weekly Hour Tally**: As the mentor edits tasks in a week, a running total of `Planned Hours` for that week is displayed, allowing them to target a specific workload (e.g., 40 hours for an intensive week).
      - **Drag-and-Drop**: Tasks can be moved between days.
      - **Inline Editing**: Task titles, expected hours, and descriptions can be edited directly on the card.
      - **Add/Delete**: Mentors can add new tasks to any day or delete existing ones.
- **"Publish Changes" Action**: 
  - After editing, the mentor clicks "Publish Changes". This finalizes the plan for the next block and notifies the student.
- **Handling Subscription Extensions**:
  - If edits extend the plan beyond the student's paid subscription period, a warning appears: *“⚠️ These changes will extend the plan beyond the current subscription end date of [Date]. An upgrade will be required.”*
  - When publishing, a confirmation dialog appears, requiring the mentor to acknowledge that the student will be prompted to purchase the additional duration.

- Add Task
  - Category (Study/Revision/Practice/Test)
  - Title, subject, expected hours (optional)
  - Due (defaults to current Sunday)
  - Save → creates a task in student’s plan (attached to current week)

Tests tab
- Upcoming tests for student; past tests with scores
- Evaluate pending submissions (deep link to evaluation form)

Check-ins tab
- Recent RRPT entries; effort and completed tasks

Feedback tab
- Session highlights; mentor comments; downloadable summary (v2)

## Tests

Purpose: create, schedule, and evaluate tests; attach them to student tasks.

Create Test
- Type
  - Weekly Test (lightweight, auto-approved)
  - End-of-Block Test (requires QA approval)
- Audience
  - One or more students (multi-select) or Cohort/Block group
- Topics & metadata
  - Subjects/topics covered; duration; marks; instructions
- Questions
  - Pick from question bank or add custom questions
- Scheduling & task attachment
  - Weekly Test → On Save: status = Approved; auto-scheduled for end of current week (e.g., Saturday)
  - End-of-Block → On Save: status = Pending QA; after approval → scheduled in final week of block
  - Task linkage: for each selected student, create (or attach to) a Test task in their current planner week/day
  - Confirmation: show list of students and the created/linked task IDs

Manage Tests
- List of tests with filters: type, status (Approved / Pending QA / Draft), due window
- Actions: Edit metadata (until scheduled), Duplicate, Archive (v2)

Evaluate Submissions
- Queue of submissions waiting evaluation; SLA timer
- Per submission: answers, rubric, scoring, comments, Save & Publish → student notified; KPI updates

## Sessions

Purpose: manage weekly 1:1s at scale.

Schedule
- Calendar (read-only for MVP) with published fixed slots and buffer slots
- Next sessions list for the week

Rescheduling
- Student-initiated: open Telegram link to propose buffer slots
- Mentor-initiated: send options via Telegram; admin escalation rules outside app

During session
- Open student Overview and Planner lens
- Add tasks; note highlights

After session
- Submit brief feedback highlights (text). PDF export in v2

## Settings

Availability
- Publish weekly availability (fixed + buffer slots)

Connected apps
- Telegram link/unlink status
- Open in Telegram: `https://t.me/<bot_username>` and `tg://resolve?domain=<bot_username>`

Preferences (MVP minimal)
- Default test duration/marks (prefill in creation form)

## Future Enhancements (v2)

- Tests
  - Template library; bulk attach to cohorts
  - Question bank tagging, difficulty, AI suggestions
  - Rich analytics for test outcomes across students
- Sessions
  - In-app reschedule with buffer slot picker and confirmations
  - Feedback PDF auto-generation and delivery
- Students
  - Comparative dashboards; cohort heatmaps; auto-nudge queues
- Dashboard
  - Deeper KPIs, mentor performance scorecards
- Planner
  - Batch task creation and cross-student insertion

