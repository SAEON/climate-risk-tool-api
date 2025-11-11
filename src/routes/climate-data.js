/**
 * Climate Data Routes
 * Endpoints for climate projection data and GeoJSON
 */

import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

/**
 * GET /api/climate-data/:municipalityId
 * Get all climate data for a municipality (all scenarios and periods)
 */
router.get('/:municipalityId', async (req, res, next) => {
  try {
    const { municipalityId } = req.params;

    const result = await query(`
      SELECT
        cd.*,
        m.municipality_name,
        m.province
      FROM public.climate_data cd
      JOIN public.municipalities m ON m.id = cd.municipality_id
      WHERE cd.municipality_id = $1
      ORDER BY cd.scenario, cd.period_start
    `, [municipalityId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No climate data found for this municipality'
      });
    }

    res.json({
      success: true,
      municipality: {
        id: municipalityId,
        name: result.rows[0].municipality_name,
        province: result.rows[0].province
      },
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/climate-data/:municipalityId/:scenario/:period
 * Get specific scenario and period for a municipality
 */
router.get('/:municipalityId/:scenario/:period', async (req, res, next) => {
  try {
    const { municipalityId, scenario, period } = req.params;

    const result = await query(`
      SELECT
        cd.*,
        m.municipality_name,
        m.province,
        m.district_code,
        m.district_name
      FROM public.climate_data cd
      JOIN public.municipalities m ON m.id = cd.municipality_id
      WHERE cd.municipality_id = $1
        AND cd.scenario = $2
        AND cd.period = $3
    `, [municipalityId, scenario, period]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Climate data not found for specified parameters'
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
 * GET /api/climate-data/geojson/:scenario/:period/:index
 * Get GeoJSON with climate data for mapping
 * Critical endpoint for visualization
 */
router.get('/geojson/:scenario/:period/:index', async (req, res, next) => {
  try {
    const { scenario, period, index } = req.params;

    // Validate climate index exists (must match actual climate_data table columns)
    const validIndices = [
      // Precipitation indices
      'cdd', 'cwd', 'prcptot', 'r10mm', 'r20mm', 'r95p', 'r99p',
      'r95ptot', 'r99ptot', 'rx1day', 'rx5day', 'sdii',
      // Temperature indices
      'fd', 'tn10p', 'tn90p', 'tnlt2', 'tnn', 'tnx',
      'tx10p', 'tx90p', 'txge30', 'txgt50p', 'txn', 'txx',
      // Duration indices
      'csdi', 'wsdi', 'txd_tnd'
    ];

    if (!validIndices.includes(index)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid climate index',
        valid_indices: validIndices
      });
    }

    // Build dynamic query to get the specified index value
    // Note: Column name is validated above and safe to interpolate
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
                'id', m.id,
                'municipality_name', m.municipality_name,
                'municipality_code', m.municipality_code,
                'province', m.province,
                'district_code', m.district_code,
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

    if (!result.rows[0].geojson) {
      return res.status(404).json({
        success: false,
        error: 'No data found for specified parameters'
      });
    }

    res.json(result.rows[0].geojson);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/climate-data/scenarios
 * Get list of available scenarios
 */
router.get('/scenarios', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT DISTINCT scenario
      FROM public.climate_data
      ORDER BY scenario
    `);

    res.json({
      success: true,
      scenarios: result.rows.map(r => r.scenario)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/climate-data/periods
 * Get list of available time periods
 */
router.get('/periods', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT DISTINCT period, period_start, period_end
      FROM public.climate_data
      ORDER BY period_start
    `);

    res.json({
      success: true,
      periods: result.rows
    });
  } catch (error) {
    next(error);
  }
});

export default router;
