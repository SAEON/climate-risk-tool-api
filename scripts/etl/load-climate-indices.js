/**
 * ETL Script: Load Climate Indices Metadata
 *
 * Populates the climate_indices table with metadata for all 27 climate indices
 * including descriptions, units, interpretation guidelines, and visualization settings
 */

import db from '../../src/config/database.js';

/**
 * Climate indices metadata based on "How to read the layers.pdf"
 * All indices represent anomalies (changes) from 1995-2014 baseline
 */
const CLIMATE_INDICES = [
  // ========================================================================
  // PRECIPITATION INDICES
  // ========================================================================
  {
    index_code: 'cdd',
    index_name: 'Consecutive Dry Days',
    category: 'precipitation',
    description: 'Longest run of days with precipitation < 1 mm within each year/period. Critical drought indicator.',
    plain_language_description: 'How many days in a row without significant rainfall',
    technical_definition: 'Maximum number of consecutive days with daily precipitation < 1mm, calculated annually and averaged over the specified time period',
    sector: 'H, AFS, WRH',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    unit: 'days',
    interpretation: 'Positive values indicate longer dry spells. Higher values = increased drought risk.',
    risk_direction: 'higher_worse',
    display_order: 1,
    color_scheme: 'YlOrRd'
  },
  {
    index_code: 'cwd',
    index_name: 'Consecutive Wet Days',
    category: 'precipitation',
    description: 'Longest run of days with precipitation ≥ 1 mm within each year/period.',
    plain_language_description: 'How many days in a row with rainfall',
    technical_definition: 'Maximum number of consecutive days with daily precipitation ≥ 1mm, calculated annually and averaged over the specified time period',
    sector: 'H, AFS',
    color_palette_type: 'diverging',
    anomaly_direction: 'neutral',
    unit: 'days',
    interpretation: 'Positive values indicate longer wet periods. Can indicate flood risk if very high.',
    risk_direction: 'neutral',
    display_order: 2,
    color_scheme: 'BuGn'
  },
  {
    index_code: 'prcptot',
    index_name: 'Total Precipitation',
    category: 'precipitation',
    description: 'Total precipitation on wet days (≥ 1 mm) over the aggregation period.',
    plain_language_description: 'Total amount of rainfall over the period',
    technical_definition: 'Sum of daily precipitation amounts on wet days (≥ 1mm) over the aggregation period',
    sector: 'H, AFS, WRH',
    color_palette_type: 'diverging',
    anomaly_direction: 'neutral',
    unit: 'mm',
    interpretation: 'Negative values = drier conditions. Positive values = wetter conditions.',
    risk_direction: 'neutral',
    display_order: 3,
    color_scheme: 'BrBG'
  },
  {
    index_code: 'r10mm',
    index_name: 'Heavy Precipitation Days (≥10mm)',
    category: 'precipitation',
    description: 'Count of days with precipitation ≥ 10 mm.',
    plain_language_description: 'Number of days with heavy rainfall (≥10mm)',
    technical_definition: 'Annual count of days with daily precipitation ≥ 10mm, averaged over the specified time period',
    sector: 'H, WRH',
    color_palette_type: 'diverging',
    anomaly_direction: 'neutral',
    unit: 'days',
    interpretation: 'Positive values indicate more heavy rainfall events.',
    risk_direction: 'neutral',
    display_order: 4,
    color_scheme: 'Blues'
  },
  {
    index_code: 'r20mm',
    index_name: 'Very Heavy Precipitation Days (≥20mm)',
    category: 'precipitation',
    description: 'Count of days with precipitation ≥ 20 mm.',
    plain_language_description: 'Number of days with very heavy rainfall (≥20mm)',
    technical_definition: 'Annual count of days with daily precipitation ≥ 20mm, averaged over the specified time period',
    sector: 'H, WRH',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    unit: 'days',
    interpretation: 'Positive values indicate more very heavy rainfall events. Flood risk indicator.',
    risk_direction: 'higher_worse',
    display_order: 5,
    color_scheme: 'Blues'
  },
  {
    index_code: 'r95p',
    index_name: 'Very Wet Days Precipitation',
    category: 'precipitation',
    description: 'Total rain from days above the 95th percentile (wet-day threshold, baseline 1995-2014).',
    plain_language_description: 'Total rainfall from extremely wet days (top 5% wettest)',
    technical_definition: 'Sum of daily precipitation amounts on days exceeding the 95th percentile of wet-day precipitation during the baseline period (1995-2014)',
    sector: 'H, WRH',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    unit: 'mm',
    interpretation: 'Higher values indicate more extreme precipitation from very wet days.',
    risk_direction: 'higher_worse',
    display_order: 6,
    color_scheme: 'PuBu'
  },
  {
    index_code: 'r95ptot',
    index_name: 'Fraction from Very Wet Days',
    category: 'precipitation',
    description: 'Fraction of wet-day precipitation from very wet days (>95th percentile).',
    plain_language_description: 'Percentage of total rain from extremely wet days',
    technical_definition: 'Ratio of precipitation from days exceeding the 95th percentile to total wet-day precipitation, expressed as percentage points',
    sector: 'H, WRH',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    unit: 'percentage points',
    interpretation: 'Higher values indicate precipitation becoming more concentrated in extreme events.',
    risk_direction: 'higher_worse',
    display_order: 7,
    color_scheme: 'PuBu'
  },
  {
    index_code: 'r99p',
    index_name: 'Extremely Wet Days Precipitation',
    category: 'precipitation',
    description: 'Total rain from days above the 99th percentile (baseline 1995-2014).',
    plain_language_description: 'Total rainfall from the wettest 1% of days',
    technical_definition: 'Sum of daily precipitation amounts on days exceeding the 99th percentile of wet-day precipitation during the baseline period (1995-2014)',
    sector: 'H, WRH',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    unit: 'mm',
    interpretation: 'Higher values indicate more extreme precipitation from extremely wet days.',
    risk_direction: 'higher_worse',
    display_order: 8,
    color_scheme: 'PuBu'
  },
  {
    index_code: 'r99ptot',
    index_name: 'Fraction from Extremely Wet Days',
    category: 'precipitation',
    description: 'Fraction of wet-day precipitation from extremely wet days (>99th percentile).',
    plain_language_description: 'Percentage of total rain from the wettest 1% of days',
    technical_definition: 'Ratio of precipitation from days exceeding the 99th percentile to total wet-day precipitation, expressed as percentage points',
    sector: 'H, WRH',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    unit: 'percentage points',
    interpretation: 'Higher values indicate precipitation becoming highly concentrated in rare extreme events.',
    risk_direction: 'higher_worse',
    display_order: 9,
    color_scheme: 'PuBu'
  },
  {
    index_code: 'rx1day',
    index_name: 'Maximum 1-Day Precipitation',
    category: 'precipitation',
    description: 'Maximum 1-day precipitation amount within each period.',
    plain_language_description: 'Highest rainfall recorded in a single day',
    technical_definition: 'Annual maximum of daily precipitation amounts, averaged over the specified time period',
    sector: 'H, WRH',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    unit: 'mm',
    interpretation: 'Higher values indicate more intense single-day rainfall events. Flash flood indicator.',
    risk_direction: 'higher_worse',
    display_order: 10,
    color_scheme: 'Blues'
  },
  {
    index_code: 'rx5day',
    index_name: 'Maximum 5-Day Precipitation',
    category: 'precipitation',
    description: 'Maximum consecutive 5-day precipitation amount within each period.',
    plain_language_description: 'Highest rainfall recorded over any 5-day period',
    technical_definition: 'Annual maximum of consecutive 5-day precipitation totals, averaged over the specified time period',
    sector: 'H, WRH',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    unit: 'mm',
    interpretation: 'Higher values indicate more intense multi-day rainfall. Sustained flooding indicator.',
    risk_direction: 'higher_worse',
    display_order: 11,
    color_scheme: 'Blues'
  },
  {
    index_code: 'sdii',
    index_name: 'Simple Daily Intensity Index',
    category: 'precipitation',
    description: 'Mean precipitation on wet days (total wet-day precipitation ÷ number of wet days).',
    plain_language_description: 'Average rainfall amount on rainy days',
    technical_definition: 'Total wet-day precipitation divided by the number of wet days (≥ 1mm), indicating average intensity per wet day',
    sector: 'H, AFS',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    unit: 'mm/day',
    interpretation: 'Higher values indicate rainfall becoming more intense per wet day.',
    risk_direction: 'higher_worse',
    display_order: 12,
    color_scheme: 'PuBu'
  },

  // ========================================================================
  // TEMPERATURE INDICES
  // ========================================================================
  {
    index_code: 'fd',
    index_name: 'Frost Days',
    category: 'temperature',
    description: 'Count of days with minimum temperature < 0°C.',
    plain_language_description: 'Number of days cold enough to freeze water',
    technical_definition: 'Annual count of days with daily minimum temperature below 0°C, averaged over the specified time period',
    sector: 'AFS',
    color_palette_type: 'diverging',
    anomaly_direction: 'negative_warming',
    unit: 'days',
    interpretation: 'Negative values = fewer frost days (warming). Important for agriculture.',
    risk_direction: 'lower_worse',
    display_order: 13,
    color_scheme: 'RdBu'
  },
  {
    index_code: 'tnlt2',
    index_name: 'Cold Nights Below 2°C',
    category: 'temperature',
    description: 'Count of days with minimum temperature < 2°C.',
    plain_language_description: 'Number of nights colder than 2°C',
    technical_definition: 'Annual count of days with daily minimum temperature below 2°C, averaged over the specified time period',
    sector: 'AFS',
    color_palette_type: 'diverging',
    anomaly_direction: 'negative_warming',
    unit: 'days',
    interpretation: 'Negative values = fewer cold nights (warming).',
    risk_direction: 'lower_worse',
    display_order: 14,
    color_scheme: 'RdBu'
  },
  {
    index_code: 'txge30',
    index_name: 'Hot Days (≥30°C)',
    category: 'temperature',
    description: 'Count of days with maximum temperature ≥ 30°C. Key heat stress indicator.',
    plain_language_description: 'Number of days where temperature reaches 30°C or higher',
    technical_definition: 'Annual count of days with daily maximum temperature ≥ 30°C, averaged over the specified time period',
    sector: 'All',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    unit: 'days',
    interpretation: 'Positive values = more hot days. Critical for human health, agriculture, and energy demand.',
    risk_direction: 'higher_worse',
    display_order: 15,
    color_scheme: 'YlOrRd'
  },
  {
    index_code: 'txgt50p',
    index_name: 'Days Above Median Temperature',
    category: 'temperature',
    description: 'Share of days where maximum temperature exceeds the 50th-percentile (median) threshold.',
    plain_language_description: 'Percentage of days warmer than the historical average',
    technical_definition: 'Percentage of days with daily maximum temperature exceeding the 50th percentile threshold (baseline median), indicating shift in temperature distribution',
    sector: 'All',
    color_palette_type: 'diverging',
    anomaly_direction: 'neutral',
    unit: 'percentage points',
    interpretation: 'Shift in temperature distribution. Positive values = more days above historical median.',
    risk_direction: 'neutral',
    display_order: 16,
    color_scheme: 'RdYlBu'
  },
  {
    index_code: 'tx10p',
    index_name: 'Cool Days',
    category: 'temperature',
    description: 'Percent of days with maximum temperature below the 10th-percentile (by calendar day, baseline).',
    plain_language_description: 'Percentage of days cooler than normal',
    technical_definition: 'Percentage of days with daily maximum temperature below the calendar day 10th percentile (baseline period), indicating frequency of cool days',
    sector: 'All',
    color_palette_type: 'diverging',
    anomaly_direction: 'neutral',
    unit: 'percentage points',
    interpretation: 'Negative values = fewer cool days (warming trend).',
    risk_direction: 'neutral',
    display_order: 17,
    color_scheme: 'RdBu'
  },
  {
    index_code: 'tx90p',
    index_name: 'Hot Days (90th Percentile)',
    category: 'temperature',
    description: 'Percent of days with maximum temperature above the 90th-percentile (by calendar day, baseline).',
    plain_language_description: 'Percentage of days much hotter than normal',
    technical_definition: 'Percentage of days with daily maximum temperature exceeding the calendar day 90th percentile (baseline period), indicating frequency of hot days',
    sector: 'All',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    unit: 'percentage points',
    interpretation: 'Positive values = more hot days. Heat stress indicator.',
    risk_direction: 'higher_worse',
    display_order: 18,
    color_scheme: 'YlOrRd'
  },
  {
    index_code: 'tn10p',
    index_name: 'Cold Nights',
    category: 'temperature',
    description: 'Percent of days with minimum temperature below the 10th-percentile (by calendar day, baseline).',
    plain_language_description: 'Percentage of nights colder than normal',
    technical_definition: 'Percentage of days with daily minimum temperature below the calendar day 10th percentile (baseline period), indicating frequency of cold nights',
    sector: 'All',
    color_palette_type: 'diverging',
    anomaly_direction: 'neutral',
    unit: 'percentage points',
    interpretation: 'Negative values = fewer cold nights (warming).',
    risk_direction: 'neutral',
    display_order: 19,
    color_scheme: 'RdBu'
  },
  {
    index_code: 'tn90p',
    index_name: 'Warm Nights',
    category: 'temperature',
    description: 'Percent of days with minimum temperature above the 90th-percentile (by calendar day, baseline).',
    plain_language_description: 'Percentage of nights much warmer than normal',
    technical_definition: 'Percentage of days with daily minimum temperature exceeding the calendar day 90th percentile (baseline period), indicating frequency of warm nights',
    sector: 'All',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    unit: 'percentage points',
    interpretation: 'Positive values = more warm nights. Heat stress and energy demand indicator.',
    risk_direction: 'higher_worse',
    display_order: 20,
    color_scheme: 'YlOrRd'
  },
  {
    index_code: 'txx',
    index_name: 'Hottest Day Temperature',
    category: 'temperature',
    description: 'Annual maximum of daily maximum temperature (hottest day), averaged over the slice.',
    plain_language_description: 'Highest daytime temperature recorded',
    technical_definition: 'Annual maximum value of daily maximum temperature, averaged over the specified time period',
    sector: 'All',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    unit: '°C',
    interpretation: 'Positive values = hotter extreme temperatures. Critical for infrastructure and health.',
    risk_direction: 'higher_worse',
    display_order: 21,
    color_scheme: 'OrRd'
  },
  {
    index_code: 'txn',
    index_name: 'Coolest Day Temperature',
    category: 'temperature',
    description: 'Annual minimum of daily maximum temperature (coolest day), averaged over the slice.',
    plain_language_description: 'Lowest daytime temperature recorded',
    technical_definition: 'Annual minimum value of daily maximum temperature, averaged over the specified time period',
    sector: 'All',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    unit: '°C',
    interpretation: 'Warming of coolest days. Positive values = higher minimum daytime temperatures.',
    risk_direction: 'higher_worse',
    display_order: 22,
    color_scheme: 'RdYlBu'
  },
  {
    index_code: 'tnx',
    index_name: 'Warmest Night Temperature',
    category: 'temperature',
    description: 'Annual maximum of daily minimum temperature (warmest night), averaged over the slice.',
    plain_language_description: 'Highest nighttime temperature recorded',
    technical_definition: 'Annual maximum value of daily minimum temperature, averaged over the specified time period',
    sector: 'All',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    unit: '°C',
    interpretation: 'Positive values = warmer nights. Heat stress indicator.',
    risk_direction: 'higher_worse',
    display_order: 23,
    color_scheme: 'OrRd'
  },
  {
    index_code: 'tnn',
    index_name: 'Coldest Night Temperature',
    category: 'temperature',
    description: 'Annual minimum of daily minimum temperature (coldest night), averaged over the slice.',
    plain_language_description: 'Lowest nighttime temperature recorded',
    technical_definition: 'Annual minimum value of daily minimum temperature, averaged over the specified time period',
    sector: 'All',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    unit: '°C',
    interpretation: 'Positive values = warmer coldest nights (warming).',
    risk_direction: 'higher_worse',
    display_order: 24,
    color_scheme: 'RdBu'
  },

  // ========================================================================
  // DURATION/SPELL INDICES
  // ========================================================================
  {
    index_code: 'wsdi',
    index_name: 'Warm Spell Duration Index',
    category: 'duration',
    description: 'Number of days in spells of ≥ 6 consecutive days with maximum temperature > 90th-percentile. Primary heatwave indicator.',
    plain_language_description: 'Total days experiencing heatwaves (6+ consecutive hot days)',
    technical_definition: 'Annual count of days occurring in sequences of at least 6 consecutive days where daily maximum temperature exceeds the calendar day 90th percentile, averaged over the specified time period',
    sector: 'All',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    unit: 'days',
    interpretation: 'Positive values = longer/more frequent heatwaves. Critical health and infrastructure risk.',
    risk_direction: 'higher_worse',
    display_order: 25,
    color_scheme: 'YlOrRd'
  },
  {
    index_code: 'csdi',
    index_name: 'Cold Spell Duration Index',
    category: 'duration',
    description: 'Number of days in spells of ≥ 6 consecutive days with minimum temperature < 10th-percentile.',
    plain_language_description: 'Total days experiencing cold spells (6+ consecutive cold nights)',
    technical_definition: 'Annual count of days occurring in sequences of at least 6 consecutive days where daily minimum temperature is below the calendar day 10th percentile, averaged over the specified time period',
    sector: 'All',
    color_palette_type: 'diverging',
    anomaly_direction: 'negative_warming',
    unit: 'days',
    interpretation: 'Negative values = fewer/shorter cold spells (warming).',
    risk_direction: 'lower_worse',
    display_order: 26,
    color_scheme: 'RdBu'
  },
  {
    index_code: 'txd_tnd',
    index_name: 'Joint Heatwave Events',
    category: 'duration',
    description: 'Count of events where both maximum and minimum temperature exceed their 95th-percentile thresholds for ≥ 3 consecutive days.',
    plain_language_description: 'Number of compound heat events (hot days AND hot nights)',
    technical_definition: 'Annual count of multi-day events where both daily maximum and minimum temperatures simultaneously exceed their respective 95th percentile thresholds for at least 3 consecutive days',
    sector: 'All',
    color_palette_type: 'diverging',
    anomaly_direction: 'positive_bad',
    unit: 'events',
    interpretation: 'Positive values = more compound extreme heat events (day + night). Severe health risk indicator.',
    risk_direction: 'higher_worse',
    display_order: 27,
    color_scheme: 'OrRd'
  }
];

