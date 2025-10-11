# Mentora UPSC Mentorship Program - MVP - October 1, 2025 Launch

## Executive Summary

This document is the specification of the Minimal Viable Product (MVP)
for UPSC mentorship program, slated for launch on October 1, 2025,
including product offerings, system workflow, and user roles.

---

## 1. Product Portfolio

### 1.1 Available Products
- **Study Planner Product** - Self-managed study planning
- **Personalized Mentorship Program - GS** - Individual guidance for General Studies
- **Personalized Mentorship Program - Optionals** - Individual guidance for Optional subjects
- **Programme-based Mentorship - GS** - Structured program for General Studies
- **Programme-based Mentorship - Optionals** - Structured program for Optional subjects
- **PCM-based Mentorship** - Specialized program for PCM students

### 1.2 Pricing Structure
| Product | Pricing Unit | Description |
|---------|-------------|-------------|
| Study Planner | Per Plan | Generated based on intake form and options |
| Personalized Mentorship | Per Mentorship-Month | Individual mentor guidance |
| Programme-based Mentorship | Per Programme | Structured curriculum-based program |
| PCM-based Mentorship | Per PCM Programme | Specialized PCM curriculum |

### 1.3 Study Plan Management
- **Study Planner**: Student manages their own plan with monthly rebalancing
- **Mentorship Programs**: Mentor and student jointly manage the study plan
- All products include an actively managed current study plan

---

## 2. System Workflow

### 2.1 Student Onboarding Process

#### Step 1: Registration
- Students can sign up online or at the institute
- Same forms and mechanisms for both channels
- Counselor involvement possible for in-person registrations

#### Step 2: Intake Assessment
- Complete intake form (same as current Google form)
- Provide study strategy preferences:
  - Weekly study hours commitment
  - GS focus: Mains only or GS with optionals
  - Revision strategy: Daily or weekly
  - Practice strategy (to be defined)
  - Subject approach: Two subjects + optional or One subject + optional
  - Task duration: Week/10 days/15 days
  - Study approach: Weak subjects first or strong subjects first

#### Step 3: Plan Generation
- System generates personalized study plan
- Student can customize certain plan components (TBD)
- Plan includes detailed schedule and milestones

### 2.4 Plan Contents and Structure

#### Plan Customization Based on Study Strategy
- **Subject Approach**: Plan adapts based on chosen strategy (two subjects + optional vs. one subject + optional)
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

### 2.5 Task-Based Activity Tracking

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

#### Task Types and Deadlines
- **Daily Tasks**: Study sessions, check-ins, practice questions (deadline: same day)
- **Weekly Tasks**: Tests, reviews, catch-up sessions (deadline: end of week)
- **Monthly Tasks**: Rebalancing, progress assessments (deadline: end of month)
- **Ad-hoc Tasks**: Special assignments, rescheduling coordination (variable deadlines)

### 2.6 Ongoing Student Activities

#### Daily Check-ins

- **Required**: Daily check-in with system prompts - Telegram driven,
    initiated by the system if student does not give updates
- **Content**: RRPT (Read/Revise/Practice/Testing) information
  - Hours studied
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

### 2.7 Special Rules for Programme-based Mentorship
- No monthly rebalancing
- No weekly personal reviews
- Structured curriculum adherence

---

## 3. User Roles and Responsibilities

### 3.1 Student Use Cases
1. **Signup Wizard** - Complete intake, strategy selection, plan generation
2. **First Counseling** - Initial mentor meeting (personalized mentorship)
3. **Daily Check-ins** - Regular progress tracking and task status updates
4. **Weekly Catch-up** - Complete pending tasks and update task progress
5. **Weekly Tests** - Complete assigned assessments and mark task completion
6. **Weekly Reviews** - Mentor feedback sessions with task progress review
7. **Monthly Rebalancing** - Plan adjustment and optimization based on task completion data

### 3.2 Mentor Use Cases
1. **Accept New Mentee** - Review and accept student assignment
2. **First Counseling** - Initial student meeting and goal setting
3. **Weekly Test Creation** - Design and assign assessments with task deadlines
4. **Weekly Test Evaluation** - Grade and provide feedback, update task completion status
5. **Weekly Review** - Progress discussion with student including task progress review
6. **Monthly Review + Rebalancing** - Comprehensive progress assessment based on task completion data
7. **Daily Check-in Review** - Monitor progress and send nudges for overdue tasks

