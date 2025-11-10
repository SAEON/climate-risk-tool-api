/**
 * Verify District Data
 */

import db from '../src/config/database.js';

async function verifyDistricts() {
  console.log('========================================');
  console.log('  District Data Verification');
  console.log('========================================\n');

  try {
    await db.testConnection();

    // Count total districts
    const districtCount = await db.query(`
      SELECT COUNT(DISTINCT district_code) as count
      FROM public.municipalities
      WHERE district_code IS NOT NULL
    `);
    console.log(`✓ Total districts: ${districtCount.rows[0].count}\n`);

    // Districts with municipality counts
    const districts = await db.query(`
      SELECT
        district_code,
        district_name,
        province,
        COUNT(*) as municipality_count
      FROM public.municipalities
      WHERE district_code IS NOT NULL
      GROUP BY district_code, district_name, province
      ORDER BY province, district_code
    `);

    console.log('Districts by Province:');
    console.log('='.repeat(90));
    console.log('Code     | District Name              | Province | Municipalities');
    console.log('-'.repeat(90));

    let currentProvince = '';
    districts.rows.forEach(row => {
      if (row.province !== currentProvince) {
        if (currentProvince !== '') console.log('-'.repeat(90));
        currentProvince = row.province;
      }
      console.log(
        `${row.district_code.padEnd(8)} | ` +
        `${(row.district_name || 'Unknown').substring(0, 26).padEnd(26)} | ` +
        `${row.province.padEnd(8)} | ` +
        `${row.municipality_count}`
      );
    });
    console.log('='.repeat(90));

    // Sample municipalities
    const sample = await db.query(`
      SELECT
        municipality_name,
        district_code,
        district_name,
        province
      FROM public.municipalities
      WHERE district_code IS NOT NULL
      ORDER BY province, district_code
      LIMIT 10
    `);

    console.log('\nSample Municipalities with District Info:');
    console.log('='.repeat(90));
    console.log('Municipality              | District  | District Name              | Province');
    console.log('-'.repeat(90));
    sample.rows.forEach(row => {
      console.log(
        `${row.municipality_name.substring(0, 25).padEnd(25)} | ` +
        `${row.district_code.padEnd(9)} | ` +
        `${(row.district_name || '').substring(0, 26).padEnd(26)} | ` +
        `${row.province}`
      );
    });
    console.log('='.repeat(90));

    // Check for missing district data
    const missingDistrict = await db.query(`
      SELECT COUNT(*) as count
      FROM public.municipalities
      WHERE district_code IS NULL OR district_name IS NULL
    `);

    console.log(`\n✓ Municipalities without district data: ${missingDistrict.rows[0].count}`);

    // District-level climate aggregation example
    console.log('\n' + '='.repeat(90));
    console.log('DISTRICT-LEVEL CLIMATE RISK AGGREGATION (SSP585, Far-term)');
    console.log('='.repeat(90));

    const districtRisk = await db.query(`
      SELECT
        m.district_code,
        m.district_name,
        m.province,
        COUNT(DISTINCT m.id) as municipality_count,
        ROUND(AVG(cd.txge30)::numeric, 1) as avg_hot_days_increase,
        ROUND(AVG(cd.wsdi)::numeric, 1) as avg_heatwave_days,
        ROUND(AVG(cd.cdd)::numeric, 1) as avg_drought_days,
        ROUND(AVG(cd.prcptot)::numeric, 1) as avg_precip_change
      FROM public.municipalities m
      JOIN public.climate_data cd ON cd.municipality_id = m.id
      WHERE cd.scenario = 'ssp585'
        AND cd.period = 'far-term_2081-2100'
        AND m.district_code IS NOT NULL
      GROUP BY m.district_code, m.district_name, m.province
      ORDER BY avg_hot_days_increase DESC
      LIMIT 10
    `);

    console.log('Top 10 Most At-Risk Districts (Average across municipalities):');
    console.log('-'.repeat(90));
    console.log('District      | Name                     | Prov | Munis | Hot Days↑ | Heatwave↑ | Drought↑');
    console.log('-'.repeat(90));

    districtRisk.rows.forEach((row, idx) => {
      console.log(
        `${String(idx + 1).padStart(2)}. ${row.district_code.padEnd(8)} | ` +
        `${(row.district_name || '').substring(0, 24).padEnd(24)} | ` +
        `${row.province.padEnd(4)} | ` +
        `${String(row.municipality_count).padStart(5)} | ` +
        `${String(row.avg_hot_days_increase).padStart(9)} | ` +
        `${String(row.avg_heatwave_days).padStart(9)} | ` +
        `${String(row.avg_drought_days).padStart(8)}`
      );
    });
    console.log('='.repeat(90));

    console.log('\n✓ District data verification complete!\n');

  } catch (error) {
    console.error('✗ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await db.closePool();
  }
}

verifyDistricts();
