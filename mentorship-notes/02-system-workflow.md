# System Workflow

### Student Onboarding Process

#### Step 1: Registration
- Students can sign up online or at the institute [both places the form should be same]
- Same forms and mechanisms for both channels
- Counselor involvement possible for in-person registrations

#### Step 2: Intake Assessment
- Complete intake form (same as current Google form)
- Provide study strategy preferences:
  - Weekly study hours commitment
  - GS focus: Mains only or GS with optionals
  - Revision strategy: Daily or weekly
  - Practice strategy (to be defined) - [PYQ +Topic wise question/Workbooks] ??
  - Subject approach: Two GS subjects + optional or One subject + optional [Multiple Combos] ??
  - Task duration: Week/10 days/15 days
  - Study approach: Weak subjects first or strong subjects first

#### Step 3: Plan Generation
- System generates a personalized study plan **draft**.
- **(New) Step 3b: Mentor/Student Review**:
  - For mentorship programs, the mentor reviews and can manually edit the detailed schedule and tasks before publishing it to the student.
  - For the Study Planner product, the student can make these edits themselves.
- The finalized plan includes a detailed schedule and milestones.

### Plan Contents and Structure

#### Plan Customization Based on Study Strategy
- **Subject Approach**: Plan adapts based on chosen strategy (two subjects + optional vs. one subject + optional) [Multiple Combos] ??
- **Study Hours**: Plan structure adjusts to weekly study hour commitment
- **Revision Strategy**: Daily or weekly revision blocks integrated into schedule
- **Practice Strategy**: Question practice sessions scheduled according to preferences
- **Task Duration**: Study blocks organized by chosen duration (week/10 days/15 days)
- **Study Approach**: Weak subjects first or strong subjects first determines subject sequence

#### Plan Structure and Timeline

- **Multi-Week Blocks**: Plan breaks down study into multiple blocks
    spanning several weeks. The block contains plan for the current
    subject(s) only - based on the study strategy option chosen by the
    student.  For example, 2 subject strategy will have plan for two
    subjects.
- Detailed plan will only include tasks for  subjects in the current block.
- For other blocks only high level plan will be included.
- **Weekly Organization**: Each week contains structured tasks for:
  - Study sessions (reading and comprehension)
  - Revision sessions (reinforcement and retention)
  - Practice sessions (question solving and application)
  - Tests (mentor-created assessments for mentorship programs)

#### Clarity on Block

1. Definition
 * A Block is a multi-week unit of study (example: 4–6 weeks).
 * Each Block only covers the subjects chosen in the student’s strategy combo (e.g., GS + Optional).
 * Within the Block, we go into detailed weekly plans. For other subjects (not part of this block), only a high-level placeholder is shown.
2. Basic Unit = Week
 * Each Block is broken down into Weeks (Mon–Sun).
 * Sunday is the standard Review/Revision/Test Day.
3. Within Each Week
Students follow 4 categories of tasks:
 * Study Sessions → Reading / Comprehension
 * Revision Sessions → Reinforcement / Retention
 * Practice Sessions → Question solving / Application
 * Tests → Mentor-created assessments/ others that they can write or update the scores. / PYQs/Workbooks/Additional tasks assigned by mentors. 

4.	Timeline Structure
 * When creating a 6-month / 9-month plan, the system generates Block-by-Block weekly targets.
 * 	Example: A 9-month plan → 9 Blocks (≈ 4 weeks each) with detailed week-by-week tasks.
5. Adaptive Hours Logic

 * Each subject has a baseline recommended time (e.g., Polity = 100 hrs).
 * Adjustment happens based on student’s status sheet (strength/weakness):
   * Very Strong → -25% (trimmed hours)
   * Very Weak → +25% (extra hours)
 * Example: Polity baseline = 100 hrs → Strong student = 75 hrs; Weak student = 125 hrs.
 * If the timeline is shorter (say 6 months vs 9 months), the trimming is proportional.


#### Subject-Specific Resource Lists

- **Pre-Block Preparation**: Before each block begins, comprehensive
   resource list is generated for each of the subjects in the block .
- **Resources**: For each subject, includes:
  - **Books**: Standard textbooks and reference materials
  - **Online Materials**: Digital resources, articles, and documents
  - **Videos**: Educational content and lectures
  - **Practice Materials**: Question banks and mock tests
  - **Supplementary Resources**: Additional reading and reference materials

#### Product-Specific Plan Variations

