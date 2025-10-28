# Development Setup Guide

This guide explains how to run the onboarding-ui in HMR (Hot Module Replacement) mode locally while connecting to a Python backend running in Docker.

## Architecture

```
Frontend (Vite HMR:5173) 
    ↓ /api/* requests (proxied)
Python Backend (FastAPI:8000) [Docker]
    ↓ HTTP requests  
Haskell Helios Engine (8080) [Docker]
    ↓ data storage
PostgreSQL Database (5432) [Docker]
```

## Quick Start

### 1. Setup Environment

```bash
cd onboarding-ui
npm run setup:dev
```

This creates a `.env.local` file with development settings.

### 2. Start Backend Services (Docker)

```bash
# From the onboarding-ui directory
npm run docker:backend

# OR from the project root
docker-compose up --build
```

This starts:
- PostgreSQL database (port 5432)
- Haskell Helios engine (port 8080) 
- Python FastAPI backend (port 8000)
- Redis cache (port 6379)

### 3. Start Frontend (HMR Mode)

```bash
cd onboarding-ui
npm run dev:hmr
```

The frontend will be available at: http://localhost:5173

## Development Workflow

### Backend Development
- Backend runs in Docker with `--reload` flag for auto-restart
- Code changes in `/src` are automatically reflected
- Database migrations run automatically on startup
- Logs: `docker-compose -f docker-compose.dev.yml logs -f app`

### Frontend Development  
- Vite provides instant HMR for React components
- API requests are proxied to `http://localhost:8000`
- Hot reload preserves component state when possible
- Console shows proxy request/response logs

### API Proxy Configuration

The Vite dev server proxies:
- `/api/*` → `http://localhost:8000/api/*`
- `/helios/*` → `http://localhost:8000/helios/*`

## Troubleshooting

### Backend Issues
```bash
# Check if services are running
docker-compose -f docker-compose.dev.yml ps

# View backend logs
docker-compose -f docker-compose.dev.yml logs -f app

# Restart backend only
docker-compose -f docker-compose.dev.yml restart app
```

### Frontend Issues
```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Check if port 5173 is available
lsof -i :5173

# Restart with verbose logging
npm run dev:hmr -- --debug
```

### Database Issues
```bash
# Reset database
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up --build
```

### Network Issues
- Ensure Docker Desktop is running
- Check firewall settings for ports 5173, 8000, 8080, 5432
- Verify CORS settings in backend (`CORS_ORIGINS` includes `http://localhost:5173`)

## Environment Variables

### Frontend (.env.local)
- `VITE_API_BASE_URL`: Backend API URL
- `VITE_HELIOS_BASE_URL`: Helios engine URL  
- `VITE_DEV_MODE`: Enable development features

### Backend (docker.env)
- `DATABASE_URL`: PostgreSQL connection
- `HELIOS_SERVER_URL`: Haskell engine URL
- `CORS_ORIGINS`: Allowed frontend origins

## Production vs Development

### Development Mode
- Frontend: Vite dev server with HMR
- Backend: Docker with `--reload` flag
- Database: Local Docker volume
- Hot reloading enabled

### Production Mode  
- Frontend: Built static files served by nginx
- Backend: Docker without reload
- Database: Persistent Docker volume
- Optimized builds

## Useful Commands

```bash
# Start everything
npm run docker:backend & npm run dev:hmr

# Stop backend services
docker-compose -f docker-compose.dev.yml down

# View all logs
docker-compose -f docker-compose.dev.yml logs -f

# Rebuild backend
docker-compose -f docker-compose.dev.yml up --build app

# Access database
docker exec -it app_db_dev psql -U app -d app
```
