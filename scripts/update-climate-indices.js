/**
 * Update Climate Indices with SAEON-based Color Schemes and Interpretations
 * Based on authoritative guidance from SAEON GitHub repository
 */

import { query } from '../src/config/database.js';

const UPDATED_INDICES = [
  // PRECIPITATION INDICES
  {
    index_code: 'cdd',
    color_scheme: 'RdBu_r', // Red (bad) to Blue (good) - reversed
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad', // More dry days = bad
    interpretation: 'Longest drought period in a year. Red indicates more dry days (drought risk), Blue indicates fewer dry days (improved water availability).'
  },
  {
    index_code: 'cwd',
    color_scheme: 'BuRd', // Blue (good) to Red (bad)
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_good', // More wet days = good
    interpretation: 'Longest wet spell in a year. Blue indicates more consecutive wet days (good for water resources), Red indicates shorter wet spells (drought risk).'
  },
  {
    index_code: 'prcptot',
    color_scheme: 'BuRd', // Blue (wetter) to Red (drier)
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_good', // More rain = good
    interpretation: 'Total annual precipitation on wet days. Blue indicates increased rainfall, Red indicates decreased rainfall (drought risk).'
  },
  {
    index_code: 'r10mm',
    color_scheme: 'BuRd',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_good',
    interpretation: 'Days with ≥10mm rainfall. Blue indicates more heavy rain days, Red indicates fewer (drought risk).'
  },
  {
    index_code: 'r20mm',
    color_scheme: 'BuRd',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_good',
    interpretation: 'Days with ≥20mm rainfall. Blue indicates more very heavy rain days, Red indicates fewer (drought risk).'
  },
  {
    index_code: 'r95p',
    color_scheme: 'BuRd',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_neutral',
    interpretation: 'Total rainfall from very wet days (>95th percentile). Blue indicates more extreme rainfall events, Red indicates less.'
  },
  {
    index_code: 'r95ptot',
    color_scheme: 'BuRd',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_neutral',
    interpretation: 'Percentage of total rainfall from very wet days. Blue indicates larger share from extreme events, Red indicates smaller share.'
  },
  {
    index_code: 'r99p',
    color_scheme: 'BuRd',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_neutral',
    interpretation: 'Total rainfall from extremely wet days (>99th percentile). Blue indicates more extreme rainfall, Red indicates less.'
  },
  {
    index_code: 'r99ptot',
    color_scheme: 'BuRd',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_neutral',
    interpretation: 'Percentage of total rainfall from extreme days. Blue indicates larger share from extreme events, Red indicates smaller share.'
  },
  {
    index_code: 'sdii',
    color_scheme: 'BuRd',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_neutral',
    interpretation: 'Average rainfall intensity on wet days. Blue indicates higher intensity rainfall, Red indicates lower intensity.'
  },
  {
    index_code: 'rx1day',
    color_scheme: 'BuRd',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_neutral',
    interpretation: 'Maximum 1-day rainfall amount. Blue indicates more intense single-day rainfall, Red indicates less intense.'
  },
  {
    index_code: 'rx5day',
    color_scheme: 'BuRd',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_neutral',
    interpretation: 'Maximum consecutive 5-day rainfall. Blue indicates more intense multi-day rainfall, Red indicates less intense.'
  },

  // TEMPERATURE INDICES - Cold-related
  {
    index_code: 'fd',
    color_scheme: 'RdBu', // Red (warming) to Blue (colder)
    color_palette_type: 'diverging',
    anomaly_direction: 'negative_warming', // Fewer frost days = warming signal
    interpretation: 'Days with minimum temperature <0°C. Blue indicates more frost days (colder), Red indicates fewer frost days (warming signal).'
  },
  {
    index_code: 'csdi',
    color_scheme: 'RdBu',
    color_palette_type: 'diverging',
    anomaly_direction: 'negative_warming',
    interpretation: 'Days in cold spells (TN <10th percentile for ≥6 days). Blue indicates more cold spell days, Red indicates fewer (warming signal).'
  },
  {
    index_code: 'tn10p',
    color_scheme: 'RdBu',
    color_palette_type: 'diverging',
    anomaly_direction: 'negative_warming',
    interpretation: 'Percentage of days with cold nights (TN <10th percentile). Blue indicates more cold nights, Red indicates fewer (warming signal).'
  },
  {
    index_code: 'tx10p',
    color_scheme: 'RdBu',
    color_palette_type: 'diverging',
    anomaly_direction: 'negative_warming',
    interpretation: 'Percentage of days with cool days (TX <10th percentile). Blue indicates more cool days, Red indicates fewer (warming signal).'
  },
  {
    index_code: 'tnn',
    color_scheme: 'RdBu',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_warming',
    interpretation: 'Coldest daily minimum temperature. Red indicates warmer coldest nights (warming), Blue indicates colder extremes.'
  },
  {
    index_code: 'txn',
    color_scheme: 'RdBu',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_warming',
    interpretation: 'Coldest daily maximum temperature. Red indicates warmer coldest days (warming), Blue indicates colder extremes.'
  },

  // TEMPERATURE INDICES - Heat-related
  {
    index_code: 'txge30',
    color_scheme: 'RdBu_r', // Red (bad/hot) to Blue (good/cooler) - reversed
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    interpretation: 'Days with maximum temperature ≥30°C. Red indicates more hot days (heat stress risk), Blue indicates fewer hot days.'
  },
  {
    index_code: 'txx',
    color_scheme: 'RdBu_r',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    interpretation: 'Hottest daily maximum temperature. Red indicates hotter extremes (heat risk), Blue indicates cooler extremes.'
  },
  {
    index_code: 'tnx',
    color_scheme: 'RdBu_r',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    interpretation: 'Hottest daily minimum temperature (hottest night). Red indicates warmer hottest nights (heat stress), Blue indicates cooler nights.'
  },
  {
    index_code: 'wsdi',
    color_scheme: 'RdBu_r',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    interpretation: 'Warm spell duration (heatwaves: TX >90th percentile for ≥6 days). Red indicates more heatwave days (dangerous heat), Blue indicates fewer.'
  },
  {
    index_code: 'tx90p',
    color_scheme: 'RdBu_r',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    interpretation: 'Percentage of hot days (TX >90th percentile). Red indicates more hot days (heat stress), Blue indicates fewer.'
  },
  {
    index_code: 'tn90p',
    color_scheme: 'RdBu_r',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    interpretation: 'Percentage of warm nights (TN >90th percentile). Red indicates more warm nights (heat stress), Blue indicates fewer.'
  },
  {
    index_code: 'tr',
    color_scheme: 'RdBu_r',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    interpretation: 'Tropical nights (minimum temperature ≥20°C). Red indicates more tropical nights (heat stress), Blue indicates fewer.'
  },
  {
    index_code: 'su',
    color_scheme: 'RdBu_r',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    interpretation: 'Summer days (maximum temperature ≥25°C). Red indicates more summer days (warming), Blue indicates fewer.'
  },

  // TEMPERATURE VARIABILITY
  {
    index_code: 'dtr',
    color_scheme: 'RdBu',
    color_palette_type: 'diverging',
    anomaly_direction: 'neutral',
    interpretation: 'Diurnal Temperature Range (daily max - daily min). Indicates temperature variability between day and night.'
  }
];

