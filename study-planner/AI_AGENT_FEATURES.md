## AI Agent Features for the Helios Study Planner

This document proposes pragmatic AI agent capabilities that fit the current codebase, focusing on automations that use existing types, services, and UI surfaces.

### Goals
- Personalize plans faster and with higher quality
- Keep plans up-to-date with student feedback, calendar shifts, and exam timelines
- Reduce manual review workload for faculty while increasing transparency
- Provide students with actionable, daily guidance where they already are (web, Telegram)

### Key integration points observed in the repo
- Planning/engine
  - `helios-ts/src/engine/Engine.ts` — rebalancing and plan review stubs (`rebalanceStudyPlan`, `reviewPlan`, `validatePlan`)
  - `scheduler/` — consolidated cycle scheduling (`determineCycleSchedule` re-exported via `helios-ts/src/services/cycle-scheduler.ts`)
- Study plan structure and types
  - `helios-ts/src/types/models.ts`, `helios-ts/src/engine/engine-types.ts`
  - `SubjectLoader` and `loadSubtopics` in `helios-ts/src/services/SubjectLoader.ts`
- Resource graph
  - `helios-ts/src/services/ResourceService.ts` (+ NCERT integration)
- Document generation
  - `helios-ts/src/services/WeeklyScheduleService.ts` (Word)
  - `helios-ts/src/services/CalendarPDFService.ts` (high-fidelity PDF + HTML)
- Onboarding + archetype selection
  - `onboarding-ui/src/services/heliosService.ts` (transforms UI data to `StudentIntake`, selects archetype, calls `generateInitialPlan`)
- Chat surface
  - `helios-ts/src/services/TelegramBot.ts` (stubbed conversation handler)
- Faculty surfaces
  - `faculty-ui/` pages for plan review and student management

---

### Recommended agent personas and features

1) Intake Coach (Form Copilot)
- Where: `onboarding-ui` during intake and preview
- What: Interpret free-form or incomplete inputs, infer missing values (e.g., weekly hours ranges, seasonality, weak topics), and preview impacts before plan generation
- How:
  - Keep `onboarding-ui/src/services/heliosService.ts` as source of truth; add an agent layer that suggests edits to `study_strategy`, flags inconsistencies, and maps preferences to `Config`
  - Guarantee structured output that conforms to `createStudentIntake(...)` and `StudyPlanCalculator` expectations
- Deliverables:
  - Inline suggestions and “apply” buttons in the wizard
  - “Why” explanations attached to each suggestion

2) Archetype & Config Tuner
- Where: just before `generateInitialPlan`
- What: Choose `Archetype` and fine-tune `Config.task_effort_split` and clamps using student constraints (work hours, preferences, confidence)
- How:
  - Propose 2–3 candidate archetypes with trade-offs; select one with explanation
  - Adjust `Config` safely (respect bounds in `engine-types.ts`)

3) Plan Review Agent (deterministic first, LLM optional)
- Where: post-generation, in `Engine.reviewPlan` and `validatePlan`
- What: Score plan quality and produce fix suggestions tied to `PlanReviewResult`
- How:
  - Phase 1: Rule-based checks (no-LLM) for time limits, block overlap, subject progression, test cadence, resource presence
  - Phase 2: Optional LLM to explain fixes in plain English and to group issues for the UI
- Output: Populate `PlanReviewResult.validation_issues`, `fix_suggestions`, and `summary`

4) Adaptive Rebalance Agent (monthly or on-demand)
- Where: `Engine.rebalanceStudyPlan` (currently TODOs)
- What: Rebuild future blocks based on feedback, confidence drift, missed work, and exam proximity
- How:
  - Implement `identifyUnfinishedWorkNew(...)` using actual `Block.weekly_plan`, `topicCode`, and `TopicConfidenceMap`
  - Implement `runTopicBasedRebalancePlanner(...)` to regenerate future `Block[]` (respect `Config.block_duration_clamp` and cycle windows)
  - Inputs: `MonthlyFeedback`, `PerformanceData`, `TopicConfidenceMap`
  - Output: Updated `StudyPlan` with adjusted cycles and blocks; changelog explaining what changed and why

5) Resource Curator & Budget Optimizer
- Where: at block construction and rebalancing
- What: Suggest resources per subject/topic that match task type, difficulty, and budget
- How:
  - Use `ResourceService.getResourcesForSubject/Topic` and `searchResources`
  - Heuristics: prefer free/NCERT for C1; avoid duplicates across blocks; cap total cost per cycle; offer “lite” pack
- Output: Updated `Block.block_resources` + rationale

