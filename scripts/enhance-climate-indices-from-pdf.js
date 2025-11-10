/**
 * Enhance Climate Indices with Authoritative SAEON Definitions
 * Source: Downscaled Climate Change Projections for SA v1.0.pdf
 * Tables 3 & 4: WMO-ETCCDI Extreme Climate Indices
 */

import { query } from '../src/config/database.js';

// Enhanced index definitions from SAEON PDF
const ENHANCED_INDICES = [
  // TEMPERATURE INDICES (Table 3)
  {
    index_code: 'csdi',
    index_name: 'Cold Spell Duration Index',
    technical_definition: 'Annual number of days contributing to events where six or more consecutive days experience TN < 10th percentile',
    plain_language: 'Number of days contributing to a cold period (where the period has to be at least 6 days long)',
    sector: 'H, AFS',
    unit: 'days'
  },
  {
    index_code: 'fd',
    index_name: 'Frost Days',
    technical_definition: 'Number of days when TN < 0°C',
    plain_language: 'Days when the minimum temperature is below 0°C',
    sector: 'H, AFS',
    unit: 'days'
  },
  {
    index_code: 'tn10p',
    index_name: 'Percentage of Cold Nights',
    technical_definition: 'Percentage of days when TN < 10th percentile',
    plain_language: 'Fraction of days with cold nighttime temperatures',
    sector: 'All',
    unit: '%'
  },
  {
    index_code: 'tn90p',
    index_name: 'Percentage of Warm Nights',
    technical_definition: 'Percentage of days when TN > 90th percentile',
    plain_language: 'Fraction of days with warm nighttime temperatures',
    sector: 'All',
    unit: '%'
  },
  {
    index_code: 'tnlt2',
    index_name: 'Cold Nights Below 2°C',
    technical_definition: 'Number of days when TN < 2°C',
    plain_language: 'Days when the minimum temperature is below 2°C',
    sector: 'AFS',
    unit: 'days'
  },
  {
    index_code: 'tnn',
    index_name: 'Annual Minimum of Daily Minimum Temperature',
    technical_definition: 'Coldest daily TN',
    plain_language: 'Coldest night of the year',
    sector: 'AFS',
    unit: '°C'
  },
  {
    index_code: 'tnx',
    index_name: 'Annual Maximum of Daily Minimum Temperature',
    technical_definition: 'Warmest daily TN',
    plain_language: 'Hottest night of the year',
    sector: 'All',
    unit: '°C'
  },
  {
    index_code: 'tx10p',
    index_name: 'Percentage of Cool Days',
    technical_definition: 'Percentage of days when TX < 10th percentile',
    plain_language: 'Fraction of days with cool daytime temperatures',
    sector: 'All',
    unit: '%'
  },
  {
    index_code: 'tx90p',
    index_name: 'Percentage of Hot Days',
    technical_definition: 'Percentage of days when TX > 90th percentile',
    plain_language: 'Fraction of days with hot daytime temperatures',
    sector: 'All',
    unit: '%'
  },
  {
    index_code: 'txd_tnd',
    index_name: 'Hot Days and Nights Combined',
    technical_definition: 'Annual count of d consecutive days where both TX > 95th percentile and TN > 95th percentile',
    plain_language: 'Number of heatwave events (both hot days and hot nights)',
    sector: 'H, AFS, WRH',
    unit: 'events'
  },
  {
    index_code: 'txge30',
    index_name: 'Hot Days (≥30°C)',
    technical_definition: 'Number of days when TX ≥ 30°C',
    plain_language: 'Days when maximum temperature is at least 30°C',
    sector: 'H, AFS',
    unit: 'days'
  },
  {
    index_code: 'txgt50p',
    index_name: 'Days Above Median Temperature',
    technical_definition: 'Percentage of days where TX > 50th percentile',
    plain_language: 'Fraction of days with above-median temperature',
    sector: 'H, AFS, WRH',
    unit: '%'
  },
  {
    index_code: 'txn',
    index_name: 'Annual Minimum of Daily Maximum Temperature',
    technical_definition: 'Coldest daily TX',
    plain_language: 'Coldest day of the year',
    sector: 'All',
    unit: '°C'
  },
  {
    index_code: 'txx',
    index_name: 'Annual Maximum of Daily Maximum Temperature',
    technical_definition: 'Warmest daily TX',
    plain_language: 'Hottest day of the year',
    sector: 'AFS',
    unit: '°C'
  },
  {
    index_code: 'wsdi',
    index_name: 'Warm Spell Duration Index',
    technical_definition: 'Annual number of days contributing to events where six or more consecutive days experience TX > 90th percentile',
    plain_language: 'Number of days contributing to a warm period/heatwave (where the period has to be at least 6 days long)',
    sector: 'H, AFS, WRH',
    unit: 'days'
  },

  // PRECIPITATION INDICES (Table 4)
  {
    index_code: 'cdd',
    index_name: 'Consecutive Dry Days',
    technical_definition: 'Maximum number of consecutive dry days (when PR < 1.0 mm)',
    plain_language: 'Longest dry spell',
    sector: 'H, AFS, WRH',
    unit: 'days'
  },
  {
    index_code: 'cwd',
    index_name: 'Consecutive Wet Days',
    technical_definition: 'Maximum annual number of consecutive wet days (when PR ≥ 1.0 mm)',
    plain_language: 'The longest wet spell',
    sector: 'All',
    unit: 'days'
  },
  {
    index_code: 'r10mm',
    index_name: 'Number of Heavy Rain Days',
    technical_definition: 'Number of days when PR ≥ 10 mm',
    plain_language: 'Days when rainfall is at least 10mm',
    sector: 'All',
    unit: 'days'
  },
  {
    index_code: 'r20mm',
    index_name: 'Number of Very Heavy Rain Days',
    technical_definition: 'Number of days when PR ≥ 20 mm',
    plain_language: 'Days when rainfall is at least 20mm',
    sector: 'AFS, WRH',
    unit: 'days'
  },
  {
    index_code: 'r95ptot',
    index_name: 'Contribution from Very Wet Days',
    technical_definition: '100 × R95p / PRCPTOT',
    plain_language: 'Fraction of total wet-day rainfall that comes from very wet days',
    sector: 'AFS, WRH',
    unit: '%'
  },
  {
    index_code: 'r99ptot',
    index_name: 'Contribution from Extremely Wet Days',
    technical_definition: '100 × R99p / PRCPTOT',
    plain_language: 'Fraction of total wet-day rainfall that comes from extremely wet days',
    sector: 'AFS, WRH',
    unit: '%'
  },
  {
    index_code: 'r95p',
    index_name: 'Total Annual Precipitation from Very Wet Days',
    technical_definition: 'Annual sum of daily PR > 95th percentile',
    plain_language: 'Amount of rainfall from very wet days',
    sector: 'All',
    unit: 'mm'
  },
  {
    index_code: 'r99p',
    index_name: 'Total Annual Precipitation from Extremely Wet Days',
    technical_definition: 'Annual sum of daily PR > 99th percentile',
    plain_language: 'Amount of rainfall from extremely wet days',
    sector: 'All',
    unit: 'mm'
  },
  {
    index_code: 'rx1day',
    index_name: 'Maximum 1-Day Precipitation',
    technical_definition: 'Maximum 1-day PR total',
    plain_language: 'The maximum amount of rain that falls in one day',
    sector: 'All',
    unit: 'mm'
  },
  {
    index_code: 'rx5day',
    index_name: 'Maximum 5-Day Precipitation',
    technical_definition: 'Maximum 5-day PR total',
    plain_language: 'The maximum amount of rain that falls in five consecutive days',
    sector: 'All',
    unit: 'mm'
  },
  {
    index_code: 'sdii',
    index_name: 'Simple Daily Intensity Index',
    technical_definition: 'Annual total PR divided by the number of wet days (when total PR ≥ 1.0 mm)',
    plain_language: 'Average daily wet-day rainfall intensity',
    sector: 'All',
    unit: 'mm/day'
  },
  {
    index_code: 'prcptot',
    index_name: 'Total Wet-Day Precipitation',
    technical_definition: 'Annual total precipitation from wet days (PR ≥ 1 mm)',
    plain_language: 'Total rainfall from days with at least 1mm of rain',
    sector: 'All',
    unit: 'mm'
  },
  {
    index_code: 'dtr',
    index_name: 'Mean Diurnal Temperature Range',
    technical_definition: 'Mean difference between daily maximum and minimum temperature',
    plain_language: 'Average difference between daytime high and nighttime low temperatures',
    sector: 'All',
    unit: '°C'
  }
];

