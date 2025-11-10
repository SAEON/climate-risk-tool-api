/**
 * Simple In-Memory Cache Middleware
 * Caches GET requests to reduce database load
 */

class InMemoryCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 3600000; // Default: 1 hour in milliseconds
    this.maxSize = options.maxSize || 100; // Maximum number of cached items
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Generate cache key from request
   */
  generateKey(req) {
    return `${req.method}:${req.originalUrl}`;
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
    return item.data;
  }

  /**
   * Set item in cache
   */
  set(key, data, customTtl = null) {
    // If cache is full, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const ttl = customTtl || this.ttl;
    this.cache.set(key, {
      data,
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

      const key = this.generateKey(req);
      const cachedData = this.get(key);

      if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', key);
        return res.json(cachedData);
      }

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = (data) => {
        // Only cache successful responses
        if (res.statusCode === 200) {
          this.set(key, data);
        }
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', key);
        return originalJson(data);
      };

      next();
    };
  }
}

// Create singleton instance
const cache = new InMemoryCache({
  ttl: 3600000,      // 1 hour cache
  maxSize: 200       // Store up to 200 different requests
});

export default cache;
export { InMemoryCache };
