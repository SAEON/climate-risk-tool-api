/**
 * Municipalities Routes
 * Endpoints for municipality data
 */

import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

/**
 * GET /municipalities
 * Get all municipalities with basic info
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        id,
        objectid,
        municipality_name,
        municipality_code,
        province,
        district_code,
        district_name,
        category,
        centroid_lat,
        centroid_lon,
        area_km2
      FROM public.municipalities
      ORDER BY province, municipality_name
    `);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /municipalities/:id
 * Get single municipality by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT
        id,
        objectid,
        municipality_name,
        municipality_code,
        province,
        district_code,
        district_name,
        category,
        cat2,
        cat_b,
        centroid_lat,
        centroid_lon,
        area_km2,
        ST_AsGeoJSON(geom) as geometry
      FROM public.municipalities
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Municipality not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /municipalities/province/:province
 * Get municipalities by province
 */
router.get('/province/:province', async (req, res, next) => {
  try {
    const { province } = req.params;

    const result = await query(`
      SELECT
        id,
        objectid,
        municipality_name,
        municipality_code,
        district_code,
        district_name,
        centroid_lat,
        centroid_lon,
        area_km2
      FROM public.municipalities
      WHERE province = $1
      ORDER BY municipality_name
    `, [province.toUpperCase()]);

    res.json({
      success: true,
      province: province.toUpperCase(),
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /municipalities/district/:districtCode
 * Get municipalities by district
 */
router.get('/district/:districtCode', async (req, res, next) => {
  try {
    const { districtCode } = req.params;

    const result = await query(`
      SELECT
        id,
        objectid,
        municipality_name,
        municipality_code,
        province,
        district_name,
        centroid_lat,
        centroid_lon,
        area_km2
      FROM public.municipalities
      WHERE district_code = $1
      ORDER BY municipality_name
    `, [districtCode.toUpperCase()]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'District not found or has no municipalities'
      });
    }

    res.json({
      success: true,
      district_code: districtCode.toUpperCase(),
      district_name: result.rows[0].district_name,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /municipalities/stats/summary
 * Get summary statistics
 */
router.get('/stats/summary', async (req, res, next) => {
  try {
    const stats = await query(`
      SELECT
        COUNT(*) as total_municipalities,
        COUNT(DISTINCT province) as total_provinces,
        COUNT(DISTINCT district_code) as total_districts,
        ROUND(AVG(area_km2)::numeric, 2) as avg_area_km2,
        ROUND(MIN(area_km2)::numeric, 2) as min_area_km2,
        ROUND(MAX(area_km2)::numeric, 2) as max_area_km2
      FROM public.municipalities
    `);

    const byProvince = await query(`
      SELECT
        province,
        COUNT(*) as count
      FROM public.municipalities
      GROUP BY province
      ORDER BY count DESC
    `);

    const byDistrict = await query(`
      SELECT
        district_code,
        district_name,
        province,
        COUNT(*) as municipality_count
      FROM public.municipalities
      WHERE district_code IS NOT NULL
      GROUP BY district_code, district_name, province
      ORDER BY municipality_count DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      summary: stats.rows[0],
      by_province: byProvince.rows,
      top_districts: byDistrict.rows
    });
  } catch (error) {
    next(error);
  }
});

export default router;
