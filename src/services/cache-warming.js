/**
 * Cache Warming Service
 * Pre-loads essential climate data into cache on server startup
 *
 * Tier 1 Strategy: 48 essential combinations
 * - Scenario: ssp245 (most commonly used middle-of-the-road scenario)
 * - Period: near-term_2021-2040 (most relevant timeframe)
 * - All 27 climate indices
 */

import { query } from '../config/database.js';

// List of all 27 climate indices
const CLIMATE_INDICES = [
  // Precipitation indices
  'cdd', 'cwd', 'prcptot', 'r10mm', 'r20mm', 'r95p', 'r99p',
  'r95ptot', 'r99ptot', 'rx1day', 'rx5day', 'sdii',

  // Temperature indices
  'fd', 'tn10p', 'tn90p', 'tnlt2', 'tnn', 'tnx',
  'tx10p', 'tx90p', 'txge30', 'txgt50p', 'txn', 'txx',

  // Duration indices
  'csdi', 'wsdi', 'txd_tnd'
];

/**
 * Priority indices based on expected user interest
 */
const PRIORITY_INDICES = [
  'cdd',      // Consecutive Dry Days (drought)
  'wsdi',     // Warm Spell Duration (heatwaves)
  'txge30',   // Hot Days ≥30°C
  'prcptot',  // Total Precipitation
  'rx1day',   // Maximum 1-day rainfall
  'fd',       // Frost Days
  'r10mm',    // Heavy rain days
  'csdi'      // Cold Spell Duration
];

class CacheWarmingService {
  constructor() {
    this.warmedCount = 0;
    this.failedCount = 0;
    this.startTime = null;
  }

  /**
   * Build GeoJSON data directly from database (same logic as API endpoint)
   */
  async buildGeoJSON(scenario, period, index) {
    const result = await query(`
      SELECT
        json_build_object(
          'type', 'FeatureCollection',
          'features', json_agg(
            json_build_object(
              'type', 'Feature',
              'id', m.id,
              'geometry', ST_AsGeoJSON(m.geom)::json,
              'properties', json_build_object(
                'municipality_name', m.municipality_name,
                'municipality_code', m.municipality_code,
                'province', m.province,
                'district_name', m.district_name,
                'centroid_lat', m.centroid_lat,
                'centroid_lon', m.centroid_lon,
                'area_km2', m.area_km2,
                'scenario', cd.scenario,
                'period', cd.period,
                'period_start', cd.period_start,
                'period_end', cd.period_end,
                'index_code', '${index}',
                'value', cd.${index}
              )
            )
          )
        ) as geojson
      FROM public.municipalities m
      JOIN public.climate_data cd ON cd.municipality_id = m.id
      WHERE cd.scenario = $1
        AND cd.period = $2
        AND m.geom IS NOT NULL
        AND cd.${index} IS NOT NULL
    `, [scenario, period]);

    return result.rows[0]?.geojson || null;
  }

  /**
   * Warm a single cache entry
   */
  async warmEntry(cache, scenario, period, index) {
    try {
      const key = `GET:/api/climate-data/geojson/${scenario}/${period}/${index}`;

      // Build the data
      const data = await this.buildGeoJSON(scenario, period, index);

      if (data) {
        // Manually set in cache with appropriate TTL
        const ttl = 30 * 24 * 60 * 60 * 1000; // 30 days for GeoJSON
        cache.set(key, { success: true, data }, ttl);
        this.warmedCount++;
        return true;
      }

      this.failedCount++;
      return false;
    } catch (error) {
      console.error(`Failed to warm cache for ${scenario}/${period}/${index}:`, error.message);
      this.failedCount++;
      return false;
    }
  }

