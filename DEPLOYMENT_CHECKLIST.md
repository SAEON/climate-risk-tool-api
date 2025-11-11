# Production Deployment Checklist

## Pre-Deployment

### 1. Database Setup
- [ ] PostgreSQL 17+ installed with PostGIS 3.6+
- [ ] Database created: `climate_risk`
- [ ] PostGIS extension enabled
- [ ] Migrations run: `npm run migrate`
- [ ] Data loaded: `npm run etl:all` (run locally!)
- [ ] Database credentials secured
- [ ] Connection tested from app

### 2. Environment Configuration
- [ ] `.env` file created from `.env.example`
- [ ] `DB_HOST` set to production database
- [ ] `DB_USER` and `DB_PASSWORD` set (strong password!)
- [ ] `DB_NAME` set correctly
- [ ] `PORT` configured (default: 4002)
- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGIN` set to your domain (not `*`)

### 3. Security
- [ ] Database password is strong (16+ chars, mixed)
- [ ] `.env` file in `.gitignore` (never commit!)
- [ ] CORS restricted to your domain
- [ ] Firewall rules configured
- [ ] HTTPS enabled (reverse proxy)
- [ ] Database SSL enabled (optional but recommended)

### 4. Docker Image
- [ ] `package.json` updated (gdal-async in devDependencies)
- [ ] Dockerfile tested: `docker build -t climate-risk-api:latest .`
- [ ] Image size verified (~60MB)
- [ ] Health check working

## Deployment

### Local Testing First
```bash
# 1. Build production image
docker compose -f docker-compose.prod.yml build

# 2. Start locally
docker compose -f docker-compose.prod.yml up -d

# 3. Test health
curl http://localhost:4002/health

# 4. Test API
curl http://localhost:4002/api/municipalities | jq

# 5. Stop
docker compose -f docker-compose.prod.yml down
```

### Production Deployment

**Option A: Docker Compose on Server**
```bash
# 1. Copy files to server
scp .env docker-compose.prod.yml user@server:/path/
scp -r src package.json Dockerfile user@server:/path/

# 2. SSH to server
ssh user@server

# 3. Deploy
cd /path/to/app
docker compose -f docker-compose.prod.yml up -d --build

# 4. Verify
curl http://localhost:4002/health
docker compose -f docker-compose.prod.yml logs -f
```

**Option B: Cloud Platform (AWS/GCP/Azure)**
- [ ] Image pushed to container registry
- [ ] Service created with correct environment variables
- [ ] Health checks configured
- [ ] Load balancer set up (if needed)
- [ ] DNS configured

## Post-Deployment

### 1. Verification
- [ ] Health endpoint returns 200 OK
- [ ] API endpoints return data
- [ ] Database connection working
- [ ] Logs show no errors
- [ ] Response times acceptable (<500ms for GeoJSON)

### 2. Monitoring
- [ ] Container logs accessible
- [ ] Health checks passing
- [ ] CPU/Memory usage normal (<80%)
- [ ] Database connections stable

### 3. Documentation
- [ ] API URL documented
- [ ] Credentials stored securely
- [ ] Backup procedures documented
- [ ] Rollback plan ready

## Testing Commands

```bash
# Health check
curl https://your-domain.com/health

# List municipalities
curl https://your-domain.com/api/municipalities | jq '.count'

# Get climate index
curl https://your-domain.com/api/indices/cdd | jq

# GeoJSON endpoint
curl https://your-domain.com/api/climate-data/geojson/ssp245/near-term_2021-2040/cdd | jq '.features | length'

# Should return 213 municipalities
```

## Rollback Plan

If deployment fails:

```bash
# Option 1: Previous container
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d  # Uses cached image

# Option 2: Previous Git tag
git checkout v1.0.0
docker compose -f docker-compose.prod.yml up -d --build

# Option 3: Restore database backup
pg_restore -h localhost -U postgres -d climate_risk backup.sql
```

## Maintenance

### Regular Tasks
- [ ] Monitor logs: `docker compose -f docker-compose.prod.yml logs -f`
- [ ] Check disk space: `df -h`
- [ ] Database backups: Weekly
- [ ] Update dependencies: Monthly
- [ ] Security patches: As needed

### Backup Commands
```bash
# Database backup
pg_dump -h $DB_HOST -U $DB_USER -d climate_risk -F c -f backup_$(date +%Y%m%d).sql

# Restore from backup
pg_restore -h $DB_HOST -U $DB_USER -d climate_risk backup_20250110.sql
```

## Common Issues

### Container won't start
- Check logs: `docker compose logs climate-risk-tool`
- Verify .env file exists and is correct
- Check database is accessible
- Ensure port 4002 is not in use

### Database connection fails
- Verify database is running
- Check firewall rules
- Test connection: `psql -h $DB_HOST -U $DB_USER -d $DB_NAME`
- Verify credentials in .env

### High memory usage
- Check resource limits in docker-compose.prod.yml
- Monitor with: `docker stats climate-risk-tool-prod`
- Adjust limits if needed

### Slow responses
- Check database indexes
- Monitor connection pool
- Check network latency
- Consider caching layer (Redis)

## Success Criteria

Deployment is successful when:
- ✅ Health endpoint returns 200 OK
- ✅ All API endpoints return data
- ✅ Response times < 500ms for GeoJSON
- ✅ No errors in logs
- ✅ Container running stable for 24+ hours
- ✅ Database connections normal
- ✅ CPU < 80%, Memory < 80%

---

**Last Updated:** 2025-01-13
**Version:** 1.0.0
