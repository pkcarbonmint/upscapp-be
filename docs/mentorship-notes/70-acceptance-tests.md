# Acceptance Test Cases for UPSC Mentorship Platform

## Overview
This document contains acceptance test cases for the UPSC Mentorship Platform MVP, covering all features outlined in the numbered specification files. Tests are organized by feature areas and user roles.

---

## Student Onboarding & Registration

### Student Registration Flow
**Test Case**: `TC-ONB-001`
- **Given**: A new student wants to register for the mentorship program
- **When**: They access the registration form
- **Then**: They can complete registration with personal details and academic background
- **Acceptance Criteria**:
  - Form includes all required fields from intake form
  - Email verification is sent
  - Student is redirected to intake assessment after registration

### Intake Assessment Completion
**Test Case**: `TC-ONB-002`
- **Given**: A registered student needs to complete intake assessment
- **When**: They fill out the intake form
- **Then**: All study strategy preferences are captured
- **Acceptance Criteria**:
  - All subject confidence levels are recorded
  - Study strategy options are captured
  - Optional subject details are stored
  - Form validation prevents incomplete submissions

### Study Plan Generation
**Test Case**: `TC-ONB-003`
- **Given**: Student has completed intake assessment
- **When**: Helios Engine processes the data
- **Then**: A personalized study plan is generated
- **Acceptance Criteria**:
  - Plan includes high-level timeline for all blocks
  - Detailed weekly plan for current block only
  - Resource lists are generated for current block subjects
  - Plan reflects student's study strategy preferences

---

## Helios Engine - Plan Generation & Rebalancing

### Initial Plan Generation
**Test Case**: `TC-HELIOS-001`
- **Given**: Student intake data is complete
- **When**: Helios Engine runs initial plan generation
- **Then**: Plan is created with proper subject sequencing
- **Acceptance Criteria**:
  - Subjects are ordered based on study approach (weak/strong first)
  - Blocks are created with appropriate duration
  - Weekly schedule allocates hours correctly (60/20/20 split)
  - Resource lists are curated for current block

### Product-Specific Plan Generation
**Test Case**: `TC-HELIOS-004`
- **Given**: Student has selected a specific product type
- **When**: Helios Engine generates plan based on product
- **Then**: Plan reflects product-specific features
- **Acceptance Criteria**:
  - **Study Planner**: Self-managed plan with no mentor tests
  - **Personalized Mentorship**: Includes mentor-created tests and weekly reviews
  - **Programme-based Mentorship**: Structured curriculum with fixed schedule
  - **PCM-based Mentorship**: Specialized PCM curriculum with subject-specific focus

### Monthly Rebalancing
**Test Case**: `TC-HELIOS-002`
- **Given**: Student has completed one month of study
- **When**: Monthly rebalancing is triggered
- **Then**: Plan is adjusted based on performance data
- **Acceptance Criteria**:
  - Block duration is extended if student is behind
  - Pending tasks are redistributed to catch-up days
  - Plan version is incremented (v2.0, v3.0, etc.)
  - Change summary is generated for student and mentor

### Product-Specific Rebalancing
**Test Case**: `TC-HELIOS-005`
- **Given**: Student is enrolled in a specific product type
- **When**: Monthly rebalancing is triggered
- **Then**: Rebalancing follows product-specific rules
- **Acceptance Criteria**:
  - **Study Planner**: Student-led rebalancing with self-management
  - **Personalized Mentorship**: Joint mentor-student rebalancing session
  - **Programme-based Mentorship**: No rebalancing (fixed curriculum)
  - **PCM-based Mentorship**: Specialized rebalancing for PCM subjects

### Subject Metadata Integration
**Test Case**: `TC-HELIOS-003`
- **Given**: Subject metadata table is populated
- **When**: Helios Engine references subject data
- **Then**: Plan uses correct baseline hours and resources
- **Acceptance Criteria**:
  - Subject baseline hours are applied correctly
  - Resource lists include books, videos, practice materials
  - Question banks are linked to appropriate subjects
  - Subject sequencing follows recommended order