### 3.3 Admin Use Cases
1. **Discount Management** - Create and manage discount coupons
2. **Attendance Monitoring** - Track student and mentor attendance
3. **Progress Oversight** - Review daily check-ins and nudge missing students for overdue tasks
4. **Quality Assurance** - Ensure test evaluations are completed and task status updated
5. **Task Management** - Monitor overall task completion rates and identify bottlenecks

---

## 4. Student-Mentor Communications

### 4.1 Communication Channels
- **Telegram Messaging** - Primary communication platform
- **Video Calls** - Scheduled weekly reviews and counseling sessions
- **Email** - Formal communications and document sharing
- **WhatsApp Groups** - Quick updates and announcements (optional)

### 4.2 Regular Communication Schedule

#### Daily Communications
- **Student → System**: Daily check-in reports (RRPT data)
- **System → Mentor**: Automated notifications of student progress
- **Mentor → Student**: Nudges for missing check-ins or incomplete tasks

#### Weekly Communications
- **Mentor → Student**: 
  - Test assignments and instructions
  - Weekly feedback on progress
  - Schedule coordination for review sessions
- **Student → Mentor**:
  - Weekly progress summary
  - Questions about assignments or concepts
  - Request for clarification on feedback
- **Joint Session**: Weekly video call for detailed review and discussion

#### Monthly Communications
- **Mentor → Student**:
  - Comprehensive progress report
  - Plan rebalancing recommendations
  - Goal adjustment discussions
- **Student → Mentor**:
  - Self-assessment of progress
  - Feedback on mentorship experience
  - Concerns or challenges faced
- **Joint Session**: Monthly rebalancing meeting (personalized mentorship only)

### 4.3 Communication Types and Templates

#### Mentor Communications
1. **Welcome Message** - Introduction and initial goal setting
2. **Test Instructions** - Clear guidelines for weekly assessments
3. **Progress Feedback** - Constructive comments on performance
4. **Motivational Messages** - Encouragement during challenging periods
5. **Plan Updates** - Changes to study schedule or approach
6. **Resource Sharing** - Additional study materials and references

#### Student Communications
1. **Progress Updates** - Regular status reports
2. **Question Queries** - Subject-specific doubts and clarifications
3. **Feedback Requests** - Seeking guidance on specific areas
4. **Schedule Conflicts** - Notification of availability changes
5. **Resource Requests** - Asking for additional study materials

### 4.4 Communication Guidelines

#### Response Time Expectations
- **Urgent Issues**: Within 4 hours
- **Regular Queries**: Within 24 hours
- **Weekly Reviews**: Scheduled in advance
- **Monthly Rebalancing**: Scheduled with 48-hour notice

#### Communication Etiquette
- Professional tone maintained at all times
- Clear and concise messaging
- Respect for time zones and availability
- Confidentiality of student information
- Constructive and actionable feedback

#### Escalation Process
1. **Student → Mentor**: Direct communication for academic issues
2. **Mentor → Admin**: Escalation for technical or administrative issues
3. **Admin → Management**: Escalation for policy or quality issues

4.5 Rescheduling Procedures (MVP)

  Guiding Principle
  Our goal is to create a flexible and efficient rescheduling process that empowers students and mentors to manage their schedules directly. The administrative team
  should only be involved for exceptions, not as a routine part of the process.

  Standard Rescheduling Process
   1. Direct Communication: The person needing to reschedule (student or mentor) should initiate the request directly with the other party via Telegram, providing as much
      advance notice as possible.
   2. Mutual Agreement: The student and mentor are responsible for finding a new, mutually agreeable time for the session.
   3. Mentor Updates the Calendar: Once a new time is agreed upon, the mentor will edit the event in the shared calendar. This action serves as the official confirmation of
      the new schedule.
   4. Automated Notification: The shared calendar system will automatically send an updated invitation and notification to both the student and the mentor.

  Admin Escalation
  The Admin Assistant should only be contacted for rescheduling in the following situations:
   * Disagreement: If the student and mentor cannot agree on a new time after a reasonable effort.
   * No Response: If one party is unresponsive to a reschedule request.
   * Policy Issues: In cases of repeated last-minute cancellations or no-shows, which may require administrative intervention.

  System Requirements for MVP
   * A shared calendar system (e.g., Google Calendar) that is accessible to both students and mentors.
   * Mentors must have permission to edit and move the calendar events for their own sessions.
   * Automated email/app notifications for calendar updates must be enabled for all users.