##### Study Planner Product
- **Self-Managed**: Student controls all aspects of plan execution
- **No Mentor Tests**: Plan excludes mentor-created assessments
- **Student-Driven Practice**: Student selects and completes practice materials independently
- **Flexible Scheduling**: More adaptable to student's changing schedule

##### Mentorship Programs
- **Mentor Integration**: Mentor-created tests and assessments included in plan
- **Structured Feedback**: Regular mentor review sessions built into schedule
- **Guided Practice**: Mentor-directed practice sessions and assignments
- **Accountability**: Regular check-ins and progress monitoring

#### Plan as Living Document
- **Dynamic Updates**: Plan is continuously updated to reflect current progress and changes
- **Real-Time Adjustments**: Daily check-ins and task completions update plan status
- **Version Control**: Monthly rebalancing creates new plan versions while maintaining history
- **Progress Tracking**: Plan shows completed vs. pending tasks with visual indicators
- **Adaptive Scheduling**: Plan adjusts deadlines and schedules based on actual progress


### Mentorship Flow 

1. Scheduling & Rescheduling
  * Mentor Availability Input: Each mentor publishes their available slots (e.g., Mon 2:30, Wed 3:30, Fri 5:30) via dashboard or Telegram bot.
  * Student Assignment: Students are pre-assigned weekly slots with a fixed mentor (e.g., Student 1 → Kalyan → Friday 5:30).
  * Rescheduling Flow:
    * If student wants to reschedule, they request via Telegram → bot shows other available slots of the same mentor → student confirms.
    * If mentor needs to reschedule, system pushes new options to student.
  * Automation: Notifications are sent to both sides when a slot is confirmed/changed.
2. Mentor Dashboard View

For every scheduled session, the mentor should see:
  * Student Profile Summary (from history sheet).
  * Status & Progress Sheet (confidence levels, red/yellow/green status, etc).
  * Daily Accountability Logs (hours completed, tasks done, tests taken, marks).
  * Weekly Test Performance (self-test, institute test, or mentorship test → all logged by student). The system reserves Sunday for the weekly test and review.

3. Accountability Tracking
  * Student’s Role:
    * Daily log via Telegram/web: hours studied, tasks done, tests attempted, scores.
    * Weekly → mark block completion & upload test scores (internal/external).
  * Mentor’s Role:
    * Verify logs against student progress.
    * Highlight missing logs/tests in session.
    * Assign new tasks/tests with deadlines → these auto-populate in student’s next-week planner.

4. Feedback & Task Injection
  * During Session: Mentor can add new tasks (e.g., “Revise Polity Ch 10–12 before next Sunday test”).
  * System Reaction:
    * Auto-updates student planner with those tasks.
    * Tags them with a deadline (before next session/test).
  * Post-Session: Mentor clicks feedback checkboxes/buttons (e.g., “Good progress in GS2, Weak in Essay”) + adds comments.
  * Student Output: Receives a PDF/email/Telegram summary of session feedback + new tasks.

5. Scalability
  * Mentors can be in Hyderabad, Delhi, Bengaluru, or online.
  * Students are tagged by location (offline/online), but scheduling + accountability is standardized across the system.
  * Same structure works whether it’s 10 mentors in Hyderabad or 200 across India.

### Rescheduling Procedures & Flow (MVP)

* Fixed Weekly Slots (Default Setup)
  *	Every student gets a predefined weekly mentorship slot at the time of joining (e.g., Friday 3 PM with Kalyan).
  *	This slot is locked for the entire program duration (e.g., 40 weeks = 40 sessions).
  *	Unless rescheduled, the assumption is that the meeting happens every week at the same time with the same mentor.
* Mentor Calendar Structure
  *	Each mentor has:
    * Blocked Slots → Reserved for existing students (e.g., Mon–Fri, 2:30, 3:30, 4:30, 5:30).
    * Buffer Slots → 1–2 additional slots per day (e.g., 5:30, 6:30). These are reserved for reschedules only, not for new students.
    * Ad-hoc Slots → Emergency-only, triggered when a student presses a panic reschedule (e.g., sudden illness, technical issue).
* Standard Rescheduling Flow
  * Trigger: A student cannot attend their fixed slot → they request reschedule.
  * System Checks Mentor Calendar:
    * Shows only buffer slots or open slots for that mentor.
    * Blocked slots (other students’ fixed timings) remain hidden/unavailable.
