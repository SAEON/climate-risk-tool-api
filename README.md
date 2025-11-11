# Climate Risk Tool API

A high-performance REST API for accessing South African municipality climate risk data, built with Node.js, Express, PostgreSQL, and PostGIS.

## 📊 What's Included

- **213 South African Municipalities** with spatial data
- **27 Climate Indices** (precipitation, temperature, duration)
- **4 SSP Climate Scenarios** (ssp126, ssp245, ssp370, ssp585)
- **3 Time Periods** (near-term, mid-term, long-term)
- **GeoJSON API** for mapping applications
- **Enhanced Metadata** with technical and plain-language descriptions

## 🚀 Quick Start

### Prerequisites

- **Node.js 22+** (LTS)
- **PostgreSQL 17+** with **PostGIS 3.6+** extension
- **Docker** (optional, for containerized deployment)

### Local Development

1. **Clone and Install**

```bash
git clone <repository-url>
cd climate-risk-tool-api
npm install
```

2. **Configure Environment**

```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. **Setup Database** (First time only)

```bash
# Run migrations
npm run migrate

# Load data (ETL scripts - run locally, not in Docker!)
npm run etl:municipalities   # Load 213 municipalities
npm run etl:climate          # Load climate data
npm run etl:indices          # Load climate indices metadata

# Or run all at once
npm run etl:all
```

4. **Start Development Server**

```bash
npm run dev
# Server running at http://localhost:4002
```

### Docker Deployment (Production)

1. **Build and Start**

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

2. **Verify Deployment**

```bash
curl http://localhost:4002/health
```

That's it! 🎉

## 📁 Project Structure

```
climate-risk-tool-api/
├── src/
│   ├── index.js              # Main server file
│   ├── config/
│   │   └── database.js       # PostgreSQL connection pool
│   ├── middleware/           # Custom middleware (if any)
│   ├── routes/
│   │   ├── municipalities.js # Municipality endpoints
│   │   ├── climate-data.js   # Climate data & GeoJSON
│   │   └── indices.js        # Climate indices metadata
│   └── services/             # Business logic
├── scripts/
│   ├── migrate.js            # Database migrations
│   └── etl/                  # ETL scripts (run locally!)
│       ├── load-municipalities.js
│       ├── load-climate-data.js
│       └── load-climate-indices.js
├── data/                     # Source data files (CSV, shapefiles)
├── docs/                     # API documentation
├── Dockerfile                # Production Docker image
├── docker-compose.yml        # Development with hot-reload
├── docker-compose.prod.yml   # Production deployment
└── .env.example              # Environment template
```

## 🔧 Configuration

### Environment Variables

Create `.env` file:

```env
# Server
NODE_ENV=production
PORT=4002

# Database (Required)
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=climate_risk
DB_USER=your_username
DB_PASSWORD=your_password

# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000

# CORS
CORS_ORIGIN=*  # Change to your domain in production
```

## 📡 API Endpoints

### Health & Info

```bash
GET  /health                    # Health check
GET  /                          # API information
```

### Municipalities

```bash
GET  /api/municipalities                      # List all (213)
GET  /api/municipalities/:id                  # Get by ID
GET  /api/municipalities/province/:province   # Filter by province
GET  /api/municipalities/district/:district   # Filter by district
GET  /api/municipalities/stats/summary        # Statistics
```

### Climate Data

```bash
GET  /api/climate-data                                          # Overview
GET  /api/climate-data/:municipalityId                          # By municipality
GET  /api/climate-data/:municipalityId/:scenario/:period        # Specific scenario
GET  /api/climate-data/geojson/:scenario/:period/:index         # GeoJSON for mapping
```

**Parameters:**
- `scenario`: `ssp126`, `ssp245`, `ssp370`, `ssp585`
- `period`: `near-term_2021-2040`, `mid-term_2041-2060`, `long-term_2061-2080`
- `index`: See climate indices below

### Climate Indices

```bash
GET  /api/indices                    # List all 27 indices
GET  /api/indices/:code              # Get specific index
GET  /api/indices/category/:category # Filter by category
GET  /api/indices/sectors            # Sector classifications
GET  /api/indices/color-schemes      # Color palette guide
```

### Climate Indices Available

**Precipitation** (12):
`cdd`, `cwd`, `prcptot`, `r10mm`, `r20mm`, `r95p`, `r99p`, `r95ptot`, `r99ptot`, `rx1day`, `rx5day`, `sdii`

**Temperature** (12):
`fd`, `tn10p`, `tn90p`, `tnlt2`, `tnn`, `tnx`, `tx10p`, `tx90p`, `txge30`, `txgt50p`, `txn`, `txx`

**Duration** (3):
`csdi`, `wsdi`, `txd_tnd`

## 🐳 Docker Commands

### Development Mode (Hot Reload)

```bash
# Start
docker compose up -d

# View logs
docker compose logs -f climate-risk-tool