---

## Product-Specific Features

### Study Planner Product Features
**Test Case**: `TC-PRODUCT-STUDY-001`
- **Given**: Student is enrolled in Study Planner product
- **When**: Student uses the platform
- **Then**: Self-managed features are available
- **Acceptance Criteria**:
  - No mentor tests are included in plan
  - Student manages their own rebalancing
  - Student-driven practice selection
  - Flexible scheduling options
  - No weekly mentor review sessions

### Personalized Mentorship - GS Features
**Test Case**: `TC-PRODUCT-PERS-GS-001`
- **Given**: Student is enrolled in Personalized Mentorship - GS
- **When**: Student uses the platform
- **Then**: GS-focused mentorship features are available
- **Acceptance Criteria**:
  - Mentor-created tests for GS subjects
  - Weekly mentor review sessions
  - Joint monthly rebalancing
  - GS-specific resource lists
  - Prelims and Mains coverage

### Personalized Mentorship - Optionals Features
**Test Case**: `TC-PRODUCT-PERS-OPT-001`
- **Given**: Student is enrolled in Personalized Mentorship - Optionals
- **When**: Student uses the platform
- **Then**: Optional subject mentorship features are available
- **Acceptance Criteria**:
  - Mentor-created tests for optional subjects
  - Weekly mentor review sessions
  - Joint monthly rebalancing
  - Optional subject-specific resources
  - Mains-focused coverage

### Programme-based Mentorship - GS Features
**Test Case**: `TC-PRODUCT-PROG-GS-001`
- **Given**: Student is enrolled in Programme-based Mentorship - GS
- **When**: Student uses the platform
- **Then**: Structured GS program features are available
- **Acceptance Criteria**:
  - Fixed curriculum structure
  - No monthly rebalancing
  - Structured mentor tests
  - Fixed weekly schedule
  - GS-focused content

### Programme-based Mentorship - Optionals Features
**Test Case**: `TC-PRODUCT-PROG-OPT-001`
- **Given**: Student is enrolled in Programme-based Mentorship - Optionals
- **When**: Student uses the platform
- **Then**: Structured optional program features are available
- **Acceptance Criteria**:
  - Fixed optional subject curriculum
  - No monthly rebalancing
  - Structured mentor tests
  - Fixed weekly schedule
  - Optional subject-focused content

### PCM-based Mentorship Features
**Test Case**: `TC-PRODUCT-PCM-001`
- **Given**: Student is enrolled in PCM-based Mentorship
- **When**: Student uses the platform
- **Then**: PCM-specific features are available
- **Acceptance Criteria**:
  - Specialized PCM curriculum
  - PCM subject-specific tests
  - PCM-focused resource lists
  - PCM mentor expertise
  - Prelims and Mains coverage

### Product Pricing and Billing
**Test Case**: `TC-PRODUCT-BILLING-001`
- **Given**: Student selects a specific product
- **When**: Payment process is initiated
- **Then**: Correct pricing is applied
- **Acceptance Criteria**:
  - Study Planner: Per Plan pricing
  - Personalized Mentorship: Per Mentorship-Month (3, 6, 9, 12 months)
  - Programme-based Mentorship: Per Programme pricing
  - PCM-based Mentorship: Per PCM Programme pricing
  - Discount coupons work for all products

---

## Task Management System

### Task Creation and Assignment
**Test Case**: `TC-TASK-001`
- **Given**: Study plan is generated
- **When**: Tasks are created for the current block
- **Then**: Tasks are properly organized in hierarchy
- **Acceptance Criteria**:
  - Tasks follow Block → Week → Task hierarchy
  - Each task has unique human-readable ID (e.g., "MH-12")
  - Tasks include deadlines and expected hours
  - Tasks are categorized (Study/Revision/Practice/Test)