* Student Proposes: Selects a buffer slot.
* Mentor Confirms: Approves or suggests another buffer slot.
* System Updates Calendar: Moves the event officially.
* Notifications: Student + mentor both get updates (via Telegram/email/app).
* Ad-hoc / Emergency Flow (Panic Button)
  *	If the student cannot wait until the next available buffer slot, they can trigger an emergency request.
  *	Mentor receives notification → chooses an ad-hoc slot (any free time).
  *	If mentor is unavailable, system escalates to:
    * Another available mentor in same city/online (backup pool).
    * Or admin intervention to manually resolve.
* Admin Escalation Rules: Admins step in only when:
  * Conflict: Student and mentor cannot agree on a new time.
  * Unresponsive: One party does not reply within 24–36 hours.
  * Repeated Issues: Student repeatedly misses/reschedules beyond allowed buffer.
  * Emergency Overflow: Mentor’s buffer slots are full, requiring reallocation.
* Session Integrity
  * Each week must have one session (unless explicitly marked as skipped by admin due to emergencies).
  * If a student reschedules, that week’s session is moved, not canceled.
  * If reschedule is not possible within the same week → session is carried forward, and backlog is flagged on the dashboard.

* System Requirements
  * Shared calendar for mentors with:
    * Fixed student slots (blocked).
    * Buffer slots (reschedule only).
    * Ad-hoc slots (rare/emergency).
  * Reschedule workflow embedded into dashboard/Telegram → request, propose, confirm.
  * Auto-update of session cards for both student and mentor.
  * Weekly enforcement: Each student shows exactly 1 completed/ scheduled session in that week.

* Example Walkthrough
  * Student A has Friday 3 PM fixed with Kalyan.
  * This week, student cannot attend.
  * Student requests reschedule → system shows Kalyan’s free buffer slots (Fri 5:30, Sat 4:30).
  * Student picks Fri 5:30.
  * Kalyan accepts → system updates event → Telegram/email notification sent.
  * Friday 3 PM slot remains empty, but session is preserved at 5:30.


### Task-Based Activity Tracking

#### Task Management System

- **Task-based Tracking**: All activities are managed through assigned
  tasks with deadlines.
- Tasks are grouped under a hierarchy: block -> week -> task. Each
  task is given an ID that can be used by humans in communication -
  for example, student can say "task:22 is done" to mark a task
  complete.
- **Role-Based Tasks**: Students, mentors, and admin assistants
    receive specific task assignments
- **Progress Monitoring**: Students and mentors will have a shared
    dashboard view of their progress. The dashboard will show (a) the
    current week view (b) the current block view and (c) the overall
    study plan (d) mentorship 1:1 sessions - historical and planned.
- **Automated Reminders**: System sends deadline reminders and overdue
    notifications via Telegram
- Test & Score Tracking:
  * Mains: Marks and mentor evaluation are linked with the task.
  * Prelims: After every test, the system shows:
    * Total attempted
    * Correct & Incorrect
    * Accuracy %
    * Full-Length Tests: Subject-wise score breakdown (e.g., Polity 42/50, Economy 35/50).

#### Task Types and Deadlines
- **Daily Tasks**: Study sessions, check-ins, practice questions (deadline: same day)
- **Weekly Tasks**: Tests, reviews, catch-up sessions (deadline: end of week)
- **Monthly Tasks**: Rebalancing, progress assessments (deadline: end of month)
- **Ad-hoc Tasks**: Special assignments, rescheduling coordination (variable deadlines)


### Ongoing Student Activities

#### Daily Check-ins

- **Required**: Daily check-in with system prompts - Telegram driven,
    initiated by the system if student does not give updates
- **Content**: RRPT (Read/Revise/Practice/Testing) information
  - Hours studied
  - Topics studied
  - Topics revised
  - Questions practiced
  - Tests completed
- **Status Tracking**: Mark completed task status and update progress on assigned tasks

#### Weekly Activities
- **Catch-up Day**: Weekly session to complete pending tasks and update task status
- **Tests**: Mentor-assigned tests (mentorship programs only) with task completion tracking
- **Reviews**: Weekly mentor review sessions (personalized mentorship only) including task progress review

#### Monthly Activities
- **Rebalancing**: Progress review and plan updates
  - Study Planner: Student-led rebalancing
  - Personalized Mentorship: Mentor-student joint rebalancing
  - Programme-based Mentorship: No rebalancing

### Special Rules for Programme-based Mentorship
- No monthly rebalancing
- No weekly personal reviews - Program schedule won’t change, but for an individual student adhoc/additional task will be added to the student.
- Structured curriculum adherence

