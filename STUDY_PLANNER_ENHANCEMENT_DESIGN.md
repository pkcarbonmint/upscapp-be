# Study Planner Enhancement Design Document

## Overview

This document outlines the design for enhancing the UPSC study planner application with student ID management, referral system, plan editor, faculty review workflow, and returning user authentication.

## Current Architecture

```
Frontend (nginx:3000) 
    ↓ /api/* requests
Python Backend (FastAPI:8000)
    ↓ HTTP requests  
Haskell Helios Engine (8080) [Plan Generation & Validation]
    ↓ plan data
Python Backend (FastAPI:8000)
    ↓ data storage
PostgreSQL Database (5432)
```

**Current Flow**: Student onboarding wizard → Python backend → Helios engine (plan generation & validation) → Python backend (plan storage) → Database

## Design Decisions

### 1. Faculty App Architecture
- **Decision**: Separate React frontend app (`faculty-ui/`) alongside existing `onboarding-ui/`
- **Rationale**: Clean separation of concerns, different UI/UX requirements, easier maintenance

### 2. Student ID Format
- **Decision**: 6-character hex format (e.g., `A1B2C3`)
- **Rationale**: Short, shareable, 16M+ unique IDs, no confusing characters

### 3. Plan Editor
- **Decision**: Reusable library with simple drag-and-drop interface
- **Rationale**: Can be used by both faculty and future student self-editing features

### 4. Authentication
- **Decision**: Separate email/password system for faculty
- **Rationale**: Clean separation from student phone-based auth

### 5. Plan States
- **Decision**: Simple progression: `draft` → `review` → `approved` → `published`
- **Rationale**: Clear workflow, easy to understand and implement

### 6. Returning Users
- **Decision**: Phone + OTP login with plan status display
- **Rationale**: Consistent with existing auth, reliable for students

### 7. Referral System
- **Decision**: Student ID based referral codes
- **Rationale**: Simple implementation, leverages existing infrastructure

### 8. Approval Workflow
- **Decision**: Single faculty member approval
- **Rationale**: Simple, fast, clear accountability

## API Structure

All new endpoints will be created under `/studyplanner` prefix, maintaining existing API structure:

```
/api/studyplanner/
├── /student/          # Student-facing endpoints
├── /faculty/          # Faculty-facing endpoints
├── /auth/            # Authentication (both student and faculty)
├── /referral/        # Referral management
└── /plans/           # Plan management
```

## Database Schema Changes

### New Tables

```sql
-- Referral tracking
CREATE TABLE referrals (
    id SERIAL PRIMARY KEY,
    referrer_student_id VARCHAR(8) NOT NULL,
    referred_student_id INTEGER REFERENCES users(id),
    referral_code VARCHAR(8) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Plan editor sessions (for draft saving)
CREATE TABLE plan_editor_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    plan_id INTEGER REFERENCES studyplans(id),
    session_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Extended Tables

```sql
-- Add student ID to users
ALTER TABLE users ADD COLUMN student_id VARCHAR(8) UNIQUE;

-- Extend studyplans for approval workflow
ALTER TABLE studyplans ADD COLUMN student_id VARCHAR(8);
ALTER TABLE studyplans ADD COLUMN approval_status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE studyplans ADD COLUMN approved_by INTEGER REFERENCES users(id);
ALTER TABLE studyplans ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE studyplans ADD COLUMN review_notes TEXT;

-- Add faculty role to users
ALTER TABLE users ADD COLUMN is_faculty BOOLEAN DEFAULT FALSE;
```

## Component Architecture

### 1. Student ID System

**Location**: `src/utils/student_id.py` (utility function)

```python
# utils/student_id.py
def generate_student_id(user_id: int) -> str:
    """Generate 6-character hex student ID from user ID"""
    # Implementation details...

def validate_student_id(student_id: str) -> bool:
    """Validate student ID format"""
    # Implementation details...
```

**Integration**: Student ID is automatically generated when user records are created during onboarding

### 2. Referral System

**Location**: `src/modules/referral/`

```python
# referral/service.py
class ReferralService:
    async def create_referral_link(self, student_id: str) -> str:
        """Create referral link with student ID"""
    
    async def process_referral(self, referral_code: str, new_user_id: int):
        """Process incoming referral"""
    
    async def get_referral_stats(self, student_id: str) -> dict:
        """Get referral statistics"""
```

**API Endpoints**:
- `POST /api/studyplanner/referral/create` - Create referral link
- `POST /api/studyplanner/referral/process` - Process referral
- `GET /api/studyplanner/referral/stats/{student_id}` - Get referral stats

### 3. Plan Editor Library

**Location**: `src/modules/plan_editor/` (Backend) + `plan-editor-library/` (Frontend)

#### Backend Components

```python
# plan_editor/schemas.py
class PlanEditorData(BaseModel):
    cycles: List[StudyCycle]
    blocks: List[StudyBlock]
    weeks: List[WeeklyPlan]
    tasks: List[PlanTask]