/**
 * Insert climate indices metadata into PostgreSQL
 * @returns {Promise<void>}
 */
async function insertClimateIndices() {
  console.log('\n💾 Inserting climate indices metadata...');

  let successCount = 0;
  let errorCount = 0;

  await db.transaction(async (client) => {
    for (const index of CLIMATE_INDICES) {
      try {
        await client.query(`
          INSERT INTO public.climate_indices (
            index_code,
            index_name,
            category,
            description,
            plain_language_description,
            technical_definition,
            sector,
            unit,
            interpretation,
            risk_direction,
            color_palette_type,
            anomaly_direction,
            display_order,
            color_scheme,
            baseline_period,
            is_active
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, '1995-2014', true
          )
          ON CONFLICT (index_code) DO UPDATE SET
            index_name = EXCLUDED.index_name,
            description = EXCLUDED.description,
            plain_language_description = EXCLUDED.plain_language_description,
            technical_definition = EXCLUDED.technical_definition,
            sector = EXCLUDED.sector,
            interpretation = EXCLUDED.interpretation,
            color_palette_type = EXCLUDED.color_palette_type,
            anomaly_direction = EXCLUDED.anomaly_direction,
            updated_at = CURRENT_TIMESTAMP
        `, [
          index.index_code,
          index.index_name,
          index.category,
          index.description,
          index.plain_language_description,
          index.technical_definition,
          index.sector,
          index.unit,
          index.interpretation,
          index.risk_direction,
          index.color_palette_type,
          index.anomaly_direction,
          index.display_order,
          index.color_scheme
        ]);

        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`   ✗ Error inserting ${index.index_code}:`, error.message);
      }
    }
  });

  console.log(`\n   ✓ Successfully inserted: ${successCount} climate indices`);
  if (errorCount > 0) {
    console.log(`   ✗ Errors: ${errorCount} indices`);
  }
}

