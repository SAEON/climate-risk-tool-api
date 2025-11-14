/**
 * Enhanced In-Memory Cache Middleware
 * Caches GET requests with tiered TTL, ETags, and Cache-Control headers
 */

import crypto from 'crypto';

class InMemoryCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 3600000; // Default: 1 hour in milliseconds
    this.maxSize = options.maxSize || 100; // Maximum number of cached items
    this.hits = 0;
    this.misses = 0;

    // Tiered TTL settings (in milliseconds)
    this.ttlSettings = {
      metadata: 7 * 24 * 60 * 60 * 1000,    // 7 days for indices, sectors, color-schemes
      geojson: 30 * 24 * 60 * 60 * 1000,    // 30 days for GeoJSON climate data
      municipalities: 7 * 24 * 60 * 60 * 1000, // 7 days for municipality data
      health: 60 * 60 * 1000,                // 1 hour for health/stats
      default: 3600000                       // 1 hour default
    };
  }

  /**
   * Generate cache key from request
   */
  generateKey(req) {
    return `${req.method}:${req.originalUrl}`;
  }

  /**
   * Generate ETag from data
   */
  generateETag(data) {
    const content = JSON.stringify(data);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Determine TTL based on URL pattern
   */
  determineTTL(url) {
    if (url.includes('/indices')) {
      return this.ttlSettings.metadata;
    }
    if (url.includes('/climate-data/geojson/')) {
      return this.ttlSettings.geojson;
    }
    if (url.includes('/municipalities')) {
      return this.ttlSettings.municipalities;
    }
    if (url.includes('/health')) {
      return this.ttlSettings.health;
    }
    return this.ttlSettings.default;
  }

  /**
   * Get Cache-Control header value based on TTL
   */
  getCacheControlHeader(ttl) {
    const maxAge = Math.floor(ttl / 1000); // Convert to seconds
    return `public, max-age=${maxAge}`;
  }

  /**
   * Get item from cache
   */
  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return item;
  }

  /**
   * Set item in cache
   */
  set(key, data, customTtl = null) {
    // If cache is full, remove oldest entry (LRU-style)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const ttl = customTtl || this.ttl;
    const etag = this.generateETag(data);

    this.cache.set(key, {
      data,
      etag,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    });
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(2) + '%' : '0%',
      ttl: this.ttl
    };
  }

  /**
   * Express middleware
   */
  middleware() {
    return (req, res, next) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Don't cache cache management endpoints
      if (req.originalUrl.includes('/cache/')) {
        return next();
      }

      const key = this.generateKey(req);
      const cachedItem = this.get(key);

      // Determine TTL for this request
      const ttl = this.determineTTL(req.originalUrl);

      // Handle cached data with ETag support
      if (cachedItem) {
        const { data, etag } = cachedItem;

        // Check If-None-Match header for ETag
        const clientETag = req.headers['if-none-match'];
        if (clientETag === etag) {
          // Client has current version, send 304 Not Modified
          res.setHeader('X-Cache', 'HIT-304');
          res.setHeader('ETag', etag);
          res.setHeader('Cache-Control', this.getCacheControlHeader(ttl));
          return res.status(304).end();
        }

        // Send cached data with headers
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', key);
        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', this.getCacheControlHeader(ttl));
        return res.json(data);
      }

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = (data) => {
        // Only cache successful responses
        if (res.statusCode === 200) {
          this.set(key, data, ttl);
          const etag = this.generateETag(data);
          res.setHeader('ETag', etag);
        }
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', key);
        res.setHeader('Cache-Control', this.getCacheControlHeader(ttl));
        return originalJson(data);
      };

      next();
    };
  }
}

// Create singleton instance with enhanced settings
const cache = new InMemoryCache({
  ttl: 3600000,      // Default 1 hour (overridden by tiered TTL)
  maxSize: 400       // Store up to 400 items (324 GeoJSON combos + metadata endpoints)
});

export default cache;
export { InMemoryCache };
