# Docker Integration Setup

This document describes the integrated Docker setup for the UPSC application that includes:

1. **Frontend Wizard** (nginx) - Port 3000
2. **Python FastAPI Backend** - Port 8000  
3. **Haskell Helios Engine** - Port 8080
4. **PostgreSQL Database** - Port 5432
5. **Redis Cache** - Port 6379
6. **Celery Worker & Flower** - Port 5555

## Architecture

```
Frontend (nginx:3000) 
    ↓ /api/* requests
Python Backend (FastAPI:8000)
    ↓ HTTP requests  
Haskell Helios Engine (8080)
    ↓ data storage
PostgreSQL Database (5432)
```

## Quick Start

1. **Build and start all services:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   - Frontend Wizard: http://localhost:3000
   - Python API: http://localhost:8000
   - Haskell Engine: http://localhost:8080
   - Flower (Celery monitoring): http://localhost:5555

## Service Details

### Frontend (nginx)
- Serves static HTML/React wizard from `mentora-ui/`
- Proxies `/api/*` requests to Python backend
- Health check: `GET /health`

### Python Backend (FastAPI)
- Main application API
- Connects to Haskell engine via HTTP
- Database migrations run automatically
- Health check: `GET /healthcheck`

### Haskell Helios Engine
- Study plan generation engine
- Endpoints:
  - `GET /health` - Health check
  - `GET /status` - Status check
  - `POST /plan/generate` - Generate study plan
  - `POST /plan/review` - Review study plan

### Database (PostgreSQL)
- Persistent data storage
- Auto-initialized with user `app/app`
- Data persisted in Docker volume `app_pg_data`

## Environment Configuration

Environment variables are configured in `docker.env`:

- `DATABASE_URL` - PostgreSQL connection
- `HELIOS_SERVER_URL` - Haskell engine URL
- `REDIS_URL` - Redis connection
- `CORS_ORIGINS` - Allowed frontend origins

## Development Workflow

1. **View logs:**
   ```bash
   docker-compose logs -f [service_name]
   ```

2. **Rebuild specific service:**
   ```bash
   docker-compose up --build [service_name]
   ```

3. **Stop all services:**
   ```bash
   docker-compose down
   ```

4. **Reset database:**
   ```bash
   docker-compose down -v
   docker-compose up --build
   ```

## Service Dependencies

Services start in this order:
1. Database & Redis (independent)
2. Haskell Engine (waits for health check)
3. Python Backend (waits for DB + Haskell health)
4. Frontend (waits for Python backend)
5. Celery services (wait for Python backend + Redis)

## Troubleshooting

- **Haskell build fails**: Ensure sufficient memory (4GB+) for GHC compilation
- **Database connection fails**: Check if PostgreSQL is healthy: `docker-compose ps`
- **Frontend can't reach API**: Verify nginx proxy configuration in `nginx-frontend.conf`
- **Helios engine timeout**: Increase `HELIOS_SERVER_TIMEOUT` in `docker.env`

## Integration Flow

1. User fills wizard form in frontend (port 3000)
2. Frontend sends data to `/api/v2/helios/plan/generate-from-wizard`
3. Python backend transforms data and calls Haskell engine
4. Haskell engine generates study plan and returns to Python
5. Python backend stores plan in database and returns to frontend
