/**
 * ETL Script: Load Climate Data from CSV
 *
 * Reads municipality_means_ALL_indices.csv and loads climate anomaly data
 * into the PostgreSQL climate_data table
 */

import { createReadStream } from 'fs';
import csvParser from 'csv-parser';
import db from '../../src/config/database.js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to CSV file
const CSV_PATH = resolve(__dirname, '../../municipality_means_ALL_indices.csv');

/**
 * Parse CSV file and extract climate data
 * @returns {Promise<Array>} Array of climate data objects
 */
async function parseCSV() {
  return new Promise((resolve, reject) => {
    const records = [];

    console.log(`\n📂 Reading CSV: ${CSV_PATH}`);

    createReadStream(CSV_PATH)
      .pipe(csvParser({ columns: true, skip_empty_lines: true }))
      .on('data', (row) => {
        records.push(row);
      })
      .on('end', () => {
        console.log(`   ✓ Parsed ${records.length} rows from CSV`);
        resolve(records);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Get municipality ID from OBJECTID
 * @param {Object} client - Database client
 * @param {number} objectid - OBJECTID from CSV
 * @returns {Promise<number>} municipality_id
 */
async function getMunicipalityId(client, objectid) {
  const result = await client.query(
    'SELECT id FROM public.municipalities WHERE objectid = $1',
    [objectid]
  );

  if (result.rows.length === 0) {
    throw new Error(`Municipality with OBJECTID ${objectid} not found`);
  }

  return result.rows[0].id;
}

/**
 * Insert climate data records into PostgreSQL
 * @param {Array} records - Array of CSV records
 * @returns {Promise<void>}
 */
async function insertClimateData(records) {
  console.log('\n💾 Inserting climate data into PostgreSQL...');

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  // Create a map for municipality IDs to avoid repeated queries
  const municipalityIdMap = new Map();

  await db.transaction(async (client) => {
    // Pre-load all municipality IDs
    console.log('   Loading municipality ID mappings...');
    const muniResult = await client.query('SELECT id, objectid FROM public.municipalities');
    muniResult.rows.forEach(row => {
      municipalityIdMap.set(parseFloat(row.objectid), row.id);
    });
    console.log(`   ✓ Loaded ${municipalityIdMap.size} municipality ID mappings`);

    console.log('   Inserting records...');

    for (const record of records) {
      try {
        const objectid = parseFloat(record.OBJECTID);
        const municipalityId = municipalityIdMap.get(objectid);

        if (!municipalityId) {
          console.warn(`   ⚠ Municipality with OBJECTID ${objectid} not found, skipping`);
          skippedCount++;
          continue;
        }

        // Parse all climate index values
        const parseValue = (val) => val === '' || val === null || val === undefined ? null : parseFloat(val);

        await client.query(`
          INSERT INTO public.climate_data (
            municipality_id, scenario, period,
            cdd, csdi, cwd, fd, prcptot, r10mm, r20mm, r95p, r95ptot, r99p, r99ptot,
            rx1day, rx5day, sdii, tn10p, tn90p, tnlt2, tnn, tnx, tx10p, tx90p,
            txd_tnd, txge30, txgt50p, txn, txx, wsdi
          ) VALUES (
            $1, $2, $3,
            $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
            $25, $26, $27, $28, $29, $30
          )
          ON CONFLICT (municipality_id, scenario, period) DO UPDATE SET
            cdd = EXCLUDED.cdd,
            csdi = EXCLUDED.csdi,
            cwd = EXCLUDED.cwd,
            updated_at = CURRENT_TIMESTAMP
        `, [
          municipalityId,
          record.scenario,
          record.period,
          parseValue(record.cdd),
          parseValue(record.csdi),
          parseValue(record.cwd),
          parseValue(record.fd),
          parseValue(record.prcptot),
          parseValue(record.r10mm),
          parseValue(record.r20mm),
          parseValue(record.r95p),
          parseValue(record.r95ptot),
          parseValue(record.r99p),
          parseValue(record.r99ptot),
          parseValue(record.rx1day),
          parseValue(record.rx5day),
          parseValue(record.sdii),
          parseValue(record.tn10p),
          parseValue(record.tn90p),
          parseValue(record.tnlt2),
          parseValue(record.tnn),
          parseValue(record.tnx),
          parseValue(record.tx10p),
          parseValue(record.tx90p),
          parseValue(record.txd_tnd),
          parseValue(record.txge30),
          parseValue(record.txgt50p),
          parseValue(record.txn),
          parseValue(record.txx),
          parseValue(record.wsdi)
        ]);

        successCount++;

        if (successCount % 500 === 0) {
          console.log(`   Inserted ${successCount}/${records.length} records...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`   ✗ Error inserting record:`, error.message);
        if (errorCount > 10) {
          throw new Error('Too many errors, aborting');
        }
      }
    }
  });

  console.log(`\n   ✓ Successfully inserted: ${successCount} records`);
  if (skippedCount > 0) {
    console.log(`   ⚠ Skipped: ${skippedCount} records`);
  }
  if (errorCount > 0) {
    console.log(`   ✗ Errors: ${errorCount} records`);
  }
}

/**
 * Verify data loaded correctly
 * @returns {Promise<void>}
 */
async function verifyLoad() {
  console.log('\n📊 Verifying data load...');

  // Count total records
  const countResult = await db.query(`
    SELECT COUNT(*) as count FROM public.climate_data
  `);
  console.log(`   Total climate data records: ${countResult.rows[0].count}`);
  console.log(`   Expected: 2,544 (213 municipalities × 4 scenarios × 3 periods)`);

  // Check data distribution by scenario and period
  const distResult = await db.query(`
    SELECT scenario, period, COUNT(*) as count
    FROM public.climate_data
    GROUP BY scenario, period
    ORDER BY scenario, period
  `);

  console.log('\n   Distribution by scenario/period:');
  console.log('   ' + '='.repeat(60));
  distResult.rows.forEach(row => {
    console.log(`   ${row.scenario.padEnd(10)} | ${row.period.padEnd(25)} | ${row.count} municipalities`);
  });
  console.log('   ' + '='.repeat(60));

  // Sample data - worst case scenario
  const sampleResult = await db.query(`
    SELECT
      m.municipality_name,
      cd.scenario,
      cd.period,
      ROUND(cd.txge30::numeric, 2) as hot_days_increase,
      ROUND(cd.cdd::numeric, 2) as drought_days_increase,
      ROUND(cd.prcptot::numeric, 2) as precip_change_mm,
      ROUND(cd.wsdi::numeric, 2) as heatwave_days_increase
    FROM public.climate_data cd
    JOIN public.municipalities m ON m.id = cd.municipality_id
    WHERE cd.scenario = 'ssp585'
      AND cd.period = 'far-term_2081-2100'
    ORDER BY cd.txge30 DESC
    LIMIT 5
  `);

  console.log('\n   Top 5 municipalities most affected (SSP585, 2081-2100):');
  console.log('   ' + '='.repeat(100));
  console.log('   Municipality           | Hot Days ↑ | Drought Days ↑ | Precip Change | Heatwave Days ↑');
  console.log('   ' + '-'.repeat(100));

  sampleResult.rows.forEach(row => {
    console.log(
      `   ${(row.municipality_name || '').padEnd(22)} | ` +
      `${String(row.hot_days_increase || '').padStart(10)} | ` +
      `${String(row.drought_days_increase || '').padStart(14)} | ` +
      `${String(row.precip_change_mm || '').padStart(13)} mm | ` +
      `${String(row.heatwave_days_increase || '').padStart(15)}`
    );
  });
  console.log('   ' + '='.repeat(100));
}

/**
 * Main ETL process
 */
async function main() {
  console.log('========================================');
  console.log('  ETL: Load Climate Data from CSV');
  console.log('========================================');

  try {
    // Test database connection
    await db.testConnection();

    // Check if tables exist
    const tableCheck = await db.query(`
      SELECT
        (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'municipalities')) as municipalities_exists,
        (SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'climate_data')) as climate_data_exists
    `);

    if (!tableCheck.rows[0].municipalities_exists) {
      throw new Error('municipalities table does not exist. Run ETL to load municipalities first.');
    }

    if (!tableCheck.rows[0].climate_data_exists) {
      throw new Error('climate_data table does not exist. Run migration first: npm run migrate');
    }

    // Parse CSV
    const records = await parseCSV();

    if (records.length === 0) {
      throw new Error('No records found in CSV');
    }

    // Insert into PostgreSQL
    await insertClimateData(records);

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