async function updateClimateIndices() {
  console.log('Updating climate indices with SAEON-based color schemes...\n');

  try {
    // First, add new columns if they don't exist
    await query(`
      ALTER TABLE public.climate_indices
      ADD COLUMN IF NOT EXISTS color_palette_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS anomaly_direction VARCHAR(50)
    `);

    console.log('✓ Added new columns to climate_indices table\n');

    let updatedCount = 0;

    for (const index of UPDATED_INDICES) {
      const result = await query(`
        UPDATE public.climate_indices
        SET
          color_scheme = $1,
          color_palette_type = $2,
          anomaly_direction = $3,
          interpretation = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE index_code = $5
      `, [
        index.color_scheme,
        index.color_palette_type,
        index.anomaly_direction,
        index.interpretation,
        index.index_code
      ]);

      if (result.rowCount > 0) {
        console.log(`✓ Updated ${index.index_code.toUpperCase().padEnd(10)} | ${index.color_scheme.padEnd(10)} | ${index.anomaly_direction}`);
        updatedCount++;
      } else {
        console.log(`✗ Index not found: ${index.index_code}`);
      }
    }

    console.log(`\n✓ Successfully updated ${updatedCount} climate indices`);

    // Display summary
    const summary = await query(`
      SELECT
        color_palette_type,
        COUNT(*) as count,
        string_agg(index_code, ', ' ORDER BY index_code) as indices
      FROM public.climate_indices
      WHERE is_active = true
      GROUP BY color_palette_type
      ORDER BY color_palette_type
    `);

    console.log('\n📊 Summary by Color Palette Type:');
    console.log('=====================================');
    summary.rows.forEach(row => {
      console.log(`${row.color_palette_type}: ${row.count} indices`);
      console.log(`  ${row.indices}\n`);
    });

  } catch (error) {
    console.error('Error updating climate indices:', error);
    throw error;
  }
}

// Run the update
updateClimateIndices()
  .then(() => {
    console.log('\n✓ Climate indices update completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Failed to update climate indices:', error);
    process.exit(1);
  });
