# Production Deployment Guide - Helios Integration

This guide covers deploying the UPSC application with HTTP-based Helios integration in production.

## Architecture Overview

```
Internet → Nginx → Python FastAPI App ↔ Haskell Helios Engine
                ↓
            Redis ← Celery Workers
```

### Services:
- **upscapp-backend**: Python FastAPI application
- **helios-engine**: Haskell Helios engine (HTTP server)
- **app_redis**: Redis for caching and task queue
- **celery_worker**: Background task processing
- **celery_flower**: Task monitoring dashboard
- **nginx**: Reverse proxy and load balancer

## Prerequisites

1. **Docker & Docker Compose**
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **Environment Configuration**
   ```bash
   # Create production environment file
   cp .env.example .env.prod
   ```

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Application
ENVIRONMENT=production
DEBUG=False
SECRET_KEY=your-super-secret-key-here
ALLOWED_HOSTS=your-domain.com,localhost

# Database (if using PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database

# Redis
REDIS_PASSWORD=your-redis-password
REDIS_URL=redis://:your-redis-password@app_redis:6379/0

# Celery
CELERY_BROKER_URL=redis://:your-redis-password@app_redis:6379/0
CELERY_RESULT_BACKEND=redis://:your-redis-password@app_redis:6379/0

# Flower monitoring
FLOWER_USER=admin
FLOWER_PASSWORD=your-flower-password

# Helios Integration
HELIOS_INTEGRATION_MODE=http
HELIOS_SERVER_URL=http://helios-engine:8080
HELIOS_SERVER_TIMEOUT=30

# Security
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com
```

## Deployment Steps

### 1. Clone and Prepare

```bash
# Clone repository
git clone <repository-url>
cd upscapp-be

# Set up environment
cp .env.example .env
# Edit .env with your production values
```

### 2. Build and Deploy

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d --build

# Check service status
docker-compose -f docker-compose.prod.yml ps
```

### 3. Verify Deployment

```bash
# Check application health
curl http://localhost:8000/health

# Check Helios engine
curl http://localhost:8080/health

# Check logs
docker-compose -f docker-compose.prod.yml logs -f app
docker-compose -f docker-compose.prod.yml logs -f helios-engine
```

## Service Configuration

### Python Application (Port 8000)

- **Health Check**: `GET /health`
- **API Documentation**: `GET /docs`
- **Helios Routes**: `POST /v2/helios/generate-plan`

### Haskell Helios Engine (Port 8080)

- **Health Check**: `GET /health`
- **Generate Plan**: `POST /generate-plan`
- **Review Plan**: `POST /review-plan`

### Monitoring

- **Flower Dashboard**: http://localhost:5555/flower/
- **Redis**: Port 6379 (password protected)

## SSL/HTTPS Setup

### 1. Obtain SSL Certificate

```bash
# Using Let's Encrypt
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
```

### 2. Update Nginx Configuration

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    # ... rest of configuration
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### 3. Mount SSL Certificates

```yaml
# In docker-compose.prod.yml
nginx:
  volumes:
    - /etc/letsencrypt/live/your-domain.com:/etc/nginx/ssl:ro
```

## Scaling

### Horizontal Scaling

```yaml
# Scale specific services
docker-compose -f docker-compose.prod.yml up -d --scale celery_worker=3
docker-compose -f docker-compose.prod.yml up -d --scale helios-engine=2
```

### Load Balancing

Update nginx.conf for multiple Helios instances:

```nginx
upstream helios {
    server helios-engine-1:8080;
    server helios-engine-2:8080;
    server helios-engine-3:8080;
}
```

## Monitoring & Logging

### Application Logs

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f app
docker-compose -f docker-compose.prod.yml logs -f helios-engine
docker-compose -f docker-compose.prod.yml logs -f celery_worker

# Export logs
docker-compose -f docker-compose.prod.yml logs app > app.log
```

### Health Checks

All services include health checks:
- **Interval**: 30s
- **Timeout**: 10s
- **Retries**: 3

### Metrics Collection

Consider adding:
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **ELK Stack**: Log aggregation

## Backup & Recovery

### Database Backup

```bash
# If using PostgreSQL
docker exec app_db pg_dump -U app app > backup.sql
```

### Redis Backup

```bash
# Redis data is persisted in volume
docker-compose -f docker-compose.prod.yml exec app_redis redis-cli BGSAVE
```

### Application Data

```bash
# Backup volumes
docker run --rm -v upscapp-be_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis_backup.tar.gz /data
```

## Troubleshooting

### Common Issues

1. **Service Won't Start**
   ```bash
   # Check logs
   docker-compose -f docker-compose.prod.yml logs service-name
   
   # Check resource usage
   docker stats
   ```

2. **Helios Engine Connection Issues**
   ```bash
   # Test connectivity
   docker-compose -f docker-compose.prod.yml exec app curl http://helios-engine:8080/health
   
   # Check network
   docker network ls
   docker network inspect upscpro-be
   ```

3. **Memory Issues**
   ```bash
   # Add memory limits to docker-compose.prod.yml
   services:
     helios-engine:
       deploy:
         resources:
           limits:
             memory: 2G
           reservations:
             memory: 1G
   ```

### Performance Tuning

1. **Haskell Engine**
   - Increase RTS heap size: `+RTS -H1G -RTS`
   - Enable parallel GC: `+RTS -N4 -RTS`

2. **Python Application**
   - Use gunicorn with multiple workers
   - Enable connection pooling
   - Configure Redis connection pool

3. **Database**
   - Enable connection pooling
   - Optimize queries
   - Add appropriate indexes

## Security Considerations

1. **Network Security**
   - Use internal Docker networks
   - Expose only necessary ports
   - Configure firewall rules

2. **Application Security**
   - Use strong secrets
   - Enable CORS properly
   - Validate all inputs
   - Use HTTPS in production

3. **Container Security**
   - Use non-root users
   - Keep base images updated
   - Scan for vulnerabilities

## Maintenance

### Updates

```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Recreate services with new images
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

### Cleanup

```bash
# Remove unused containers and images
docker system prune -a

# Remove unused volumes (be careful!)
docker volume prune
```

## Support

For issues and questions:
1. Check service logs
2. Verify environment configuration
3. Test individual service health endpoints
4. Check network connectivity between services
5. Monitor resource usage (CPU, memory, disk)

## Quick Commands Reference

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Stop all services
docker-compose -f docker-compose.prod.yml down

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale celery_worker=3

# Restart specific service
docker-compose -f docker-compose.prod.yml restart app

# Execute command in container
docker-compose -f docker-compose.prod.yml exec app bash

# Check service status
docker-compose -f docker-compose.prod.yml ps
```