class PlanEditorSession(BaseModel):
    session_id: str
    plan_data: PlanEditorData
    last_saved: datetime
```

#### Frontend Library Structure

```
plan-editor-library/
├── src/
│   ├── components/
│   │   ├── CycleEditor.tsx
│   │   ├── BlockEditor.tsx
│   │   ├── WeekEditor.tsx
│   │   └── TaskEditor.tsx
│   ├── hooks/
│   │   ├── usePlanEditor.ts
│   │   └── useDragDrop.ts
│   ├── types/
│   │   └── editor.ts
│   └── utils/
│       └── validation.ts
├── package.json
└── README.md
```

**API Endpoints**:
- `POST /api/studyplanner/plans/editor/save` - Save draft plan
- `GET /api/studyplanner/plans/editor/{session_id}` - Load draft plan
- `POST /api/studyplanner/plans/editor/validate` - Validate plan structure

### 4. Faculty App

**Location**: `faculty-ui/` (separate React app)

#### App Structure

```
faculty-ui/
├── src/
│   ├── components/
│   │   ├── PlanReviewList.tsx
│   │   ├── PlanEditor.tsx
│   │   ├── ApprovalWorkflow.tsx
│   │   └── StudentLookup.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── PlanReview.tsx
│   │   └── StudentManagement.tsx
│   ├── hooks/
│   │   └── useFacultyAuth.ts
│   └── services/
│       └── facultyApi.ts
├── package.json
└── vite.config.ts
```

**API Endpoints**:
- `GET /api/studyplanner/faculty/plans/review` - Get plans for review
- `PUT /api/studyplanner/faculty/plans/{plan_id}/approve` - Approve plan
- `PUT /api/studyplanner/faculty/plans/{plan_id}/reject` - Reject plan
- `GET /api/studyplanner/faculty/students/{student_id}` - Get student details

### 5. Plan Review Workflow

**Location**: `src/modules/plan_review/`

```python
# plan_review/service.py
class PlanReviewService:
    async def submit_for_review(self, plan_id: int, student_id: str):
        """Submit plan for faculty review"""
    
    async def approve_plan(self, plan_id: int, faculty_id: int, notes: str = None):
        """Approve plan by faculty"""
    
    async def reject_plan(self, plan_id: int, faculty_id: int, reason: str):
        """Reject plan with reason"""
    
    async def get_review_queue(self, faculty_id: int) -> List[StudyPlan]:
        """Get plans pending review"""
```

**API Endpoints**:
- `POST /api/studyplanner/plans/{plan_id}/submit-review` - Submit for review
- `PUT /api/studyplanner/plans/{plan_id}/approve` - Approve plan
- `PUT /api/studyplanner/plans/{plan_id}/reject` - Reject plan
- `GET /api/studyplanner/plans/review-queue` - Get review queue

### 6. Returning User Authentication

**Location**: `src/modules/returning_auth/`

```python
# returning_auth/service.py
class ReturningAuthService:
    async def send_otp(self, phone_number: str) -> str:
        """Send OTP to returning user"""
    
    async def verify_otp(self, phone_number: str, otp: str) -> dict:
        """Verify OTP and return user status"""
    
    async def get_plan_status(self, user_id: int) -> dict:
        """Get user's plan status"""
```

**API Endpoints**:
- `POST /api/studyplanner/auth/returning/send-otp` - Send OTP
- `POST /api/studyplanner/auth/returning/verify-otp` - Verify OTP
- `GET /api/studyplanner/auth/returning/plan-status` - Get plan status

### 7. Email Notifications

**Location**: `src/modules/notifications/`

```python
# notifications/service.py
class NotificationService:
    async def send_plan_approved_email(self, user_id: int, plan_id: int):
        """Send plan approval notification"""
    
    async def send_plan_rejected_email(self, user_id: int, plan_id: int, reason: str):
        """Send plan rejection notification"""
    
    async def send_referral_welcome_email(self, user_id: int, referrer_id: str):
        """Send referral welcome email"""
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [x] Implement student ID generation system
- [x] Create referral tracking system
- [x] Set up database schema changes
- [x] Create basic API endpoints

### Phase 2: Plan Editor Library (Week 3-4)
- [x] Build reusable plan editor library
- [x] Implement drag-and-drop functionality
- [x] Create validation system
- [x] Add session management for drafts

### Phase 3: Faculty App (Week 5-6)
- [x] Create separate faculty React app
- [x] Implement faculty authentication
- [x] Build plan review interface
- [x] Add approval workflow

### Phase 4: Integration & Testing (Week 7-8)
- [ ] Integrate plan editor with faculty app
- [ ] Implement returning user authentication
- [ ] Set up email notifications
- [ ] End-to-end testing

## Security Considerations

