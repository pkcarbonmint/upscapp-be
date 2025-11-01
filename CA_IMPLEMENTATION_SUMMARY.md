# Current Affairs Task Generation - Implementation Summary

## Overview
Successfully implemented current affairs (CA) task generation feature for the study planner backend. This feature allows automatic generation of daily CA reading tasks with configurable time allocations based on cycle types or custom minutes.

## Changes Made

### 1. Database Schema Updates

#### Model Changes (`src/modules/teaching/models.py`)
- Added `current_affairs_type` field (JSON) to `PlanTask` model
- Field structure: `{"type": "CAReading"}` to identify CA tasks

#### Migration (`alembic/versions/2025_11_01_1525-ca7430dc3f8e_add_current_affairs_type_to_plantasks.py`)
- Created migration to add `current_affairs_type` column to `plantasks` table
- Migration ID: `ca7430dc3f8e`
- Revision: `64ab663aad0f` ? `ca7430dc3f8e`

### 2. Schema Updates (`src/modules/teaching/schemas.py`)

#### Updated Schemas
- **PlanTaskBase**: Added `current_affairs_type: dict | None = None`
- **PlanTaskUpdate**: Added `current_affairs_type: dict | None = None`
- **PlanTaskWithUsersSchema**: Added `current_affairs_type: dict | None = None`

#### New Schema
- **GenerateCATasksRequest**: Request schema for CA task generation
  - `studyplan_id`: Target study plan
  - `start_date`: Start date for CA tasks
  - `end_date`: End date for CA tasks
  - `daily_ca_minutes`: Minutes per day (default: 30)
  - `cycle_type`: Optional cycle type (C2, C3, C4, C5, C6)
  - `exclude_weekdays`: List of weekdays to exclude (0=Monday, 6=Sunday)
  - `created_by_id` & `created_by`: Creator information

### 3. Service Methods (`src/modules/teaching/service.py`)

#### get_ca_minutes_for_cycle_type(cycle_type: str = None) -> int
Calculates CA minutes based on cycle type:
- **C2/C3**: 20 minutes
- **C4/C5**: 60 minutes
- **C6**: 30 minutes
- **Default**: 30 minutes
- **Other**: 0 minutes

#### generate_ca_tasks_for_studyplan(...) -> list[PlanTask]
Generates daily CA reading tasks for a study plan:
- Creates tasks for each day in date range
- Skips excluded weekdays (e.g., test days, catchup days)
- Auto-increments task sequence IDs
- Sets proper metadata (subject area, task type, etc.)
- Commits to database and returns created tasks

### 4. API Endpoint (`src/modules/teaching/routes.py`)

#### POST /studyplan/plantasks/generate-ca
Generates current affairs tasks for a study plan.

**Request Body:**
```json
{
  "studyplan_id": 123,
  "start_date": "2025-11-01",
  "end_date": "2025-11-30",
  "daily_ca_minutes": 30,
  "cycle_type": "C4",
  "exclude_weekdays": [5, 6],
  "created_by_id": 1,
  "created_by": {
    "id": 1,
    "name": "Admin User",
    "photo": "url"
  }
}
```

**Response:**
```json
{
  "data": [/* array of PlanTask objects */],
  "success": true,
  "meta": {
    "count": 20,
    "message": "Generated 20 current affairs tasks"
  }
}
```

**Features:**
- Cycle type overrides daily_ca_minutes if provided
- Logs task generation event for audit trail
- Protected by role-based access control (admin, branch_admin, teacher)
- Returns all created tasks with full details

## Usage Examples

### Example 1: Generate CA Tasks with Cycle Type
```python
POST /studyplan/plantasks/generate-ca
{
  "studyplan_id": 100,
  "start_date": "2025-11-01",
  "end_date": "2025-11-30",
  "cycle_type": "C4",  # Will use 60 minutes
  "exclude_weekdays": [6],  # Exclude Sundays
  "created_by_id": 1,
  "created_by": {"id": 1, "name": "Admin", "photo": null}
}
```

### Example 2: Generate CA Tasks with Custom Minutes
```python
POST /studyplan/plantasks/generate-ca
{
  "studyplan_id": 100,
  "start_date": "2025-11-01",
  "end_date": "2025-11-30",
  "daily_ca_minutes": 45,
  "exclude_weekdays": [5, 6],  # Exclude weekends
  "created_by_id": 1,
  "created_by": {"id": 1, "name": "Admin", "photo": null}
}
```

## Generated Task Structure

Each CA task has the following properties:
- **name**: "Current Affairs - Daily Reading"
- **task_type**: "READING"
- **subject_area**: "GS Current Affairs"
- **current_affairs_type**: {"type": "CAReading"}
- **planned_time**: Specified CA minutes
- **planned_completion_date**: Specific date (UTC timezone)
- **status**: "OPEN"
- **remarks**: "Auto-generated current affairs task"

## Testing

All functionality has been validated:
- ? CA minutes calculation for all cycle types
- ? Task generation with date range
- ? Weekday exclusion logic
- ? Task sequence ID incrementation
- ? Proper task structure and metadata
- ? No linter errors

## Migration Instructions

1. Run the migration to add the new database column:
   ```bash
   alembic upgrade head
   ```

2. The API endpoint is immediately available at:
   ```
   POST /studyplan/plantasks/generate-ca
   ```

3. Access is restricted to:
   - User types: workforce
   - Roles: org_admin, branch_admin, teacher
   - App: admin_app

## Notes

- The implementation adapts the original TypeScript plan to work with the Python backend
- CA tasks are standalone tasks tied to study plans (not cycles, as cycles don't exist in this backend)
- The `current_affairs_type` field allows easy filtering and identification of CA tasks
- Tasks can be queried using existing PlanTask endpoints
- Event logging is integrated for audit trail

## Files Modified

1. `src/modules/teaching/models.py` - Added current_affairs_type field
2. `src/modules/teaching/schemas.py` - Updated schemas and added GenerateCATasksRequest
3. `src/modules/teaching/service.py` - Added CA generation service methods
4. `src/modules/teaching/routes.py` - Added CA generation API endpoint
5. `alembic/versions/2025_11_01_1525-ca7430dc3f8e_add_current_affairs_type_to_plantasks.py` - New migration

## Next Steps

To use the feature:
1. Apply the database migration
2. Call the API endpoint to generate CA tasks for a study plan
3. CA tasks will appear alongside regular tasks in all task listing endpoints
4. Students will see CA tasks in their daily schedules with the `current_affairs_type` field
