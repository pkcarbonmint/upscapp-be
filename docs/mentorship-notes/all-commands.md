# All System Commands

This file contains an exhaustive list of commands that can be executed against the backend services.

---

### Student Commands

*   `student:create` - Creates a new student profile.
*   `student:get` - Retrieves a student's profile details.
*   `student:update_profile` - Updates a student's profile information.
*   `student:get_enrollments` - Lists the products a student is enrolled in.
*   `student:update_status` - Changes a student's status (e.g., to 'active', 'inactive').

---

### Mentor Commands

*   `mentor:get` - Retrieves a mentor's profile details.
*   `mentor:assign_student` - Assigns a student to a mentor.
*   `mentor:get_students` - Lists all students assigned to a mentor.
*   `mentor:get_availability` - Retrieves a mentor's current availability.
*   `mentor:handle_offer_response` - Records a mentor's 'accept' or 'decline' response for a new student.

---

### Study Plan (Helios Engine) Commands

*   `study_plan:generate` - Generates a new, personalized study plan for a student.
*   `study_plan:get` - Retrieves a student's complete study plan.
*   `study_plan:get_draft` - Retrieves the editable version of a plan during the review phase.
*   `study_plan:finalize_draft` - Confirms the manually edited plan, making it active.
*   `study_plan:get_blocks` - Retrieves the high-level block structure of a study plan.
*   `study_plan:rebalance` - Triggers the monthly rebalancing of a student's study plan.
*   `study_plan:extend_block` - Extends the duration of a specific study block.
*   `study_plan:get_resources` - Retrieves the curated resource list for a study plan.
*   `study_plan:get_subject_metadata` - Retrieves the metadata for a specific subject.

---

### Task Commands

*   `task:create` - Creates a new task.
*   `task:get` - Retrieves the details of a specific task.
*   `task:update_status` - Updates a task's status (e.g., 'pending', 'completed').
*   `task:change_date` - Changes the due date of a task.
*   `task:edit_details` - Modifies the title, description, or expected hours of a task.
*   `task:delete` - Removes a task from a study plan.
*   `task:get_for_user` - Retrieves all tasks assigned to a specific user.
*   `task:get_for_block` - Retrieves all tasks within a specific study block.
*   `task:add_to_block` - Adds a new or existing task to a study block.

---

### Testing Commands

*   `test:create_question` - Adds a new question to the question bank.
*   `test:get_question` - Retrieves a question from the question bank.
*   `test:create` - Creates a new test (weekly or end-of-block).
*   `test:get` - Retrieves the details of a specific test.
*   `test:submit` - Submits a student's answers for a test.
*   `test:evaluate` - Submits a mentor's evaluation and feedback for a test.

---

### Communication Commands

*   `communication:send_notification` - Sends a notification to a user (e.g., via Telegram).
*   `communication:get_template` - Retrieves a pre-defined communication template.
*   `communication:log` - Logs a communication event for record-keeping.

---

### Daily Check-in Commands

*   `checkin:start` - Initiates the daily check-in conversation with a student.
*   `checkin:process_response` - Processes a student's text response to a check-in prompt.
*   `checkin:get_history` - Retrieves a student's historical daily check-in data.

---

### Reporting Commands

*   `report:generate_daily` - Generates the daily management report.
*   `report:generate_weekly` - Generates the weekly management report.
*   `report:get_kpi_data` - Retrieves the data for a specific Key Performance Indicator.

---

### Subscription Commands

*   `subscription:initiate_upgrade_flow` - Triggers the subscription upgrade process for a student.
*   `subscription:get_status` - Checks the current status and end date of a student's subscription.
