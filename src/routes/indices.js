/**
 * Climate Indices Routes
 * Endpoints for climate index metadata
 */

import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

/**
 * GET /indices
 * Get all climate indices with metadata
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        id,
        index_code,
        index_name,
        category,
        description,
        technical_definition,
        plain_language_description,
        unit,
        interpretation,
        risk_direction,
        sector,
        baseline_period,
        display_order,
        color_scheme,
        color_palette_type,
        anomaly_direction,
        is_active
      FROM public.climate_indices
      WHERE is_active = true
      ORDER BY display_order, category, index_code
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
 * GET /indices/sectors
 * Get sector classification reference
 * Explains sector abbreviations used in climate indices
 */
router.get('/sectors', (req, res) => {
  res.json({
    success: true,
    sectors: [
      {
        code: 'AFS',
        name: 'Agriculture and Food Security',
        description: 'Indices relevant to agricultural productivity, crop yields, and food production systems'
      },
      {
        code: 'H',
        name: 'Hydrology',
        description: 'Indices relevant to hydrological processes, water cycles, and watershed management'
      },
      {
        code: 'WRH',
        name: 'Water Resources and Health',
        description: 'Indices associated with water availability, quality, and public health impacts'
      },
      {
        code: 'All',
        name: 'All Sectors',
        description: 'Indices relevant across all sectors and general climate monitoring'
      }
    ],
    usage: {
      multiple_sectors: 'When an index shows multiple sectors (e.g., "H, AFS, WRH"), it indicates the index is relevant to all listed sectors',
      example: 'CDD (Consecutive Dry Days) is tagged as "H, AFS, WRH" because droughts impact hydrology, agriculture, and water resources/health'
    }
  });
});

/**
 * GET /indices/color-schemes
 * Get color scheme reference and explanation
 * Explains the relationship between color_palette_type and color_scheme
 */
router.get('/color-schemes', (req, res) => {
  res.json({
    success: true,
    explanation: {
      color_palette_type: 'The CATEGORY of color scale (e.g., diverging, sequential, categorical)',
      color_scheme: 'The SPECIFIC palette name within that category (e.g., RdBu_r, BuRd)',
      relationship: 'color_palette_type tells you HOW to apply colors, color_scheme tells you WHICH colors to use'
    },
    palette_types: {
      diverging: {
        description: 'Two-directional gradient with a meaningful center point (used for anomalies)',
        use_case: 'Climate anomalies where zero = no change from baseline',
        visual: 'Blue ← White → Red',
        schemes_we_use: ['RdBu_r', 'BuRd', 'RdBu']
      },
      sequential: {
        description: 'Single-directional gradient from low to high',
        use_case: 'Absolute values with no meaningful center',
        visual: 'Light → Dark',
        schemes_we_use: []
      }
    },
    color_schemes: [
      {
        name: 'RdBu_r',
        type: 'diverging',
        full_name: 'Red-White-Blue (Reversed)',
        direction: 'Red for positive values, Blue for negative values',
        usage: 'Heat/drought indices where POSITIVE anomalies are BAD',
        examples: ['CDD (more dry days)', 'TXge30 (more hot days)', 'WSDI (more heatwave days)'],
        colors: {
          negative: '#2166ac (blue)',
          zero: '#f7f7f7 (white)',
          positive: '#b2182b (red)'
        }
      },
      {
        name: 'BuRd',
        type: 'diverging',
        full_name: 'Blue-White-Red',
        direction: 'Blue for positive values, Red for negative values',
        usage: 'Precipitation indices where POSITIVE anomalies are GOOD (more rain)',
        examples: ['PRCPTOT (more rainfall)', 'R10mm (more heavy rain days)', 'CWD (longer wet spells)'],
        colors: {
          negative: '#b2182b (red)',
          zero: '#f7f7f7 (white)',
          positive: '#2166ac (blue)'
        }
      },
      {
        name: 'RdBu',
        type: 'diverging',
        full_name: 'Red-White-Blue',
        direction: 'Red for negative values, Blue for positive values',
        usage: 'Cold indices where NEGATIVE anomalies show WARMING (fewer cold days)',
        examples: ['FD (fewer frost days = warming)', 'CSDI (fewer cold spells)', 'TN10p (fewer cold nights)'],
        colors: {
          negative: '#b2182b (red)',
          zero: '#f7f7f7 (white)',
          positive: '#2166ac (blue)'
        }
      }
    ],
    implementation_guide: {
      step_1: 'Check color_palette_type to know which type of scale to create (diverging vs sequential)',
      step_2: 'Use color_scheme name to get the specific ColorBrewer palette',
      step_3: 'Use anomaly_direction to understand what the colors mean (is red bad or good?)',
      example: {
        index: 'CDD',
        color_palette_type: 'diverging',
        color_scheme: 'RdBu_r',
        anomaly_direction: 'positive_bad',
        interpretation: 'Use a diverging scale centered at zero, with the RdBu_r palette where red = positive values = bad (more drought)'
      }
    }
  });
});