# Stop
docker compose down
```

### Production Mode

```bash
# Build and start
docker compose -f docker-compose.prod.yml up -d --build

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop
docker compose -f docker-compose.prod.yml down
```

### Helper Script

```bash
# Fix line endings (WSL/Linux)
sed -i 's/\r$//' docker-commands.sh
chmod +x docker-commands.sh

# Use the script
./docker-commands.sh                # Show help
./docker-commands.sh start          # Start development
./docker-commands.sh start-prod     # Start production
./docker-commands.sh logs           # View logs
./docker-commands.sh test-all       # Test endpoints
./docker-commands.sh stop           # Stop containers
```

## 📊 Database Setup

### 1. Create Database

```sql
CREATE DATABASE climate_risk;
\c climate_risk
CREATE EXTENSION postgis;
```

### 2. Run Migrations

```bash
npm run migrate
```

This creates:
- `municipalities` table (with PostGIS geometry)
- `climate_data` table (27 climate indices × scenarios × periods)
- `climate_indices` table (metadata)

### 3. Load Data (ETL)

**Important:** ETL scripts run **locally**, not in Docker containers!

```bash
# Prerequisites: GDAL installed locally
# Ubuntu: sudo apt-get install gdal-bin
# Mac: brew install gdal
# Windows: Use OSGeo4W or conda

# Run ETL scripts
npm run etl:municipalities   # Loads shapefiles → PostGIS
npm run etl:climate          # Loads CSV → climate_data
npm run etl:indices          # Loads metadata → climate_indices

# Or all at once
npm run etl:all
```

**ETL Scripts Location:**
- `scripts/etl/load-municipalities.js` - Uses GDAL (gdal-async)
- `scripts/etl/load-climate-data.js` - Uses CSV parser
- `scripts/etl/load-climate-indices.js` - Loads enhanced metadata

## 🚢 Production Deployment

### Option 1: Docker Compose (Recommended)

```bash
# 1. Configure .env
cp .env.example .env
# Edit with your database credentials

# 2. Build and deploy
docker compose -f docker-compose.prod.yml up -d --build

# 3. Verify
curl http://localhost:4002/health
```

### Option 2: Direct Node.js (Alternative)

```bash
# 1. Install production dependencies
npm install --production

# 2. Configure environment
export NODE_ENV=production
export PORT=4002
export DB_HOST=your-db-host
export DB_USER=your-db-user
export DB_PASSWORD=your-db-password
export DB_NAME=climate_risk

# 3. Start with PM2 (process manager)
npm install -g pm2
pm2 start src/index.js --name climate-api
pm2 save
pm2 startup
```

## 🔒 Security

- ✅ **Non-root user** in Docker container
- ✅ **Helmet.js** for security headers
- ✅ **CORS** configuration
- ✅ **Environment variables** for secrets
- ✅ **Connection pooling** with limits
- ✅ **Parameterized queries** (SQL injection prevention)

**Production Checklist:**
- [ ] Change `CORS_ORIGIN` to your domain
- [ ] Use strong database password
- [ ] Enable HTTPS (use nginx/traefik reverse proxy)
- [ ] Set up firewall rules
- [ ] Enable database SSL connection
- [ ] Regular backups
- [ ] Monitoring and alerting

## 📈 Performance

### Docker Image

- **Size:** ~60MB (Alpine Linux + Node.js)
- **Build time:** 30-60 seconds
- **Multi-stage build** for optimization

### API Performance

- **Response time:**
  - Metadata endpoints: <50ms
  - Municipality data: <100ms
  - GeoJSON (2-4MB): 200-500ms
- **Database queries:** Optimized with proper indexes
- **Connection pool:** Configured for high concurrency

### Resource Limits (Production)

- **CPU:** 1 core (adjustable)
- **Memory:** 1GB limit, 512MB reserved
- **Logs:** 10MB × 3 files rotation

## 🧪 Testing

```bash
# Test health
curl http://localhost:4002/health

# Test municipalities
curl http://localhost:4002/api/municipalities | jq

# Test climate indices
curl http://localhost:4002/api/indices | jq

# Test GeoJSON
curl http://localhost:4002/api/climate-data/geojson/ssp245/near-term_2021-2040/cdd | jq '.features | length'
```

## 📖 API Documentation

See `docs/` folder for detailed documentation:

- API endpoint reference
- Climate indices explained
- Color scheme guide for mapping
- Sector classifications

## 🐛 Troubleshooting

### Database Connection Error

```bash
# Check VPN/network
ping your-db-host

# Verify credentials
psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# Check PostGIS
SELECT PostGIS_version();
```

### Docker Build Fails

```bash
# Clear cache and rebuild
docker compose build --no-cache

# Check logs
docker compose logs -f
```

### ETL Scripts Fail

```bash
# Ensure GDAL is installed locally
ogr2ogr --version

# Check data files exist
ls -la data/

# Run with verbose logging
NODE_ENV=development npm run etl:municipalities
```

### Port Already in Use

```bash
# Find process
netstat -ano | findstr :4002  # Windows
lsof -i :4002                 # Linux/Mac

# Kill process or change PORT in .env
```

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Built with ❤️ for climate data accessibility**
