# Docker Deployment Test Script

## Overview

This test script verifies that the Docker deployment is working correctly by testing:

1. **Frontend Service** - Onboarding app page is correctly served on port 3000
2. **API Proxy** - Backend API is accessible through the frontend nginx proxy
3. **Student Creation** - The new student creation endpoint works end-to-end

## Architecture

The deployment consists of:
- **Frontend (nginx)**: Runs on port 3000, serves static files and proxies API requests
- **Backend (FastAPI)**: Runs on port 8000, handles API requests
- **API Routes**: `/api/studyplanner/onboarding/students` for student creation

## Usage

### Basic Usage

```bash
# Test local deployment (default: localhost:3000)
node test_docker_deployment.js

# Test with custom host and port
node test_docker_deployment.js localhost 3000

# Test production deployment
node test_docker_deployment.js production.example.com 80
```

### Make it executable (Unix/Linux/Mac)

```bash
chmod +x test_docker_deployment.js
./test_docker_deployment.js
```

## Test Cases

### 1. Nginx Health Endpoint
- **Endpoint**: `GET /health`
- **Expected**: Status 200, body contains "healthy"
- **Purpose**: Verify nginx is running and responding

### 2. Root Path Serves Onboarding
- **Endpoint**: `GET /`
- **Expected**: Status 200, HTML content
- **Purpose**: Verify default route serves the app

### 3. Onboarding Page is Served
- **Endpoint**: `GET /onboarding`
- **Expected**: Status 200, valid HTML with app structure
- **Purpose**: Verify the onboarding app page is correctly served

### 4. Backend API Accessible
- **Endpoint**: `POST /api/studyplanner/onboarding/students`
- **Expected**: Not 503 (backend available)
- **Purpose**: Verify nginx proxy to backend is working

### 5. Student Creation API Works
- **Endpoint**: `POST /api/studyplanner/onboarding/students`
- **Payload**: Sample student data
- **Expected**: Status 200, response with `student_id` and `created: true`
- **Purpose**: Verify end-to-end student creation workflow

## Sample Student Data

The test uses the following sample data structure (matches `BackgroundInput` schema):

```json
{
  "name": "Test Student",
  "phone": "+1234567890",
  "email": "test.student@example.com",
  "city": "Test City",
  "state": "Test State",
  "graduation_stream": "Computer Science",
  "college": "Test University",
  "graduation_year": 2024,
  "about": "Test student for deployment verification"
}
```

## Expected Output

### Success (All Tests Pass)

```
Docker Deployment Test Suite
Testing deployment at: http://localhost:3000

Running: Nginx health endpoint
✓ PASS Nginx health endpoint
  → Nginx health check passed

Running: Root path serves onboarding app
✓ PASS Root path serves onboarding app
  → Root path accessible

Running: Onboarding page is served on frontend port
✓ PASS Onboarding page is served on frontend port
  → Page served successfully (12345 bytes)

Running: Backend API accessible via frontend proxy
✓ PASS Backend API accessible via frontend proxy
  → Backend responding via proxy (status: 200)

Running: Student creation API via frontend proxy
✓ PASS Student creation API via frontend proxy
  → Student created successfully with ID: 3a2b7c2d-9f9e-4b1d-8a1e-5e4b7f9f2c3a

============================================================
Test Summary
============================================================
Passed: 5
Failed: 0
Total:  5
============================================================

All tests passed! ✓
```

### Failure Example

```
Docker Deployment Test Suite
Testing deployment at: http://localhost:3000

Running: Nginx health endpoint
✗ FAIL Nginx health endpoint
  → Request failed: connect ECONNREFUSED 127.0.0.1:3000

============================================================
Test Summary
============================================================
Passed: 0
Failed: 1
Total:  1
============================================================

Some tests failed!

Failed tests:
  ✗ Nginx health endpoint
    Request failed: connect ECONNREFUSED 127.0.0.1:3000
```

## Exit Codes

- **0**: All tests passed
- **1**: One or more tests failed

## Troubleshooting

### Connection Refused

```
Error: connect ECONNREFUSED
```

**Solution**: Ensure Docker containers are running:
```bash
docker-compose ps
docker-compose up -d
```

### 503 Service Unavailable

```
Error: Backend service unavailable (503)
```

**Solution**: Check if the backend container is healthy:
```bash
docker-compose logs app
docker-compose restart app
```

### Timeout Errors

```
Error: Request timeout
```

**Solution**: Backend might be slow to start. Wait a few moments and retry:
```bash
# Check container status
docker-compose ps

# Check logs for startup issues
docker-compose logs -f app
```

### Invalid Response Format

```
Error: Response missing student_id
```

**Solution**: Check backend logs for errors:
```bash
docker-compose logs app | tail -50
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Run deployment tests
  run: |
    node test_docker_deployment.js localhost 3000
```

### GitLab CI Example

```yaml
test:
  script:
    - docker-compose up -d
    - sleep 10  # Wait for services to start
    - node test_docker_deployment.js localhost 3000
```

## Related Files

- **Backend Routes**: `src/modules/studyplanner/onboarding/routes.py`
- **Backend Schemas**: `src/modules/studyplanner/onboarding/schemas.py`
- **Frontend Config**: `nginx.conf`
- **Docker Compose**: `docker-compose.yml`
- **Old Onboarding UI**: `study-planner/onboarding-ui-v1-deprecated/`

## Development

To modify or extend the tests:

1. Open `test_docker_deployment.js`
2. Add new test functions following the pattern:
   ```javascript
   async function testNewFeature() {
     const testName = 'Description of test';
     console.log(`\n${colors.bright}Running: ${testName}${colors.reset}`);
     
     try {
       // Your test logic here
       logTest(testName, true, 'Success message');
       return true;
     } catch (error) {
       logTest(testName, false, error.message);
       return false;
     }
   }
   ```
3. Call the new test in the `runTests()` function

## Requirements

- Node.js (any recent version with built-in `http` and `https` modules)
- Access to the deployment (network connectivity)
- Docker containers running (for local testing)