6) Micro-Scheduler (Daily/Weekly Assistant)
- Where: `WeeklyScheduleService` and `CalendarPDFService` generation step
- What: Convert block-level tasks to daily, time-slotted recommendations that fit daily hour caps and habits
- How:
  - Infer time-of-day slots per subject (see `getTimeSlotForSubject` in `CalendarPDFService.ts`)
  - Fill gaps with practice/revision as per cycle ratios; ensure rest buffers
  - Provide export to Word/PDF and a short “today’s plan” message for chat surfaces

7) Telegram Study Assistant (RAG-powered)
- Where: `TelegramBot.ts`
- What: Answer “What’s my plan this week?”, “What should I study today?”, “Explain [topic]”, and “Quiz me”
- How:
  - Retrieval from the curated resource index + current `StudyPlan`
  - Strict guardrails to avoid off-syllabus hallucinations; cite sources when explaining
  - Commands: `/today`, `/week`, `/resources <subject>`, `/explain <topic>`, `/quiz <topic>`

8) Scenario Simulator
- Where: UI control in preview, faculty dashboard
- What: “What if I start next month?”, “What if I add 10h/week?”, “What if optional-first?”
- How:
  - Re-run `scheduler` and `generateInitialPlan` with altered parameters; show diffs and trade-offs

9) Faculty Review Copilot
- Where: `faculty-ui`
- What: Pre-triage of plan issues and suggested fixes to accelerate approvals and feedback
- How:
  - Surfaces the same rule-based checks; adds templated comments; one-click apply for fixes (e.g., split oversized block, add missing revision)

---

### Minimal viable roadmap (phased)

- M0 (Deterministic safety net)
  - Implement rule-based `validatePlan` and `reviewPlan`
  - Wire rebalancing skeleton with no-LLM heuristics (respect `MonthlyFeedback` and deadlines)
  - Add exportable change logs for transparency

- M1 (Guidance & chat surfaces)
  - Intake Coach suggestions in onboarding
  - Telegram assistant for “today/this week” based on current plan
  - Add RAG index over curated resources (IDs from `ResourceService`)

- M2 (Adaptive planning)
  - Complete `rebalanceStudyPlan` with topic-based planner
  - Budget-aware resource curation during rebalances
  - Micro-scheduler fills daily time slots

- M3 (Quality & explainability)
  - LLM explanations for review findings and proposed fixes
  - Scenario Simulator UI with compare/diff and KPIs

---

### Data contracts and small type extensions

- Extend `MonthlyFeedback` and `PerformanceData` to carry:
  - `missedTasks: string[]`, `blockedBy: string[]`, `actualWeeklyHours: number`
  - `perTopic: { topicCode: string; progress: number; quality: number }[]`
- Add `ChangeLogEntry` on plan:
  - `{ timestamp, actor: 'agent'|'faculty'|'student', changeType, affectedIds: string[], summary }`
- Ensure `Task.taskType` and `Task.topicCode` are set consistently for downstream agents

---

### Guardrails, evaluation, and metrics

- Guardrails
  - Never change past blocks; only future blocks
  - Respect `daily_hour_limits` and cycle-specific task ratios
  - For chat Q&A, cite resources; avoid factual claims without sources
- Metrics
  - Plan adherence week-over-week; time-over-cap violations; % tasks completed
  - Faculty review time to approve; number of plan iterations per student
  - Student satisfaction with daily guidance (quick thumbs-up/down)
- Offline eval
  - Synthetic cohorts: run M0–M2 and measure violations and plan quality deltas

---

### Implementation notes mapped to code

- Fill TODOs in `helios-ts/src/engine/Engine.ts` for `reviewPlan`, `validatePlan`, `rebalanceStudyPlan`
- Keep `onboarding-ui/src/services/heliosService.ts` as the single entry to `generateInitialPlan`; add an agent wrapper that prepares tuned `archetype` and `config`
- Use `ResourceService` for all content suggestions; add a retrieval index for chat features over the same corpus
- Enhance `WeeklyScheduleService` generation by expanding `convertBlockTasksToWeeklyTasks` with better per-day allocation and time slots
- Upgrade `TelegramBot.ts` from stub to intent router + RAG; integrate with plan APIs and resource search

---

### Suggested endpoints (helios-server, high level)

- POST `/agent/review-plan` → returns `PlanReviewResult`
- POST `/agent/rebalance-plan` → returns updated `StudyPlan` + `changeLog`
- POST `/agent/scenario` → runs a what-if scenario and returns plan diff
- GET `/agent/today` → today’s tasks for a user (for chat surfaces)

These endpoints wrap existing `helios-ts` calls and keep the UI simple.

---

### Out of scope (now)
- Training bespoke ML models; current needs are best met with rules + retrieval + LLM function-calling
- Full proctoring or exam scoring