/**
 * GET /indices/:code
 * Get single climate index by code
 */
router.get('/:code', async (req, res, next) => {
  try {
    const { code } = req.params;

    const result = await query(`
      SELECT
        id,
        index_code,
        index_name,
        category,
        description,
        technical_definition,
        plain_language_description,
        unit,
        interpretation,
        risk_direction,
        sector,
        baseline_period,
        display_order,
        color_scheme,
        color_palette_type,
        anomaly_direction,
        is_active
      FROM public.climate_indices
      WHERE index_code = $1
    `, [code.toLowerCase()]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Climate index not found'
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
 * GET /indices/category/:category
 * Get climate indices by category
 */
router.get('/category/:category', async (req, res, next) => {
  try {
    const { category } = req.params;

    const result = await query(`
      SELECT
        id,
        index_code,
        index_name,
        category,
        description,
        technical_definition,
        plain_language_description,
        unit,
        interpretation,
        risk_direction,
        sector,
        baseline_period,
        display_order,
        color_scheme,
        color_palette_type,
        anomaly_direction,
        is_active
      FROM public.climate_indices
      WHERE category = $1 AND is_active = true
      ORDER BY display_order, index_code
    `, [category.toLowerCase()]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found or has no active indices'
      });
    }

    res.json({
      success: true,
      category: category.toLowerCase(),
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /indices/stats/categories
 * Get summary statistics by category
 */
router.get('/stats/categories', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        category,
        COUNT(*) as index_count,
        json_agg(
          json_build_object(
            'code', index_code,
            'name', index_name,
            'unit', unit
          ) ORDER BY display_order, index_code
        ) as indices
      FROM public.climate_indices
      WHERE is_active = true
      GROUP BY category
      ORDER BY category
    `);

    res.json({
      success: true,
      categories: result.rows
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /indices/stats/summary
 * Get overall summary statistics
 */
router.get('/stats/summary', async (req, res, next) => {
  try {
    const totalIndices = await query(`
      SELECT COUNT(*) as total
      FROM public.climate_indices
      WHERE is_active = true
    `);

    const byCategory = await query(`
      SELECT
        category,
        COUNT(*) as count
      FROM public.climate_indices
      WHERE is_active = true
      GROUP BY category
      ORDER BY category
    `);

    const byRiskDirection = await query(`
      SELECT
        risk_direction,
        COUNT(*) as count
      FROM public.climate_indices
      WHERE is_active = true
      GROUP BY risk_direction
      ORDER BY risk_direction
    `);

    res.json({
      success: true,
      summary: {
        total_indices: parseInt(totalIndices.rows[0].total),
        baseline_period: '1995-2014',
        by_category: byCategory.rows,
        by_risk_direction: byRiskDirection.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /indices/stats/by-sector
 * Get climate indices grouped by sector
 */
router.get('/stats/by-sector', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        sector,
        COUNT(*) as index_count,
        json_agg(
          json_build_object(
            'code', index_code,
            'name', index_name,
            'category', category,
            'plain_language', plain_language_description
          ) ORDER BY category, index_code
        ) as indices
      FROM public.climate_indices
      WHERE is_active = true AND sector IS NOT NULL
      GROUP BY sector
      ORDER BY index_count DESC
    `);

    res.json({
      success: true,
      by_sector: result.rows,
      sector_reference: {
        'AFS': 'Agriculture and Food Security',
        'H': 'Hydrology',
        'WRH': 'Water Resources and Health',
        'All': 'All Sectors'
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
