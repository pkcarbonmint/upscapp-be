# Helios Integration – TODO

## Pending Features

- Persisted Monthly Rebalancing
  - Implement the rebalancing endpoint to actually update `StudyPlan`/`PlanTask` data (extend block, redistribute pending tasks, adjust dates/hours).
  - Return a detailed `ChangeSummary` after DB updates.

- Real Test Creation & Linking
  - Create mentor-created weekly test artifacts via the tests module.
  - Link student “Take Weekly Test” tasks to created tests (`test_id`).
  - Optionally auto-construct tests from weekly topics (size/distribution rules).

- Subject Mapping Robustness
  - Replace heuristic macro-subject → CMS subject name matching with explicit IDs in metadata or product context.
  - Maintain a lookup table per program/product to ensure accurate topic fetching.

- Engine vs Backend Responsibility
  - Optionally move multi-week scheduling and weekly envelope/test tasks generation into the core engine (`src/helios`) for full portability.
  - Alternatively, keep in backend with policy toggles (env/flags) and document the split.

## Enhancements & Integrations

- Topic Slicing Policy
  - Switch from equal slices to weighted by baseline hours or mentor overrides.
  - Allow manual weekly topic curation.

- Plan Versions & Audit
  - On rebalancing, create new plan versions; keep history of changes.
  - Emit event logs for all automatic adjustments.

- Configurability
  - Make weekly envelope timings configurable (e.g., Fri test creation, Sat catch-up, Sun reviews/tests) per product/branch.
  - Allow RRPT ratio overrides per student/mentor.

- Validation & Safeguards
  - Ensure weekly topic selection respects question availability (via CMS counts) and fallback logic.
  - Add guards for missing CMS mappings and provide UI/admin prompts.

## Developer Notes

- Endpoints
  - `POST /v2/helios/plan/generate` – mapped intake → plan + weekly tasks for entire Block 1
  - `POST /v2/helios/plan/generate-from-wizard` – raw wizard payload → backend adapts → same persistence
  - `POST /v2/helios/plan/{studyplan_id}/rebalance` – placeholder; needs DB persistence

- Files of Interest
  - Core engine: `src/helios/engine.py` (docstrings describe sequencing, blocks, week 1 RRPT)
  - Backend integration: `src/modules/helios/service.py` (weekly RRPT replication, envelope tasks, CMS topic fetch/split)
  - CMS helpers: `src/external/cms/service.py`