### Authentication & Authorization
- Faculty authentication separate from student auth
- Role-based access control for faculty features
- JWT tokens with appropriate expiration
- Rate limiting on OTP endpoints

### Data Protection
- Student IDs are not sequential (prevent enumeration)
- Referral codes are time-limited
- Plan editor sessions expire after inactivity
- Audit logging for plan approvals

## Performance Considerations

### Database Optimization
- Indexes on student_id, referral_code, approval_status
- Efficient queries for review queue
- Connection pooling for high concurrency

### Frontend Optimization
- Lazy loading for plan editor components
- Debounced auto-save for draft plans
- Optimistic updates for better UX

## Monitoring & Analytics

### Key Metrics
- Student ID generation rate
- Referral conversion rate
- Plan approval time
- Faculty app usage patterns

### Logging
- Plan submission events
- Approval/rejection events
- Referral tracking
- Authentication events

## Testing Strategy

### Unit Tests
- Student ID generation and validation
- Referral system logic
- Plan editor validation
- Authentication flows

### Integration Tests
- End-to-end plan creation and approval
- Referral flow testing
- Faculty app workflows
- Email notification delivery

### User Acceptance Testing
- Faculty usability testing
- Student onboarding flow
- Returning user experience
- Mobile responsiveness

## Deployment Considerations

### Environment Setup
- Separate faculty app deployment
- Plan editor library as npm package
- Database migration scripts
- Environment-specific configurations

### Rollout Strategy
- Feature flags for gradual rollout
- A/B testing for new features
- Monitoring and rollback procedures
- User training and documentation

## Future Enhancements

### Phase 2 Features
- Student self-editing capabilities
- Advanced plan analytics
- Multi-faculty review system
- Mobile app integration

### Scalability
- Microservices architecture consideration
- Caching strategies
- CDN for static assets
- Database sharding if needed

---

## TODO List for Implementation Tracking

### Phase 1: Foundation ✅ COMPLETED
- [x] **Student ID System**
  - [x] Create `src/utils/student_id.py` utility functions
  - [x] Implement hex ID generation algorithm
  - [x] Add database migration for student_id column
  - [x] Integrate ID generation into user creation process
  - [x] Add validation and uniqueness checks

- [x] **Referral System**
  - [x] Create `src/modules/referral/` module
  - [x] Implement referral tracking logic
  - [x] Create referrals table migration
  - [x] Build referral link generation
  - [x] Add referral processing endpoints

- [x] **Database Schema**
  - [x] Create all new table migrations
  - [x] Add foreign key constraints
  - [x] Create necessary indexes
  - [x] Test migration scripts

### Phase 2: Plan Editor Library ✅ COMPLETED
- [x] **Backend Plan Editor**
  - [x] Create `src/modules/plan_editor/` module
  - [x] Implement session management
  - [x] Add plan validation logic
  - [x] Create draft save/load endpoints

- [x] **Frontend Plan Editor Library**
  - [x] Create `plan-editor-library/` package
  - [x] Implement drag-and-drop components
  - [x] Add cycle-block-week-task structure
  - [x] Create validation utilities
  - [x] Build TypeScript types
  - [x] Add comprehensive documentation

### Phase 3: Faculty App ✅ COMPLETED
- [x] **Faculty Authentication**
  - [x] Create faculty login system
  - [x] Implement role-based access control
  - [x] Add faculty user management

- [x] **Faculty React App**
  - [x] Create `faculty-ui/` directory structure
  - [x] Implement faculty dashboard
  - [x] Build plan review interface
  - [x] Add student lookup functionality
  - [x] Create approval workflow UI

- [x] **Plan Review System**
  - [x] Create `src/modules/plan_review/` module
  - [x] Implement approval workflow logic
  - [x] Add review queue management
  - [x] Create approval/rejection endpoints

### Phase 4: Integration & Polish
- [ ] **Returning User Auth**
  - [ ] Create `src/modules/returning_auth/` module
  - [ ] Implement phone + OTP flow
  - [ ] Add plan status display
  - [ ] Create returning user endpoints

- [ ] **Email Notifications**
  - [ ] Create `src/modules/notifications/` module
  - [ ] Implement email templates
  - [ ] Add notification triggers
  - [ ] Test email delivery

- [ ] **Testing & Documentation**
  - [ ] Write comprehensive unit tests
  - [ ] Create integration tests
  - [ ] Add API documentation
  - [ ] Create user guides
  - [ ] Performance testing

### Phase 5: Deployment & Monitoring
- [ ] **Deployment Setup**
  - [ ] Configure faculty app deployment
  - [ ] Set up plan editor library distribution
  - [ ] Create production environment configs
  - [ ] Database migration to production

- [ ] **Monitoring & Analytics**
  - [ ] Set up application monitoring
  - [ ] Add key metrics tracking
  - [ ] Create dashboards
  - [ ] Set up alerting

---

*This design document will be updated as implementation progresses and requirements evolve.*
