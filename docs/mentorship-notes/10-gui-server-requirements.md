# Server-Side Support for GUI

This document outlines the comprehensive list of server-side operations, API endpoints, and data structures required to support the Mentora Elm-based GUI for both students and mentors. It is based on the UI/UX specifications and includes the recently added features for manual plan editing.

---

## 1. User & Session Management

Handles user authentication, profiles, and session state.

- **`POST /api/mentora/login`**
  - **Purpose**: Authenticate a user (student or mentor) with credentials.
  - **Returns**: A session token and user profile summary (ID, name, role).

- **`POST /api/mentora/logout`**
  - **Purpose**: Invalidate the user's current session token.

- **`GET /api/mentora/profile`**
  - **Purpose**: Retrieve the full profile for the currently authenticated user (student or mentor).
  - **Returns**: Detailed user information, including study strategy for students or assigned mentees for mentors.

---

## 2. Student Onboarding & Intake

Manages the initial student sign-up, data collection, and the ability to resume the process.

- **`POST /api/mentora/intake/save-progress`**
  - **Purpose**: Saves the student's partially completed intake form data. This is called periodically by the wizard.
  - **Payload**: `{ "resume_token": "...", "current_step": 3, "form_data": {...} }`
  - **Returns**: Success/failure status.

- **`GET /api/mentora/intake/resume/{token}`**
  - **Purpose**: Retrieves a student's saved intake session data using their unique resume token.
  - **Returns**: The saved form data and the step number where the user left off.

- **`POST /api/mentora/intake/complete`**
  - **Purpose**: Submits the final, completed intake form.
  - **Action**: This is a critical endpoint that must trigger the `study_plan:generate` command on the backend to kick off the initial plan generation by the Helios Engine.
  - **Returns**: A confirmation and the ID of the newly created study plan draft.

---

## 3. Plan Management (Core Operations)

Handles the main interactions with the study plan.

- **`GET /api/mentora/plan/{plan_id}`**
  - **Purpose**: Fetches the student's active, published study plan.
  - **Returns**: A complete plan object containing the high-level block timeline and a detailed task-by-task schedule for the *current* block. Includes subjects, topics, and associated resources.

- **`POST /api/mentora/plan/{plan_id}/rebalance`**
  - **Purpose**: Initiates the monthly rebalancing process for a student's plan.
  - **Action**: Triggers the `study_plan:rebalance` command.
  - **Returns**: The new plan draft for the mentor to review.

---

## 4. Manual Plan Editing & Versioning

Supports the crucial workflow of allowing mentors or students to manually edit a plan draft.

- **`POST /api/mentora/plan/{plan_id}/start-editing`**
  - **Purpose**: Puts an existing plan into a "Draft" state for editing, creating a new version.
  - **Returns**: The full, editable plan object.

- **`GET /api/mentora/plan/{plan_id}/draft`**
  - **Purpose**: Retrieves the current editable draft of a plan.

- **`PUT /api/mentora/plan/{plan_id}/draft`**
  - **Purpose**: Saves the entire state of the edited plan draft. The GUI will send the complete, modified plan object. This is the primary save mechanism during editing.
  - **Payload**: The entire, modified plan object, including changes to block durations, task orders, task details, etc.
  - **Returns**: Success/failure status.

- **`POST /api/mentora/plan/{plan_id}/publish`**
  - **Purpose**: Finalizes and publishes a plan draft, making it the new active plan for the student.
  - **Action**: Triggers the `study_plan:finalize_draft` command. This endpoint must contain the logic to check if the plan extends beyond the current subscription.
  - **Returns**:
    - If successful: `{ "status": "published" }`
    - If subscription extension is needed: `{ "status": "upgrade_required", "details": { "new_end_date": "...", "months_needed": 1 } }`

---

## 5. Task Management (Daily Operations)

Handles granular, daily interactions with individual tasks.

- **`POST /api/mentora/task/{task_id}/update-status`**
  - **Purpose**: Marks a task's status (e.g., "Not Started" -> "Completed").
  - **Payload**: `{ "status": "Completed" }`

- **`POST /api/mentora/task/{task_id}/log-effort`**
  - **Purpose**: Logs time spent on a task.
  - **Payload**: `{ "hours_spent": 1.5 }`

- **`POST /api/mentora/task/{task_id}/add-note`**
  - **Purpose**: Allows a student or mentor to add a note to a task.
  - **Payload**: `{ "note_text": "..." }`

---

## 6. Dashboard & Progress Data

Provides aggregated data needed to render the main dashboard screens.

- **`GET /api/mentora/student/{student_id}/dashboard`**
  - **Purpose**: A single endpoint to fetch all data for the student's home screen.
  - **Returns**: An aggregated object containing today's tasks, next session details, upcoming test info, and weekly progress stats.

- **`GET /api/mentora/mentor/{mentor_id}/dashboard`**
  - **Purpose**: A single endpoint for the mentor's dashboard.
  - **Returns**: An aggregated object containing today's sessions, a count of pending evaluations, and a list of at-risk students.

- **`GET /api/mentora/student/{student_id}/progress-trends`**
  - **Purpose**: Fetches historical data for the progress tracking view.
  - **Returns**: Data for weekly adherence and hours logged over the last 4-8 weeks.

---

## 7. Mentorship & Scheduling

Handles interactions related to mentor sessions.

- **`GET /api/mentora/mentor/{mentor_id}/availability`**
  - **Purpose**: Fetches a mentor's schedule, including fixed and buffer slots, for the rescheduling UI.

- **`POST /api/mentora/session/{session_id}/reschedule`**
  - **Purpose**: Handles a reschedule request.
  - **Payload**: `{ "new_slot_id": "..." }`
  - **Returns**: Confirmation of the rescheduled session.

- **`POST /api/mentora/session/{session_id}/feedback`**
  - **Purpose**: Allows a mentor to submit feedback after a session.
  - **Payload**: `{ "highlights": "...", "newly_assigned_tasks": [...] }`

---

## 8. Subscription & Payment Integration

Manages the commercial aspects of the mentorship programs.

- **`GET /api/mentora/student/{student_id}/subscription`**
  - **Purpose**: Retrieves the student's current subscription status, including the plan name and, most importantly, the subscription end date.

- **`POST /api/mentora/subscription/initiate-upgrade`**
  - **Purpose**: Called when a student clicks the "Upgrade Now" button.
  - **Action**: Triggers the `subscription:initiate_upgrade_flow` command.
  - **Returns**: A payment gateway URL or necessary details for the frontend to initialize the payment process.