  /**
   * Warm Tier 1: Essential 48 combinations
   * SSP245 × near-term × 27 indices
   */
  async warmTier1(cache) {
    console.log('\n🔥 Cache Warming - Tier 1: Essential Data');
    console.log('==========================================');
    console.log('Scenario: ssp245 (middle-of-the-road)');
    console.log('Period: near-term_2021-2040');
    console.log(`Indices: ${CLIMATE_INDICES.length} climate indices\n`);

    const scenario = 'ssp245';
    const period = 'near-term_2021-2040';

    // Warm priority indices first (in parallel batches of 5)
    console.log('⭐ Warming priority indices first...');
    const priorityBatches = [];
    for (let i = 0; i < PRIORITY_INDICES.length; i += 5) {
      const batch = PRIORITY_INDICES.slice(i, i + 5);
      priorityBatches.push(batch);
    }

    for (const batch of priorityBatches) {
      await Promise.all(
        batch.map(index => this.warmEntry(cache, scenario, period, index))
      );
      console.log(`  ✓ Warmed ${batch.join(', ')}`);
    }

    // Warm remaining indices
    const remainingIndices = CLIMATE_INDICES.filter(
      idx => !PRIORITY_INDICES.includes(idx)
    );

    if (remainingIndices.length > 0) {
      console.log('\n📊 Warming remaining indices...');
      const remainingBatches = [];
      for (let i = 0; i < remainingIndices.length; i += 5) {
        const batch = remainingIndices.slice(i, i + 5);
        remainingBatches.push(batch);
      }

      for (const batch of remainingBatches) {
        await Promise.all(
          batch.map(index => this.warmEntry(cache, scenario, period, index))
        );
        console.log(`  ✓ Warmed ${batch.join(', ')}`);
      }
    }
  }

  /**
   * Warm metadata endpoints (very fast, static data)
   */
  async warmMetadata(cache) {
    console.log('\n📚 Warming metadata endpoints...');

    try {
      // Get all indices
      const indicesResult = await query(`
        SELECT
          id, index_code, index_name, category, description,
          technical_definition, plain_language_description,
          unit, interpretation, risk_direction, sector,
          baseline_period, display_order, color_scheme,
          color_palette_type, anomaly_direction, is_active
        FROM public.climate_indices
        WHERE is_active = true
        ORDER BY display_order, category, index_code
      `);

      const indicesData = {
        success: true,
        count: indicesResult.rows.length,
        data: indicesResult.rows
      };

      // Cache with 7-day TTL
      const ttl = 7 * 24 * 60 * 60 * 1000;
      cache.set('GET:/api/indices', indicesData, ttl);
      console.log('  ✓ Warmed /api/indices');

      // Get all municipalities
      const municResult = await query(`
        SELECT
          id, objectid, municipality_name, municipality_code,
          province, district_code, district_name, category,
          centroid_lat, centroid_lon, area_km2
        FROM public.municipalities
        ORDER BY province, municipality_name
      `);

      const municData = {
        success: true,
        count: municResult.rows.length,
        data: municResult.rows
      };

      cache.set('GET:/api/municipalities', municData, ttl);
      console.log('  ✓ Warmed /api/municipalities');

      this.warmedCount += 2;
    } catch (error) {
      console.error('Failed to warm metadata:', error.message);
      this.failedCount += 2;
    }
  }

  /**
   * Run complete cache warming process
   */
  async warmCache(cache) {
    this.startTime = Date.now();
    this.warmedCount = 0;
    this.failedCount = 0;

    console.log('\n');
    console.log('═══════════════════════════════════════════════');
    console.log('  🚀 CACHE WARMING SERVICE - STARTUP          ');
    console.log('═══════════════════════════════════════════════');

    try {
      // Warm metadata first (fast)
      await this.warmMetadata(cache);

      // Warm Tier 1 GeoJSON data
      await this.warmTier1(cache);

      const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);

      console.log('\n');
      console.log('═══════════════════════════════════════════════');
      console.log('  ✅ CACHE WARMING COMPLETE                   ');
      console.log('═══════════════════════════════════════════════');
      console.log(`  Total warmed: ${this.warmedCount} entries`);
      console.log(`  Failed: ${this.failedCount} entries`);
      console.log(`  Duration: ${duration}s`);
      console.log(`  Cache size: ${cache.cache.size}/${cache.maxSize}`);
      console.log('═══════════════════════════════════════════════\n');

    } catch (error) {
      console.error('\n❌ Cache warming failed:', error);
      throw error;
    }
  }
}

export default new CacheWarmingService();