### Task Completion Tracking
**Test Case**: `TC-TASK-002`
- **Given**: Student has assigned tasks
- **When**: Student marks tasks as complete
- **Then**: Progress is updated in real-time
- **Acceptance Criteria**:
  - Task status changes from "Not started" to "Done"
  - Progress percentage updates immediately
  - Completed tasks are logged with timestamp
  - Plan adherence rate is recalculated

### Task Communication via Telegram
**Test Case**: `TC-TASK-003`
- **Given**: Student wants to report task completion via Telegram
- **When**: Student sends "task:22 is done"
- **Then**: System recognizes and updates task status
- **Acceptance Criteria**:
  - Bot recognizes task ID format
  - Task status is updated automatically
  - Confirmation message is sent to student
  - Progress is reflected in dashboard

---

## Daily Check-in System

### Telegram-Driven Daily Check-in
**Test Case**: `TC-CHECKIN-001`
- **Given**: Student needs to complete daily check-in
- **When**: Student responds to Telegram bot prompts
- **Then**: RRPT data is captured and stored
- **Acceptance Criteria**:
  - Bot prompts for study, revision, practice hours
  - Task completion is linked to specific task IDs
  - Data is stored in JSON format per schema
  - Check-in consistency is tracked

### RRPT Data Capture
**Test Case**: `TC-CHECKIN-002`
- **Given**: Student provides daily activity information
- **When**: System processes RRPT data
- **Then**: All metrics are properly recorded
- **Acceptance Criteria**:
  - Study hours are logged
  - Revision hours are logged
  - Practice hours are logged
  - Test completion is recorded
  - Topics studied are captured

### Automated Reminders
**Test Case**: `TC-CHECKIN-003`
- **Given**: Student hasn't completed daily check-in
- **When**: System detects missing check-in
- **Then**: Automated reminder is sent
- **Acceptance Criteria**:
  - Reminder is sent via Telegram
  - Reminder includes quick action buttons
  - System tracks consecutive missed check-ins
  - Escalation occurs after 2+ consecutive misses

---

## Mentor Assignment Process

### Student Assignment to Queue
**Test Case**: `TC-ASSIGN-001`
- **Given**: Student completes payment
- **When**: Student is added to assignment queue
- **Then**: Mentor supervisor is notified
- **Acceptance Criteria**:
  - Student appears in assignment queue
  - Telegram notification is sent to supervisor
  - Direct link to assignment page is provided
  - Student details and optional subject are included

### Mentor Assignment by Supervisor
**Test Case**: `TC-ASSIGN-002`
- **Given**: Mentor supervisor receives assignment request
- **When**: Supervisor assigns mentor based on expertise and workload
- **Then**: Mentor receives actionable offer
- **Acceptance Criteria**:
  - Mentor selection considers subject expertise
  - Workload capacity is checked
  - Assignment offer includes student details
  - Interactive buttons are provided for response

### Mentor Acceptance/Decline
**Test Case**: `TC-ASSIGN-003`
- **Given**: Mentor receives assignment offer
- **When**: Mentor responds with single click
- **Then**: Assignment is finalized or alternative is sought
- **Acceptance Criteria**:
  - "Yes, I accept" button confirms assignment
  - "No, I decline" button triggers reassignment
  - "Add Remarks" button opens detailed form
  - 12-hour escalation timer is set

### Assignment Finalization
**Test Case**: `TC-ASSIGN-004`
- **Given**: Mentor accepts assignment
- **When**: Assignment is finalized
- **Then**: Welcome sequence is triggered
- **Acceptance Criteria**:
  - Student dashboard is activated
  - Welcome notifications are sent to both parties
  - Mentor receives instructions for welcome message
  - Fixed weekly slot is established

---

## Test Creation and Management

### Weekly Test Creation
**Test Case**: `TC-TEST-001`
- **Given**: System creates weekly test creation task
- **When**: Mentor creates weekly test
- **Then**: Test is automatically approved and scheduled
- **Acceptance Criteria**:
  - Task is created on Monday with Wednesday deadline
  - Test focuses on week's topics
  - Questions can be selected from bank or custom created
  - Test is auto-approved upon saving
  - Test is scheduled for end of week (Saturday)

