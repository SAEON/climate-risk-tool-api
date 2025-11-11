#!/bin/bash
# Quick Docker commands reference for Climate Risk Tool API

# ==========================================
# BUILD
# ==========================================

# Build image
build() {
    docker build -t climate-risk-api:latest .
}

# Build with no cache
build-fresh() {
    docker build --no-cache -t climate-risk-api:latest .
}

# Build with docker compose
compose-build() {
    docker compose build
}

# ==========================================
# RUN
# ==========================================

# Run with docker compose - Development (recommended)
start() {
    docker compose up -d
    echo "API started on http://localhost:4002 (Development Mode)"
    echo "View logs with: docker compose logs -f climate-risk-tool"
}

# Run with docker compose - Production
start-prod() {
    docker compose -f docker-compose.prod.yml up -d --build
    echo "API started on http://localhost:4002 (Production Mode)"
    echo "View logs with: docker compose -f docker-compose.prod.yml logs -f"
}

# Stop docker compose - Development
stop() {
    docker compose down
}

# Stop docker compose - Production
stop-prod() {
    docker compose -f docker-compose.prod.yml down
}

# Restart - Development
restart() {
    docker compose down
    docker compose up -d
}

# Restart - Production
restart-prod() {
    docker compose -f docker-compose.prod.yml down
    docker compose -f docker-compose.prod.yml up -d --build
}

# Run with docker directly
run-docker() {
    docker run -d \
        --name climate-risk-tool \
        -p 4002:4002 \
        --env-file .env \
        climate-risk-api:latest
}

# ==========================================
# LOGS
# ==========================================

# View logs (docker compose dev)
logs() {
    docker compose logs -f climate-risk-tool
}

# View logs (docker compose prod)
logs-prod() {
    docker compose -f docker-compose.prod.yml logs -f
}

# View logs (docker)
logs-docker() {
    docker logs -f climate-risk-tool
}

# ==========================================
# TESTING
# ==========================================

# Test health endpoint
test-health() {
    echo "Testing /health endpoint..."
    curl http://localhost:4002/health
}

# Test API endpoint
test-api() {
    echo "Testing /api/indices endpoint..."
    curl http://localhost:4002/api/indices
}

# Run all tests
test-all() {
    echo "Running all tests..."
    test-health
    echo ""
    test-api
}

# ==========================================
# DATABASE / ETL (Run locally, NOT in Docker!)
# ==========================================
# Note: ETL scripts require GDAL and must run on your local machine
# They populate the database that the Docker container connects to

# Run database migrations
migrate() {
    echo "Running database migrations..."
    npm run migrate
}

# Load municipalities from GeoPackage
etl-municipalities() {
    echo "Loading 213 municipalities from GeoPackage..."
    echo "Note: Requires GDAL installed locally"
    npm run etl:municipalities
}

# Load climate data from CSV
etl-climate() {
    echo "Loading climate data from CSV..."
    npm run etl:climate
}

# Load climate indices metadata
etl-indices() {
    echo "Loading climate indices metadata..."
    npm run etl:indices
}

# Run all ETL scripts in sequence
etl-all() {
    echo "Running complete ETL pipeline..."
    echo "1. Loading municipalities..."
    npm run etl:municipalities
    echo ""
    echo "2. Loading climate data..."
    npm run etl:climate
    echo ""
    echo "3. Loading climate indices..."
    npm run etl:indices
    echo ""
    echo "✓ ETL pipeline complete!"
}

# Verify database data
db-verify() {
    echo "Verifying database data..."
    npm run db:verify
}

# ==========================================
# MAINTENANCE
# ==========================================

# View container stats
stats() {
    docker stats climate-risk-tool
}

# Enter container shell
shell() {
    docker exec -it climate-risk-tool sh
}

# View container health
health() {
    docker inspect --format='{{json .State.Health}}' climate-risk-tool
}

# ==========================================
# CLEANUP
# ==========================================

# Stop and remove container
clean() {
    docker compose down
}

# Stop and remove container (production)
clean-prod() {
    docker compose -f docker-compose.prod.yml down
}

# Remove images
clean-images() {
    docker rmi climate-risk-api:latest
}

# Full cleanup
clean-all() {
    docker compose down --rmi all -v
    docker system prune -f
}

# ==========================================
# HELP
# ==========================================

help() {
    echo "Climate Risk Tool API - Docker Commands"
    echo ""
    echo "Build:"
    echo "  ./docker-commands.sh build           - Build Docker image"
    echo "  ./docker-commands.sh build-fresh     - Build without cache"
    echo "  ./docker-commands.sh compose-build   - Build with docker compose"
    echo ""
    echo "Run (Development - Hot Reload):"
    echo "  ./docker-commands.sh start           - Start dev mode"
    echo "  ./docker-commands.sh stop            - Stop dev mode"
    echo "  ./docker-commands.sh restart         - Restart dev mode"
    echo ""
    echo "Run (Production):"
    echo "  ./docker-commands.sh start-prod      - Start production"
    echo "  ./docker-commands.sh stop-prod       - Stop production"
    echo "  ./docker-commands.sh restart-prod    - Restart production"
    echo ""
    echo "Logs:"
    echo "  ./docker-commands.sh logs            - View dev logs (follow)"
    echo "  ./docker-commands.sh logs-prod       - View prod logs (follow)"
    echo ""
    echo "Testing:"
    echo "  ./docker-commands.sh test-health     - Test health endpoint"
    echo "  ./docker-commands.sh test-api        - Test API endpoint"
    echo "  ./docker-commands.sh test-all        - Run all tests"
    echo ""
    echo "Database / ETL (Run locally, NOT in Docker!):"
    echo "  ./docker-commands.sh migrate         - Run database migrations"
    echo "  ./docker-commands.sh etl-municipalities - Load 213 municipalities"
    echo "  ./docker-commands.sh etl-climate     - Load climate data from CSV"
    echo "  ./docker-commands.sh etl-indices     - Load climate indices metadata"
    echo "  ./docker-commands.sh etl-all         - Run complete ETL pipeline"
    echo "  ./docker-commands.sh db-verify       - Verify database data"
    echo ""
    echo "Maintenance:"
    echo "  ./docker-commands.sh stats           - View container stats"
    echo "  ./docker-commands.sh shell           - Enter container shell"
    echo "  ./docker-commands.sh health          - View health status"
    echo ""
    echo "Cleanup:"
    echo "  ./docker-commands.sh clean           - Stop and remove containers"
    echo "  ./docker-commands.sh clean-prod      - Stop and remove prod containers"
    echo "  ./docker-commands.sh clean-all       - Full cleanup"
    echo ""
    echo "Default: http://localhost:4002"
}

# ==========================================
# MAIN
# ==========================================

# Run the specified function or show help
if [ -z "$1" ]; then
    help
else
    "$@"
fi
