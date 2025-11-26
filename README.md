# Climate Risk Tool API

A REST API for accessing downscaled climate change projections for South African municipalities. Built with Node.js, Express, PostgreSQL, and PostGIS.

**Data Source:** SAEON Climate Change Projections for South Africa v1.0

## 📊 Overview

- **213 South African Municipalities** with spatial boundaries
- **27 Climate Indices** (precipitation, temperature, extreme events)
- **4 SSP Scenarios:** ssp126 (low), ssp245 (moderate), ssp370 (high), ssp585 (very high)
- **3 Time Periods:** 2021-2040, 2041-2060, 2081-2100
- **GeoJSON API** for web mapping applications

## 🚀 Quick Start

### Prerequisites

- **Node.js 22+** (LTS)
- **PostgreSQL 17+** with **PostGIS 3.6+**
- **Docker** (optional)
- **GDAL** (for ETL scripts only)

### Installation

```bash
git clone https://github.com/SAEON/climate-risk-tool-api.git
cd climate-risk-tool-api
npm install
```

### Database Setup

```bash
# 1. Create database with PostGIS
createdb climate_risk
psql -d climate_risk -c "CREATE EXTENSION postgis;"

# 2. Configure environment
cp .env.example .env
# Edit .env with your database credentials

# 3. Run migrations
npm run migrate

# 4. Load data (requires GDAL installed locally)
npm run etl:all
```

### Run API

```bash
# Development (with hot reload)
npm run dev

# Production
npm start

# Docker
docker compose up -d
```

API runs on `http://localhost:4002`

## 📡 API Endpoints

### Municipalities

```
GET /api/municipalities                      # List all (213)
GET /api/municipalities/:id                  # Get by ID
GET /api/municipalities/province/:province   # Filter by province
GET /api/municipalities/district/:district   # Filter by district
```

### Climate Data

```
GET /api/climate-data/:municipalityId                         # All scenarios/periods
GET /api/climate-data/:municipalityId/:scenario/:period       # Specific projection
GET /api/climate-data/geojson/:scenario/:period/:index        # GeoJSON for mapping
```

**Parameters:**
- `scenario`: `ssp126` | `ssp245` | `ssp370` | `ssp585`
- `period`: `near-term_2021-2040` | `mid-term_2041-2060` | `far-term_2081-2100`
- `index`: Climate index code (see below)

### Climate Indices Metadata

```
GET /api/indices                    # List all 27 indices
GET /api/indices/:code              # Get metadata for specific index
GET /api/indices/category/:category # Filter by category (precipitation/temperature/duration)
```

**Available Indices:**

| Category | Indices |
|----------|---------|
| **Precipitation (12)** | `cdd`, `cwd`, `prcptot`, `r10mm`, `r20mm`, `r95p`, `r99p`, `r95ptot`, `r99ptot`, `rx1day`, `rx5day`, `sdii` |
| **Temperature (12)** | `fd`, `tn10p`, `tn90p`, `tnlt2`, `tnn`, `tnx`, `tx10p`, `tx90p`, `txge30`, `txgt50p`, `txn`, `txx` |
| **Duration (3)** | `csdi`, `wsdi`, `txd_tnd` |

## 🐳 Docker Deployment

### Development

```bash
docker compose up -d
docker compose logs -f
```

### Production

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Helper Commands

```bash
./docker-commands.sh start          # Start dev
./docker-commands.sh start-prod     # Start production
./docker-commands.sh logs           # View logs
./docker-commands.sh etl-all        # Run ETL pipeline (local only)
./docker-commands.sh                # Show all commands
```

## 📁 Project Structure

```
climate-risk-tool-api/
├── src/
│   ├── index.js              # Express server
│   ├── config/
│   │   └── database.js       # PostgreSQL connection pool
│   └── routes/
│       ├── municipalities.js # Municipality endpoints
│       ├── climate-data.js   # Climate data & GeoJSON
│       └── indices.js        # Climate indices metadata
├── scripts/
│   ├── migrate.js            # Database migrations
│   ├── verify-data.js        # Data verification
│   └── etl/                  # ETL scripts (run locally)
│       ├── load-municipalities.js
│       ├── load-climate-data.js
│       └── load-climate-indices.js
├── migrations/               # SQL migration files
│   ├── 001_create_municipalities_table.sql
│   ├── 002_create_climate_data_table.sql
│   ├── 003_create_climate_indices_table.sql
│   └── 004_add_district_fields.sql
├── vector/
│   └── municipality_indices.gpkg  # Source GeoPackage (219MB)
├── docs/
│   └── Downscaled Climate Change Projections for SA v1.0.pdf
├── Dockerfile                # Production Docker image
├── docker-compose.yml        # Development setup
├── docker-compose.prod.yml   # Production setup
└── .env.example              # Environment template
```

## ⚙️ Configuration

Create `.env` file:

```env
# Server
NODE_ENV=production
PORT=4002

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=climate_risk
DB_USER=your_username
DB_PASSWORD=your_password

# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10

# CORS
CORS_ORIGIN=*  # Set to your domain in production
```

## 🔒 Security

- Non-root container user
- Helmet.js security headers
- CORS configuration
- Parameterized SQL queries
- Connection pooling with limits

**Production Checklist:**
- [ ] Update `CORS_ORIGIN` to your domain
- [ ] Use strong database password
- [ ] Enable HTTPS with reverse proxy
- [ ] Enable database SSL connections
- [ ] Set up regular backups

## 📊 Performance

- **Docker Image:** ~60MB (Alpine Linux)
- **Response Times:**
  - Metadata: <50ms
  - Municipality data: <100ms
  - GeoJSON: 200-500ms
- **Resource Limits:** 1 CPU, 1GB memory

## 🧪 Testing

```bash
# Health check
curl http://localhost:4002/health

# List municipalities
curl http://localhost:4002/api/municipalities | jq

# Get climate data
curl http://localhost:4002/api/climate-data/1/ssp245/near-term_2021-2040 | jq

# Get GeoJSON
curl http://localhost:4002/api/climate-data/geojson/ssp585/far-term_2081-2100/txge30 | jq
```

## 🐛 Troubleshooting

### Database Connection Error

```bash
# Test connection
psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# Verify PostGIS
psql -d climate_risk -c "SELECT PostGIS_version();"
```

### ETL Fails

```bash
# Verify GDAL installation
ogr2ogr --version

# Check data files exist
ls -lh vector/municipality_indices.gpkg
```

### Port Already in Use

```bash
# Linux/Mac
lsof -i :4002

# Windows
netstat -ano | findstr :4002
```

## 📄 Data Attribution

This API provides access to downscaled climate change projections developed by the South African Environmental Observation Network (SAEON).

**Citation:**
SAEON (2024). Downscaled Climate Change Projections for South Africa v1.0. South African Environmental Observation Network.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📍 Repository

https://github.com/SAEON/climate-risk-tool-api

---

**Developed by SAEON for climate data accessibility**