---
## 5 The Helios Engine: Automated Planning & Rebalancing

  The Helios Engine is the intelligent core of the mentorship
  platform. Its mission is to provide a clear, structured, and
  responsive path to success by generating a personalized study plan
  at the start of a student's journey and dynamically adapting it
  based on their real-world progress.

  The engine operates in two distinct phases: Initial Plan Generation and Dynamic Rebalancing.

  1. Phase 1: Initial Plan Generation

  This phase runs once for each new student upon successful onboarding.

  A. Inputs:
  The engine requires the following data from the student's intake form:
   * Student intake data which includes self-assessment and/or mentor assessment
   * Study strategy options
   * Study Preferences: Weekly Study Hours, Subject Approach, Study Pacing, Revision Strategy.

  B. Core Logic:
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
   * A High-Level Study Timeline showing all future blocks.
   * A Detailed Weekly Plan for the current block.
   * A Curated Resource List for the subjects in the current block.

  2. Phase 2: Dynamic Monthly Rebalancing

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
   1. Adjust pace - If the student is not able to put in the time he
      had projected, it lowers the time allocated for study, based on
      actual data.
   2. Incorporate Pending Tasks: All incomplete tasks from the previous month are automatically scheduled into the "Catch-up Day" slots of the next month's plan.
   3. Allow Manual Re-Sequencing: The engine allows the mentor to manually re-order the sequence of upcoming study blocks, providing flexibility to adapt to the student's
      evolving needs.

  C. Outputs:
   * An Updated Study Plan (v2.0, v3.0, etc.).
   * A Change Summary for the student and mentor, highlighting the key adjustments made.

  3. Core Dependency: Subject Metadata Table

  The Helios Engine's effectiveness relies on a central data source
  containing key information for each subject, including its standard
  completion time, curated resource lists, and associated question
  banks. This table must be maintained for the engine to function
  correctly.


---

## 5. SUccess Metrics


  1. Student Success & Engagement
   * Weekly Plan Adherence Rate: Percentage of assigned weekly tasks a student completes. Measured via (Completed Tasks / Assigned Tasks) * 100.
   * Daily Check-in Consistency: Percentage of days a student submits their daily check-in. Measured via (Days with Check-in / Total Days in Program) * 100.
   * Average Test Score Improvement: The trend of a student's scores on similar topics over time, tracked via test results.
   * Student Satisfaction Score (CSAT/NPS): A 1-5 rating of overall program satisfaction, measured via monthly or quarterly surveys.

  2. Mentor Performance & Quality
   * Test Evaluation Turnaround Time: Average time from test submission to when a mentor provides feedback. Measured via Timestamp(Feedback) - Timestamp(Submission).
   * Student-to-Mentor Ratio: The number of students assigned to a single mentor. Measured via Total Students / Total Mentors.
   * Mentor Rating: A 1-5 rating of mentor performance, measured via specific questions in student satisfaction surveys.

  3. Operational Efficiency
   * Mentor Assignment Time: Time from student payment to mentor assignment. Measured via Timestamp(Assignment) - Timestamp(Payment).
   * Admin Escalation Rate: Percentage of reschedules that require admin intervention. Measured via (Admin-Handled Reschedules / Total Reschedules) * 100.
   * Automated Nudge Effectiveness: Percentage of students who complete a task within 24 hours of an automated nudge, measured by correlating task and nudge timestamps.

  4. Business & Program Growth
   * Student Renewal Rate: Percentage of students who re-enroll after their term ends. Measured via (Renewing Students / Students with Expiring Plans) * 100.
   * Referral Rate: Percentage of new students who came from a referral, tracked via a signup form field.
   * Student Lifetime Value (LTV): Total revenue generated by the average student. Measured via (Avg. Monthly Price * Avg. Student Lifespan in Months).