### End-of-Block Test Creation
**Test Case**: `TC-TEST-002`
- **Given**: Block is ending in two weeks
- **When**: Mentor creates end-of-block test
- **Then**: Test goes through QA review process
- **Acceptance Criteria**:
  - Task is created two weeks before block end
  - Test covers entire block comprehensively
  - Status is set to "Pending Quality Review"
  - Supervisor can approve or request changes
  - Test is scheduled in final week after approval

### Test Question Management
**Test Case**: `TC-TEST-003`
- **Given**: Mentor is creating test
- **When**: Mentor adds questions
- **Then**: Questions are properly categorized and stored
- **Acceptance Criteria**:
  - Questions can be selected from question bank
  - Custom questions can be added
  - Questions are tagged by subject and topic
  - Difficulty levels are assigned
  - Question bank supports multiple formats

---

## Test Evaluation Process

### Student Test Submission
**Test Case**: `TC-EVAL-001`
- **Given**: Student takes scheduled test
- **When**: Student submits test answers
- **Then**: Mentor is immediately notified
- **Acceptance Criteria**:
  - Test submission is recorded with timestamp
  - Mentor receives Telegram notification
  - Direct link to evaluation is provided
  - Test status changes to "Pending Evaluation"

### Mentor Test Evaluation
**Test Case**: `TC-EVAL-002`
- **Given**: Mentor receives test submission notification
- **When**: Mentor evaluates test
- **Then**: Detailed feedback is provided
- **Acceptance Criteria**:
  - Evaluation form shows student answers
  - Rubric is provided for consistent scoring
  - Comments field allows detailed feedback
  - Evaluation is completed within 48 hours
  - KPI tracking measures turnaround time

### Test Results Delivery
**Test Case**: `TC-EVAL-003`
- **Given**: Mentor completes test evaluation
- **When**: Results are published
- **Then**: Student receives comprehensive feedback
- **Acceptance Criteria**:
  - Student is notified of results availability
  - Score and accuracy are displayed
  - Mentor feedback is accessible
  - Analytics show performance trends
  - Results are linked to specific tasks

---

## Session Management and Rescheduling

### Fixed Weekly Session Scheduling
**Test Case**: `TC-SESSION-001`
- **Given**: Mentor and student are assigned
- **When**: Fixed weekly slot is established
- **Then**: Sessions are automatically scheduled
- **Acceptance Criteria**:
  - Fixed slot is reserved for entire program duration
  - Calendar events are created automatically
  - Both parties receive calendar invitations
  - Session location/meeting link is included