async function enhanceClimateIndices() {
  console.log('Enhancing climate indices with SAEON authoritative definitions...\n');

  try {
    // Add new columns if they don't exist
    console.log('Adding new database columns...');
    await query(`
      ALTER TABLE public.climate_indices
      ADD COLUMN IF NOT EXISTS technical_definition TEXT,
      ADD COLUMN IF NOT EXISTS plain_language_description TEXT,
      ADD COLUMN IF NOT EXISTS sector VARCHAR(50)
    `);

    console.log('✓ Database schema updated\n');

    let updatedCount = 0;
    let notFoundCount = 0;

    console.log('Updating indices with enhanced definitions:\n');
    console.log('Index Code | Status | Sector');
    console.log('-----------|--------|-------');

    for (const index of ENHANCED_INDICES) {
      const result = await query(`
        UPDATE public.climate_indices
        SET
          index_name = $1,
          technical_definition = $2,
          plain_language_description = $3,
          sector = $4,
          unit = $5,
          description = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE index_code = $6
      `, [
        index.index_name,
        index.technical_definition,
        index.plain_language,
        index.sector,
        index.unit,
        index.index_code
      ]);

      if (result.rowCount > 0) {
        console.log(`${index.index_code.padEnd(11)}| ✓ Updated | ${index.sector}`);
        updatedCount++;
      } else {
        console.log(`${index.index_code.padEnd(11)}| ✗ Not found`);
        notFoundCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✓ Updated: ${updatedCount} indices`);
    console.log(`✗ Not found: ${notFoundCount} indices`);

    // Display sector summary
    const sectorSummary = await query(`
      SELECT
        sector,
        COUNT(*) as count,
        string_agg(index_code, ', ' ORDER BY index_code) as indices
      FROM public.climate_indices
      WHERE is_active = true AND sector IS NOT NULL
      GROUP BY sector
      ORDER BY count DESC
    `);

    console.log('\n📊 Summary by Sector Classification:');
    console.log('=====================================');
    sectorSummary.rows.forEach(row => {
      console.log(`\n${row.sector}:`);
      console.log(`  Count: ${row.count}`);
      console.log(`  Indices: ${row.indices}`);
    });

    // Show sample enhanced record
    const sample = await query(`
      SELECT index_code, index_name, technical_definition, plain_language_description, sector, unit
      FROM public.climate_indices
      WHERE index_code = 'cdd'
    `);

    console.log('\n📝 Sample Enhanced Record (CDD):');
    console.log('=====================================');
    console.log(`Code: ${sample.rows[0].index_code}`);
    console.log(`Name: ${sample.rows[0].index_name}`);
    console.log(`Technical: ${sample.rows[0].technical_definition}`);
    console.log(`Plain Language: ${sample.rows[0].plain_language_description}`);
    console.log(`Sector: ${sample.rows[0].sector}`);
    console.log(`Unit: ${sample.rows[0].unit}`);

  } catch (error) {
    console.error('Error enhancing climate indices:', error);
    throw error;
  }
}

// Run the enhancement
enhanceClimateIndices()
  .then(() => {
    console.log('\n✓ Climate indices enhancement completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Failed to enhance climate indices:', error);
    process.exit(1);
  });
