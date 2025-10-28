# Student UI

- [User Flow](#user-flow)
- [Home](#1-home-screen-dashboard)
- [Plan](#2-study-plan)
- [Mentorship](#3-mentorship)
- [Progress](#progress-tracking)
- [Profile](#4-profile)
- [Settings](#5-settings)
 - [Future Enhancements](#future-enhancements-v2)

## Design principles
- Student-first: minimize friction for daily check-ins and task updates
- Plan-driven: everything orbits around block → week → task
- Actionable: each card provides a primary next action (mark done, log hours, reschedule, view feedback)
- Telegram-aware: assume most nudges originate in Telegram; the app provides full context and control

Global navigation (tab bar on mobile, left rail on desktop)
- Home
- Plan
- Mentorship
- Progress
- Profile

### Empty/loading states
- Show helpful sample cards with muted CTAs; never blank screens
- If no mentor assigned yet: show “Assignment in progress” with expected SLA and what to do next

## User Flow

- First-time setup (Hybrid Payment-Intake Flow)
  1. Product Selection → Quick Assessment (3-4 key questions) → Plan Preview
  2. Payment Gateway → Success Page with resume link
  3. Complete Full Intake Wizard (7-9 steps) → Submit
  4. If mentor not yet assigned: show "Assignment in progress" on Home; enable self-managed Plan
  5. Once mentor assigned: mentorship card appears; fixed weekly slot surfaced on Home

- Daily loop
  1. Home → Quick Check‑in (RRPT hours + tasks done)
  2. From any task in Today → Open in Plan → Task detail → Log effort / Mark done
  3. Alerts (flags/missed) on Home → Resolve → deep link to Mentorship/Plan as needed

- Weekly loop
  1. Home → Upcoming Test → Start/Instructions → Submit → Results pending
  2. Notifications → Mentor evaluation done → Progress → Test analytics
  3. Home → Upcoming Session → Join/Reschedule → Post‑session feedback PDF → Mentor tasks auto‑added to Plan

- Monthly loop
  1. Progress → Request Rebalancing (Study Planner) or see scheduled rebalancing (Mentorship)
  2. Plan auto‑versioned; history remains read‑only

- Rescheduling flow
  1. Mentorship → Reschedule → Pick from mentor buffer/open slots → Confirm → Calendar & notifications update
  2. Emergency: request ad‑hoc slot → escalate only if needed

- Notifications & deep links
  - All notifications (Telegram/app/email) open the exact screen: Task, Test, Session, or Feedback
  - From any deep link, back navigates to the originating section (Home/Plan/Mentorship)

- Edge cases
  - Offline day: log check‑in retrospectively; plan updates accordingly
  - Missed 2 tests/sessions: banner on Home with "Resolve" CTA → guided steps

- Payment and Intake Flow (Hybrid Approach)
  1. Product Selection Page → User selects product and clicks "Start Free Assessment"
  2. Quick Assessment (3-4 key questions) → Personalized Plan Preview
  3. Payment Gateway → Success Page with resume link sent via email
  4. Complete Full Intake Wizard (7-9 steps) → Auto-save every 30 seconds
  5. Resume Link Recovery → Click email link → Return to exact step where left off
  6. Cross-device sync → Resume token works across all devices
  7. Plan Generation → Mentor Assignment (if applicable)

## Home Screen (dashboard)

Purpose: a fast daily cockpit for “what should I do now?”, today’s accountability, and the next session/test.

Header
- Greeting with name and day
- Daily check-in status chip: Not started / In progress / Completed
 - Telegram quick link: Open in Telegram (`https://t.me/<bot_username>`) and Show QR for mobile scan

Today widgets

- Quick Check‑in
  - Inline RRPT logger: Study hours, Revision hours, Practice hours (number steppers)
  - Tasks done: multi-select of today’s due tasks (with `taskId` tags)
  - Save → shows toast and updates plan + streak
- Tasks Due Today
  - List of due/overdue tasks grouped by Study / Revision / Practice / Tests
  - Card actions: Mark done, Log effort, Snooze to catch‑up day
- Next Session
  - Mentor name, date/time, location/meeting link
  - Actions: Join (when live) / Reschedule / View agenda
- Upcoming Test
  - Test title, due date, topics; Action: Start / View instructions

This week
- Week progress: % tasks completed (optionally show hours vs target later)

- Current Block Resources (per subject)
    - Subject chips for current block (e.g., GS-II, Optional)
    - Up to 2 curated resources per subject (Books/Online/Videos/Practice)
    - Action: Open; link: View related tasks in Plan

System alerts (if any)
- Flags: missed 2 tests/sessions → visible banner with “Resolve” CTA

## Study Plan

Purpose: navigate block → week → tasks; execute tasks with minimal clicks; view resources.

- **Plan Status Notifications**:
  - For Mentorship Programs, when a mentor is editing a plan, the student's view will show a banner: *"Your mentor is currently preparing your plan for the upcoming block. It will be available shortly."*
- **Editing for Study Planner Product**:
  - For the self-managed Study Planner product, the student will have access to an **"Edit Plan" Mode** with the same capabilities as the mentor (drag-and-drop, inline editing, etc.) to customize their own schedule.

Top controls
- Block selector: Current Block (e.g., Block 2: GS-II + Optional)
- Week switcher: Week N tabs; shows dates
 

Task list (List view)

- Task card
  - Header: `taskId` (e.g., MH-12), title, subject, category chip, due date
  - Status row: progress (Not started / In progress / Done), expected hours, spent hours
  - Actions: Mark done, Log effort, Add note, Open resources
  - Context: assigned by Mentor/System/Self; origin shows in a subtle label
  - Optional: attachment badge (e.g., PDF, link)

 

Plan dynamics
- Auto-updates after check-ins and mentor task injections

## Mentorship

Purpose: manage sessions, reschedule when needed, access feedback, and see mentor-assigned tasks.

- **Subscription Upgrade Flow**:
  - If a student's plan is extended beyond their paid duration, a prominent banner will appear on the dashboard and/or mentorship page:
    > "Your study plan has been extended! **Upgrade Now** to unlock mentorship for your final [X] month(s)."
  - Clicking the button takes the student to a pre-configured payment page to purchase the required number of additional mentorship-months.

My mentor

- Mentor card: name, photo, expertise, contact policy, average evaluation TAT
- Fixed weekly slot: day/time; timezone; location/meeting link

Upcoming session

- Session card with agenda preview: review tests, tasks at risk, topics
- Reschedule: opens Telegram link to coordinate with mentor (fixed weekly slot shown)

Past sessions

- List with date, key outcomes, and feedback PDF link
- Mentor feedback highlights: strengths, weak areas, next-week priorities

Assigned by mentor

- Auto-injected tasks with deadlines; filtered view by origin = Mentor
- Quick acknowledge button; links to the relevant plan week

## Progress Tracking

Purpose: show essential progress with light-weight metrics.

This week

- Weekly adherence: % tasks completed
- Check-in consistency: X/7 days completed
- Hours logged: total study hours vs weekly commitment (if set)
- Recent test: last test title and score/accuracy; link to details
- Session status: Scheduled/Completed/Rescheduled (for the current week)

Trends (last 4 weeks)

- Adherence trend: mini-sparkline bars (text or simple visuals)
- Hours trend: total weekly hours (if available)

At risk and wins

- Tasks at risk: count with “View in Plan” link
- Completed this week: number of tasks marked done

## Profile

Personal & academic

- Name, email, phone, location
- Preparation background (attempts, scores, milestones)

Study strategy (editable where allowed)

- Focus combo, weekly study hours, time distribution preference
- Study approach (weak-first/strong-first/balanced)
- Revision strategy
- Test frequency
- Seasonal windows

Optional subject

- Subject, status, provider

Mentor & program

- Assigned mentor (read-only); cohort/program details

Data review

- Auto-generated intake summary; export as PDF

## Settings

Connected apps
- Telegram link/unlink status
 - Open in Telegram: `https://t.me/<bot_username>` (desktop/web) and `tg://resolve?domain=<bot_username>` (native deep link)
 - Show QR code for the bot link; include Copy link action

Resume link management
- Current resume link status (active/expired)
- Generate new resume link (if expired or lost)
- Resume link expiry date and time
- Copy resume link to clipboard
- Test resume link functionality

About
- App version; support contacts; policies

Accessibility & responsiveness
- Large touch targets for task actions; responsive list/cards; keyboard friendly forms

Intake wizard enhancements
- Auto-save indicator (saving/saved/error) with timestamp
- Progress bar showing completion percentage
- Resume link prominently displayed on each step
- Offline capability with local storage backup
- Form validation with helpful error messages
- Keyboard navigation support for all form fields

## Future Enhancements (v2)

- Home
  - Streak and block progress mini-bar
  - Current Block Resources: Pin/Mark as “Using”, smart suggestions
  - Admin/mentor nudges list
- Plan
  - Category filters, calendar view with drag-and-drop
  - Catch‑up day snooze and bulk actions
  - Resources panel with richer metadata and pinning
  - Plan version history and last rebalanced chip
- Mentorship
  - In-app rescheduling UI with buffer slot picker and emergency flow
  - Pre-session notes; join button integration
  - Feedback PDFs
- Progress
  - Check-in heatmap, category/subject breakdowns
  - Prelims FLT subject-wise analytics; Mains per-paper charts
  - Export/share weekly summaries
- Profile
  - Edit study strategy and preferences in-app
- Settings
  - Timezone/week start/catch‑up preferences
  - Privacy toggles

