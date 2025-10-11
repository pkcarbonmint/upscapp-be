# Helios Integration (Backend)

Bridges the pure Helios engine to upscapp-be. Generates StudyPlans and persists first-block tasks (RRPT + weekly envelope).

## Endpoints

- POST `/v2/helios/plan/generate` → creates StudyPlan + RRPT tasks for every week in block 1, plus weekly envelope tasks (catch-up, mentor review, student self-review, mentor create test, student take test)
- POST `/v2/helios/plan/generate-from-wizard` → accepts the raw wizard payload; backend adapts it to engine intake and performs the same persistence
- POST `/v2/helios/plan/{studyplan_id}/rebalance` → placeholder (future)

## What gets created weekly (Block 1)

- Daily RRPT tasks (Study/Revision/Practice) with per-day minutes (Mon–Sat)
- Catch-up Day (Sat)
- Weekly Review (Mentor) + Weekly Self-Review (Student) (Sun)
- Weekly Test task (Sun)

Topics for the weekly test are fetched via CMS: the service resolves block subjects to CMS subject IDs, fetches topic lists per subject, splits evenly across weeks, and attaches weekly topic IDs to test tasks. Practice and Test tasks include links formatted as `<practice_server_url>/<subject>/<topic>/practice` and `<test_server_url>/<subject>/<topic>/test`.

## Files

- `schemas.py` — request/response contracts
- `service.py` — runs engine, resolves CMS subjects/topics, and persists tasks
- `routes.py` — FastAPI router

## Wire

Add in `src/main.py`:

```python
from src.modules.helios.routes import router as helios_router
app.include_router(helios_router, prefix="/v2")
```
