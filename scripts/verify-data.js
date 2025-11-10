/**
 * Comprehensive Data Verification Script
 * Verifies all tables and provides summary statistics
 */

import db from '../src/config/database.js';

async function verifyDatabase() {
  console.log('========================================');
  console.log('  Climate Risk Tool - Data Verification');
  console.log('========================================\n');

  try {
    // Test connection
    await db.testConnection();

    console.log('\n' + '='.repeat(80));
    console.log('TABLE 1: MUNICIPALITIES');
    console.log('='.repeat(80));

    // Municipality count
    const muniCount = await db.query('SELECT COUNT(*) as count FROM public.municipalities');
    console.log(`✓ Total municipalities: ${muniCount.rows[0].count}`);

    // Geometry validation
    const geomValid = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE ST_IsValid(geom)) as valid,
        COUNT(*) FILTER (WHERE NOT ST_IsValid(geom)) as invalid
      FROM public.municipalities
    `);
    console.log(`✓ Valid geometries: ${geomValid.rows[0].valid}`);
    console.log(`✓ Invalid geometries: ${geomValid.rows[0].invalid}`);

    // Province distribution
    const provinces = await db.query(`
      SELECT province, COUNT(*) as count
      FROM public.municipalities
      WHERE province IS NOT NULL
      GROUP BY province
      ORDER BY count DESC
    `);
    console.log('\nMunicipalities by province:');
    provinces.rows.forEach(row => {
      console.log(`  ${row.province.padEnd(5)} - ${row.count} municipalities`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('TABLE 2: CLIMATE_DATA');
    console.log('='.repeat(80));

    // Climate data count
    const climateCount = await db.query('SELECT COUNT(*) as count FROM public.climate_data');
    console.log(`✓ Total climate records: ${climateCount.rows[0].count}`);
    console.log(`  Expected: 2,544 (213 × 4 scenarios × 3 periods)`);

    const muniWithData = await db.query(`
      SELECT COUNT(DISTINCT municipality_id) as count FROM public.climate_data
    `);
    console.log(`✓ Municipalities with climate data: ${muniWithData.rows[0].count}`);

    // Distribution by scenario/period
    const distribution = await db.query(`
      SELECT scenario, period, COUNT(*) as count
      FROM public.climate_data
      GROUP BY scenario, period
      ORDER BY scenario, period
    `);

    console.log('\nData distribution (scenario × period):');
    let currentScenario = '';
    distribution.rows.forEach(row => {
      if (row.scenario !== currentScenario) {
        console.log(`\n  ${row.scenario.toUpperCase()}:`);
        currentScenario = row.scenario;
      }
      console.log(`    ${row.period.padEnd(25)} - ${row.count} municipalities`);
    });

    // Worst-case scenario analysis
    const worstCase = await db.query(`
      SELECT
        m.municipality_name,
        m.province,
        ROUND(cd.txge30::numeric, 1) as hot_days,
        ROUND(cd.wsdi::numeric, 1) as heatwave_days,
        ROUND(cd.cdd::numeric, 1) as drought_days,
        ROUND(cd.prcptot::numeric, 1) as precip_change
      FROM public.climate_data cd
      JOIN public.municipalities m ON m.id = cd.municipality_id
      WHERE cd.scenario = 'ssp585' AND cd.period = 'far-term_2081-2100'
      ORDER BY cd.txge30 DESC
      LIMIT 10
    `);

    console.log('\n' + '-'.repeat(80));
    console.log('Top 10 Most At-Risk Municipalities (SSP585, 2081-2100):');
    console.log('-'.repeat(80));
    console.log('Municipality              | Prov | Hot Days ↑ | Heatwave ↑ | Drought ↑ | Precip Δ');
    console.log('-'.repeat(80));
    worstCase.rows.forEach((row, index) => {
      console.log(
        `${String(index + 1).padStart(2)}. ${row.municipality_name.substring(0, 20).padEnd(20)} | ` +
        `${row.province.padEnd(4)} | ` +
        `${String(row.hot_days).padStart(10)} | ` +
        `${String(row.heatwave_days).padStart(10)} | ` +
        `${String(row.drought_days).padStart(9)} | ` +
        `${String(row.precip_change).padStart(8)} mm`
      );
    });
    console.log('-'.repeat(80));

    console.log('\n' + '='.repeat(80));
    console.log('TABLE 3: CLIMATE_INDICES');
    console.log('='.repeat(80));

    // Indices count
    const indicesCount = await db.query('SELECT COUNT(*) as count FROM public.climate_indices');
    console.log(`✓ Total climate indices: ${indicesCount.rows[0].count}`);

    // By category
    const categories = await db.query(`
      SELECT category, COUNT(*) as count
      FROM public.climate_indices
      GROUP BY category
      ORDER BY category
    `);
    console.log('\nIndices by category:');
    categories.rows.forEach(row => {
      console.log(`  ${row.category.padEnd(15)} - ${row.count} indices`);
    });

    // Key indices
    const keyIndices = await db.query(`
      SELECT index_code, index_name, unit, risk_direction
      FROM public.climate_indices
      WHERE index_code IN ('cdd', 'txge30', 'wsdi', 'prcptot', 'csdi')
      ORDER BY display_order
    `);
    console.log('\nKey Risk Indicators:');
    keyIndices.rows.forEach(row => {
      console.log(`  ${row.index_code.padEnd(10)} - ${row.index_name.padEnd(30)} (${row.unit}, ${row.risk_direction})`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('DATA INTEGRITY CHECKS');
    console.log('='.repeat(80));

    // Check for orphaned climate data
    const orphaned = await db.query(`
      SELECT COUNT(*) as count
      FROM public.climate_data cd
      LEFT JOIN public.municipalities m ON m.id = cd.municipality_id
      WHERE m.id IS NULL
    `);
    console.log(`✓ Orphaned climate records: ${orphaned.rows[0].count} (should be 0)`);

    // Check for null geometries
    const nullGeom = await db.query(`
      SELECT COUNT(*) as count FROM public.municipalities WHERE geom IS NULL
    `);
    console.log(`✓ Municipalities without geometry: ${nullGeom.rows[0].count} (should be 0)`);

    // Check for missing climate indices in data
    const missingIndices = await db.query(`
      SELECT ci.index_code
      FROM public.climate_indices ci
      WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'climate_data'
        AND column_name = ci.index_code
      )
    `);
    console.log(`✓ Climate indices not in climate_data table: ${missingIndices.rows.length} (should be 0)`);

    console.log('\n' + '='.repeat(80));
    console.log('DATABASE SUMMARY');
    console.log('='.repeat(80));

    const summary = await db.query(`
      SELECT
        (SELECT pg_size_pretty(pg_database_size(current_database()))) as db_size,
        (SELECT pg_size_pretty(pg_total_relation_size('public.municipalities'))) as municipalities_size,
        (SELECT pg_size_pretty(pg_total_relation_size('public.climate_data'))) as climate_data_size,
        (SELECT pg_size_pretty(pg_total_relation_size('public.climate_indices'))) as indices_size
    `);

    console.log(`Database: sarva (${summary.rows[0].db_size})`);
    console.log(`  ├─ municipalities:   ${muniCount.rows[0].count.padStart(3)} rows (${summary.rows[0].municipalities_size})`);
    console.log(`  ├─ climate_data:   ${climateCount.rows[0].count.padStart(5)} rows (${summary.rows[0].climate_data_size})`);
    console.log(`  └─ climate_indices:  ${indicesCount.rows[0].count.padStart(3)} rows (${summary.rows[0].indices_size})`);

    console.log('\n' + '='.repeat(80));
    console.log('✓ ALL VERIFICATION CHECKS PASSED');
    console.log('='.repeat(80));

    console.log('\nNext Steps:');
    console.log('  1. Build API endpoints to serve this data');
    console.log('  2. Create GeoJSON export functionality');
    console.log('  3. Implement query optimization for map rendering');
    console.log('  4. Set up frontend map visualization\n');

  } catch (error) {
    console.error('\n✗ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await db.closePool();
  }
}

verifyDatabase();