---

## 5. Reports

###  Daily Management Report

  Purpose: A quick, scannable snapshot of the previous day's operational health and any urgent alerts.

  Report for: [Date]

  1. Key Daily Metrics:
   * New Student Signups:
   * Daily Check-in Rate: (e.g., 92% (460/500))
   * Tasks Completed:
   * Sessions Rescheduled:

  2. Critical Alerts (Requires Action):
   * Students Awaiting Mentor Assignment: (List of names and wait time if > 24 hours).
   * Overdue Mentor Evaluations: (List of mentors with tests overdue > 48 hours).
   * Consecutive Missed Check-ins: (List of students who have missed > 2 consecutive days).
   * New Admin Escalations: (Count and one-line description of new issues).


###  Weekly Management Report

  Purpose: A comprehensive review of the past week's performance, focused on trends and progress against goals.

  Report for Week: [Start Date] - [End Date]

  1. Executive Summary:
   * A few bullet points summarizing the week's highlights, challenges, and key trends. (e.g., "Student engagement up 3%, but mentor evaluation times have slipped by 4
     hours on average.")

  2. Student Success Dashboard (Weekly Trends):
   * Weekly Plan Adherence Rate: [Current Week %] vs [Previous Week %]
   * Daily Check-in Consistency: [Current Week %] vs [Previous Week %]
   * Student Satisfaction (CSAT): [Score] (if a survey was conducted this week).

  3. Mentor Performance Scorecard (Weekly Averages):
   * Avg. Test Evaluation Turnaround Time: [Current Avg. Hours] vs [Previous Avg. Hours]
   * Top 3 Mentors (by student adherence rate):
   * Bottom 3 Mentors (by student adherence rate):

  4. Operational & Business Funnel:
   * New Signups:
   * New Students Onboarded (Mentor Assigned):
   * Avg. Mentor Assignment Time:
   * Total Reschedules (Self-Service vs. Admin):
   * Student Renewal Rate (for cohorts whose term ended this week):


---

## 5. Mentor Assignment Process

  Guiding Principles:
   * Actionable Notifications: Telegram messages are the primary interface for action.
   * One-Click Actions: Mentors can accept or decline with a single click.
   * Flexible Responses: A web form is available for non-standard responses.


  Step 1: Student Enters the Assignment Queue
   * A student completes payment and is added to the queue.
   * Proactive Telegram Notification: A message is sent to the Mentor Supervisor: "New student `[Student Name]` has joined the assignment queue for `[Optional Subject]`.
     Click here to assign a mentor: `[direct_link_to_assignment_page]`"

  Step 2: Mentor Supervisor Manages the Match
   * The Mentor Supervisor clicks the link and assigns the best-fit mentor based on Subject Expertise and Workload.

  Step 3: Mentor Receives an Actionable Offer with Buttons
   * The system sends a direct message to the chosen mentor. The message now includes interactive buttons for an immediate response.

      > Message:
      > "You have a new mentorship offer for student `[Student Name]` (`[Optional Subject]`). Please respond within 12 hours."
      >
      > Buttons:
      > [  Yes, I accept ]
      > [  No, I decline ]
      > [  Add Remarks / Conditional Acceptance ] (This button links to the web form)

  Step 4: Mentor Responds with a Single Click
   * The mentor clicks one of the buttons to proceed.

       * If `[ Yes, I accept ]` is clicked: The system instantly confirms the assignment and triggers the final step.
       * If `[  No, I decline ]` is clicked: The system immediately notifies the Mentor Supervisor that the offer was declined and the student needs a new assignment.
       * If `[ Add Remarks... ]` is clicked: The mentor is taken to the web form to provide a detailed response (e.g., conditional acceptance), which is then flagged
         for supervisor review.

   * Escalation: If no action is taken within 12 hours, the Mentor Supervisor is automatically notified to follow up.

  Step 5: Assignment is Finalized & Welcome Sequence is Triggered
   * Once the assignment is confirmed (typically after the "Yes" button is clicked):
       * The student's dashboard is activated.
       * Proactive Telegram Notification (to Student): "Great news! Your mentor, `[Mentor Name]`, has been assigned..."
       * Proactive Telegram Notification (to Mentor): "Assignment complete! Please send your personalized welcome message to `[Student Name]`..."