### Session Rescheduling Process
**Test Case**: `TC-SESSION-002`
- **Given**: Student needs to reschedule session
- **When**: Student requests reschedule via Telegram
- **Then**: Buffer slots are shown for selection
- **Acceptance Criteria**:
  - Only buffer slots are displayed (not other students' slots)
  - Student can propose new time
  - Mentor can accept or suggest alternative
  - Calendar is updated automatically
  - Both parties receive notifications

### Emergency Rescheduling
**Test Case**: `TC-SESSION-003`
- **Given**: Student has urgent need to reschedule
- **When**: Student triggers emergency request
- **Then**: Ad-hoc slot options are provided
- **Acceptance Criteria**:
  - Emergency button is available
  - Mentor can offer ad-hoc slots
  - Backup mentor pool is available if needed
  - Admin escalation occurs if no solution found

### Session Conduct and Feedback
**Test Case**: `TC-SESSION-004`
- **Given**: Weekly session is conducted
- **When**: Mentor provides session feedback
- **Then**: Feedback is recorded and tasks are updated
- **Acceptance Criteria**:
  - Session highlights are captured
  - New tasks can be injected into student plan
  - Feedback PDF is generated (v2)
  - Task deadlines are automatically set

---

## 10. Student UI Functionality

### Home Dashboard
**Test Case**: `TC-UI-STUDENT-001`
- **Given**: Student accesses home screen
- **When**: Dashboard loads
- **Then**: All daily widgets are displayed
- **Acceptance Criteria**:
  - Quick check-in widget is functional
  - Today's tasks are listed with actions
  - Next session information is shown
  - Upcoming test is displayed
  - Week progress percentage is accurate

### Study Plan Navigation
**Test Case**: `TC-UI-STUDENT-002`
- **Given**: Student navigates to plan section
- **When**: Plan view loads
- **Then**: Block and week structure is clear
- **Acceptance Criteria**:
  - Block selector shows current block
  - Week tabs display dates correctly
  - Task cards show proper information
  - Task actions (Mark done, Log effort) work
  - Resources are accessible from tasks

### Mentorship Section
**Test Case**: `TC-UI-STUDENT-003`
- **Given**: Student has assigned mentor
- **When**: Student accesses mentorship section
- **Then**: Mentor information and sessions are displayed
- **Acceptance Criteria**:
  - Mentor card shows profile and expertise
  - Fixed weekly slot is clearly displayed
  - Upcoming session shows agenda
  - Past sessions are listed with outcomes
  - Mentor-assigned tasks are visible

### Progress Tracking
**Test Case**: `TC-UI-STUDENT-004`
- **Given**: Student has completed activities
- **When**: Student views progress section
- **Then**: Progress metrics are displayed
- **Acceptance Criteria**:
  - Weekly adherence percentage is shown
  - Check-in consistency is tracked
  - Hours logged vs target is displayed
  - Recent test results are accessible
  - Trends over time are visible

---

## Mentor UI Functionality

### Mentor Dashboard
**Test Case**: `TC-UI-MENTOR-001`
- **Given**: Mentor accesses dashboard
- **When**: Dashboard loads
- **Then**: Today's activities are displayed
- **Acceptance Criteria**:
  - Today's sessions are listed
  - Pending evaluations count is shown
  - Reschedule requests are visible
  - At-risk students are flagged
  - Quick actions are available

### Student Management
**Test Case**: `TC-UI-MENTOR-002`
- **Given**: Mentor has multiple students
- **When**: Mentor accesses students section
- **Then**: Student list with filters is displayed
- **Acceptance Criteria**:
  - Search by name and subject works
  - Filters for flagged students work
  - Student cards show key metrics
  - Bulk actions are available
  - Student detail view is accessible

### Test Creation Interface
**Test Case**: `TC-UI-MENTOR-003`
- **Given**: Mentor needs to create test
- **When**: Mentor uses test creation form
- **Then**: Test is created and scheduled
- **Acceptance Criteria**:
  - Test type selection works
  - Student audience can be selected
  - Topics and metadata can be set
  - Question bank integration works
  - Scheduling and task attachment is automatic

### Session Management
**Test Case**: `TC-UI-MENTOR-004`
- **Given**: Mentor has scheduled sessions
- **When**: Mentor manages sessions
- **Then**: Session information and controls are available
- **Acceptance Criteria**:
  - Calendar shows fixed and buffer slots
  - Session agenda can be viewed
  - Rescheduling options are available
  - Session feedback can be recorded
  - Task injection works during sessions

---

## Admin and Reporting

### Daily Management Report
**Test Case**: `TC-ADMIN-001`
- **Given**: Daily operations have occurred
- **When**: Daily report is generated
- **Then**: Key metrics and alerts are displayed
- **Acceptance Criteria**:
  - New signups count is accurate
  - Daily check-in rate is calculated
  - Tasks completed count is correct
  - Critical alerts are highlighted
  - Students awaiting assignment are listed

### Weekly Management Report
**Test Case**: `TC-ADMIN-002`
- **Given**: Week of operations is complete
- **When**: Weekly report is generated
- **Then**: Comprehensive performance data is shown
- **Acceptance Criteria**:
  - Executive summary is provided
  - Student success trends are displayed
  - Mentor performance metrics are shown
  - Operational funnel data is accurate
  - Business metrics are calculated

### KPI Tracking
**Test Case**: `TC-ADMIN-003`
- **Given**: System is operational
- **When**: KPIs are measured
- **Then**: All success metrics are tracked
- **Acceptance Criteria**:
  - Weekly plan adherence rate is calculated
  - Test evaluation turnaround time is measured
  - Mentor assignment time is tracked
  - Student satisfaction scores are collected
  - Business growth metrics are monitored

---

## Communication and Notifications

### Telegram Integration
**Test Case**: `TC-COMM-001`
- **Given**: Telegram bot is configured
- **When**: System sends notifications
- **Then**: Messages are delivered via Telegram
- **Acceptance Criteria**:
  - Daily check-in prompts are sent
  - Test notifications are delivered
  - Session reminders are sent
  - Reschedule requests are handled
  - Deep links to app work correctly

### Email Notifications
**Test Case**: `TC-COMM-002`
- **Given**: Email system is configured
- **When**: Formal communications are sent
- **Then**: Emails are delivered with proper formatting
- **Acceptance Criteria**:
  - Welcome emails are sent
  - Session confirmations are delivered
  - Feedback PDFs are attached
  - Calendar updates are sent
  - Escalation notifications work

### Calendar Integration
**Test Case**: `TC-COMM-003`
- **Given**: Calendar system is connected
- **When**: Sessions are scheduled or rescheduled
- **Then**: Calendar events are updated
- **Acceptance Criteria**:
  - Fixed weekly slots are created
  - Buffer slots are available
  - Rescheduled events are updated
  - Notifications are sent automatically
  - Meeting links are included

---

## Data Management and Security

### Student Data Privacy
**Test Case**: `TC-DATA-001`
- **Given**: Student data is collected
- **When**: Data is stored and processed
- **Then**: Privacy is maintained
- **Acceptance Criteria**:
  - Personal information is encrypted
  - Access controls are implemented
  - Data retention policies are followed
  - GDPR compliance is maintained
  - Student consent is recorded

### Data Backup and Recovery
**Test Case**: `TC-DATA-002`
- **Given**: System data exists
- **When**: Backup is performed
- **Then**: Data is safely stored
- **Acceptance Criteria**:
  - Regular backups are automated
  - Backup integrity is verified
  - Recovery procedures work
  - Data loss prevention is in place
  - Disaster recovery plan exists

---

## Performance and Scalability

### System Performance
**Test Case**: `TC-PERF-001`
- **Given**: Multiple users are active
- **When**: System processes requests
- **Then**: Performance remains acceptable
- **Acceptance Criteria**:
  - Page load times are under 3 seconds
  - API response times are under 1 second
  - Database queries are optimized
  - Concurrent users are supported
  - System resources are monitored

### Scalability Testing
**Test Case**: `TC-PERF-002`
- **Given**: User base grows
- **When**: System scales up
- **Then**: Performance is maintained
- **Acceptance Criteria**:
  - Additional mentors can be added
  - More students can be onboarded
  - Database can handle increased load
  - Infrastructure scales automatically
  - Cost optimization is maintained

---

## Test Execution Guidelines

### Test Environment Setup
- Use staging environment for all tests
- Ensure test data is isolated from production
- Set up test Telegram bot and calendar integration
- Configure test mentor and student accounts

### Test Data Requirements
- Sample student profiles with various study strategies
- Test mentor accounts with different subject expertise
- Sample question bank with categorized questions
- Test study plans with multiple blocks and tasks

### Test Execution Order
1. Start with onboarding and registration tests
2. Test Helios Engine functionality
3. Verify task management system
4. Test communication flows
5. Validate UI functionality
6. Complete admin and reporting tests
7. Perform performance and security tests

### Success Criteria
- All acceptance criteria must be met
- No critical bugs should be found
- Performance benchmarks must be achieved
- Security requirements must be satisfied
- User experience should be smooth and intuitive

---

*Document Version: 1.0*  
*Last Updated: [Current Date]*  
*Status: Ready for Test Execution*
