# Multi-stage build for optimized Node.js API
# Stage 1: Dependencies
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev --no-audit --no-fund

# Stage 2: Production image
FROM node:22-alpine

# Create app directory
WORKDIR /usr/src/app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001 \
    && chown -R nodejs:nodejs /usr/src/app

# Copy dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/node_modules ./node_modules

# Copy application source
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs src ./src

# Switch to non-root user
USER nodejs

# Environment variables
ENV NODE_ENV=production \
    PORT=4002

# Expose port
EXPOSE 4002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "src/index.js"]
