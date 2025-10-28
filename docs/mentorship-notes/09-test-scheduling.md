# Testing

  This section outlines the two distinct workflows for creating and scheduling tests: agile weekly tests for regular progress checks, and more formal end-of-block tests
  for milestone assessments.

## Guiding Principles

   * Proactive Creation: Tests are created "just-in-time" for weekly check-ins and well in advance for major block exams, ensuring mentors are never rushing.
   * Differentiated Quality Control: A lightweight process for weekly tests empowers mentor autonomy, while a more robust QA process for block tests ensures high standards
     for key milestones.
   * Automated Logistics: The system is responsible for placing tests into the student's schedule once they are ready, freeing mentors to focus on creating quality content.

## Workflow for Weekly Tests

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

## Workflow for End-of-Block Tests

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

## Test Evaluation (Common to Both Workflows)

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