/**
 * Verify data loaded correctly
 * @returns {Promise<void>}
 */
async function verifyLoad() {
  console.log('\n📊 Verifying climate indices...');

  // Count total indices
  const countResult = await db.query(`
    SELECT COUNT(*) as count FROM public.climate_indices
  `);
  console.log(`   Total climate indices: ${countResult.rows[0].count}`);
  console.log(`   Expected: 27`);

  // Count by category
  const categoryResult = await db.query(`
    SELECT category, COUNT(*) as count
    FROM public.climate_indices
    GROUP BY category
    ORDER BY category
  `);

  console.log('\n   Distribution by category:');
  console.log('   ' + '='.repeat(50));
  categoryResult.rows.forEach(row => {
    console.log(`   ${row.category.padEnd(20)} | ${row.count} indices`);
  });
  console.log('   ' + '='.repeat(50));

  // Sample indices from each category
  const sampleResult = await db.query(`
    (SELECT * FROM public.climate_indices WHERE category = 'precipitation' ORDER BY display_order LIMIT 2)
    UNION ALL
    (SELECT * FROM public.climate_indices WHERE category = 'temperature' ORDER BY display_order LIMIT 2)
    UNION ALL
    (SELECT * FROM public.climate_indices WHERE category = 'duration' ORDER BY display_order LIMIT 2)
  `);

  console.log('\n   Sample indices:');
  console.log('   ' + '='.repeat(100));
  console.log('   Code       | Name                           | Category       | Unit    | Risk Direction');
  console.log('   ' + '-'.repeat(100));

  sampleResult.rows.forEach(row => {
    console.log(
      `   ${row.index_code.padEnd(10)} | ` +
      `${row.index_name.substring(0, 30).padEnd(30)} | ` +
      `${row.category.padEnd(14)} | ` +
      `${(row.unit || '').padEnd(7)} | ` +
      `${row.risk_direction}`
    );
  });
  console.log('   ' + '='.repeat(100));
}

/**
 * Main ETL process
 */
async function main() {
  console.log('========================================');
  console.log('  ETL: Load Climate Indices Metadata');
  console.log('========================================');

  try {
    // Test database connection
    await db.testConnection();

    // Check if table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'climate_indices'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      throw new Error('climate_indices table does not exist. Run migration first: npm run migrate');
    }

    // Insert climate indices
    await insertClimateIndices();

    // Verify the load
    await verifyLoad();

    console.log('\n========================================');
    console.log('  ✓ ETL Process Complete');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n✗ ETL Process Failed');
    console.error(error);
    process.exit(1);
  } finally {
    await db.closePool();
  }
}

// Run ETL
main();