---
## 5. Testing

  This section outlines the two distinct workflows for creating and scheduling tests: agile weekly tests for regular progress checks, and more formal end-of-block tests
  for milestone assessments.

  5.3.1 Guiding Principles

   * Proactive Creation: Tests are created "just-in-time" for weekly check-ins and well in advance for major block exams, ensuring mentors are never rushing.
   * Differentiated Quality Control: A lightweight process for weekly tests empowers mentor autonomy, while a more robust QA process for block tests ensures high standards
     for key milestones.
   * Automated Logistics: The system is responsible for placing tests into the student's schedule once they are ready, freeing mentors to focus on creating quality content.

  5.3.2 Workflow for Weekly Tests

  This is a lightweight process designed for speed and agility.

   1. Automated Weekly Prompt: When block-level plan is created, the
      system automatically creates a task for the mentor to create
      that week's test on Monday, specifying the topics. The deadline
      is Wednesday.
   2. Mentor Creates Test: The mentor creates a short test focused on
      the week's topics. The mentor selects questions from the
      question bank, or creates his own questions. Upon saving, the
      test is automatically "Approved". No supervisor review is
      required for weekly tests.
   3. Automatic Scheduling: The system immediately places the approved
     test into the student's schedule for the end of the current week
     (e.g., Saturday).

  5.3.3 Workflow for End-of-Block Tests

  This is a more formal process to ensure quality for major assessments.

   1. Automated Advance Prompt: The engine creates a task for creating
      the end-of-block test, scheduled for two weeks before a
      student's study block ends. The deadline is 7 days.

   2. Mentor Creates Test: The mentor creates a comprehensive test
      covering the entire block. Upon saving, the test's status is set
      to "Pending Quality Review".

   3. Mandatory QA Review: The Mentor Supervisor is notified to review
      the test. They can either "Approve" it or "Request Changes". A
      test cannot proceed until it is approved.

   4. Automatic Scheduling: Once approved, the system places the test into the student's schedule in the final week of the block.

  5.3.4 Test Evaluation (Common to Both Workflows)

  Once a student takes any type of test, the evaluation process is the same:

   1. Student Submission: The student completes and submits their test through the platform.
   2. Mentor Notification: The mentor immediately receives a Proactive
      Telegram Notification: "`[Student Name]` has submitted their
      test, '`[Test Title]`'. Please evaluate it within 48
      hours. Click here to evaluate: `[link]`"
   3. Evaluation: The mentor grades the test, provides detailed
      feedback, and submits the evaluation. The Test Evaluation
      Turnaround Time KPI is measured from the notification to the
      final submission.

     
---

## 5. Technical Implementation

### 5.1 Mentorship Engine
- **Status**: To be defined (TBD)
- **Functionality**: Automated plan generation and scheduling

### 5.2 Automation Opportunities
- Daily check-in reminders
- Missing student notifications
- Test scheduling
- Progress tracking
- Task deadline reminders and overdue notifications
- Automated task assignment based on study plans
- Task completion status updates and reporting

---

## 6. Outstanding Questions

### 6.2 Test Scheduling
- **Question**: How is test scheduling handled?
- **Options**: Automatic scheduling by Mentorship Engine vs. manual assignment

### 6.3 Additional Clarifications Needed
- Practice strategy definition
- Plan customization options
- PCM program specifics
- Automated nudge system implementation

---

## 7. Next Steps

1. Define Mentorship Engine rules and functionality
2. Clarify outstanding questions
3. Develop detailed implementation plan
4. Create user interface mockups
5. Establish testing and quality assurance processes
6. Define typical bot conversation between student, mentor and the bot.
8. Define how tests are created. At what point in the workflow? How do
   we ensure mentors actually create tests in timely manner? Do we
   need a quality check?

---

*Document Version: 1.0*  
*Last Updated: August 16, 2025*  
*Status: Draft for Review*
