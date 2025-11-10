/**
 * ETL Script: Load Municipalities from GeoPackage
 *
 * Reads municipality boundaries from vector/municipality_indices.gpkg
 * and loads them into the PostgreSQL municipalities table
 */

import gdal from 'gdal-async';
import db from '../../src/config/database.js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to GeoPackage file
const GEOPACKAGE_PATH = resolve(__dirname, '../../vector/municipality_indices.gpkg');

/**
 * Convert GDAL geometry to WKT (Well-Known Text)
 * @param {Object} geometry - GDAL geometry object
 * @returns {string} WKT string
 */
function geometryToWKT(geometry) {
  return geometry.toWKT();
}

/**
 * Extract unique municipalities from GeoPackage
 * The GeoPackage contains 12 layers (one per scenario/period combination)
 * Each layer has the same 213 municipalities, so we need to deduplicate
 *
 * @returns {Promise<Array>} Array of unique municipality objects
 */
async function extractMunicipalitiesFromGeoPackage() {
  console.log(`\n📂 Opening GeoPackage: ${GEOPACKAGE_PATH}`);

  const dataset = await gdal.openAsync(GEOPACKAGE_PATH);
  const layersCount = await dataset.layers.countAsync();

  console.log(`   Found ${layersCount} layers in GeoPackage`);

  // Get the first layer (index 0)
  const firstLayer = await dataset.layers.getAsync(0);
  console.log(`   Using layer: ${firstLayer.name}`);

  const featureCount = await firstLayer.features.countAsync();
  console.log(`   Features in layer: ${featureCount}`);

  const municipalities = new Map(); // Use Map to deduplicate by OBJECTID

  console.log('\n🔄 Extracting municipality features...');

  // Iterate through features
  for await (const feature of firstLayer.features) {
    const fields = feature.fields.toObject();
    const geometry = feature.getGeometry();

    // Extract relevant fields from the shapefile
    const objectid = fields.OBJECTID || fields.FID;
    const municipalityName = fields.MUNICNAME || fields.municipality || fields.name;
    const province = fields.PROVINCE || fields.province;
    const category = fields.CATEGORY || fields.category;
    const cat2 = fields.CAT2 || fields.cat2;
    const catB = fields.CAT_B || fields.cat_b;
    const municipalityCode = fields.NAMECODE || fields.code;
    const districtCode = fields.DISTRICT || fields.district_code;
    const districtName = fields.DISTRICT_N || fields.district_name;

    if (!objectid) {
      console.warn('   ⚠ Skipping feature without OBJECTID');
      continue;
    }

    // Only add if not already in map (deduplication)
    if (!municipalities.has(objectid)) {
      // Convert geometry to WKT for PostGIS
      const wkt = geometryToWKT(geometry);

      municipalities.set(objectid, {
        objectid: objectid,
        municipality_name: municipalityName,
        municipality_code: municipalityCode,
        province: province,
        category: category,
        cat2: cat2,
        cat_b: catB,
        district_code: districtCode,
        district_name: districtName,
        geom_wkt: wkt
      });
    }
  }

  dataset.close();

  const uniqueMunicipalities = Array.from(municipalities.values());
  console.log(`   ✓ Extracted ${uniqueMunicipalities.length} unique municipalities`);

  return uniqueMunicipalities;
}

/**
 * Insert municipalities into PostgreSQL
 * @param {Array} municipalities - Array of municipality objects
 * @returns {Promise<void>}
 */
async function insertMunicipalities(municipalities) {
  console.log('\n💾 Inserting municipalities into PostgreSQL...');

  let successCount = 0;
  let errorCount = 0;

  // Use a transaction for all inserts
  await db.transaction(async (client) => {
    for (const muni of municipalities) {
      try {
        await client.query(`
          INSERT INTO public.municipalities (
            objectid,
            municipality_name,
            municipality_code,
            province,
            category,
            cat2,
            cat_b,
            district_code,
            district_name,
            geom
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            ST_GeomFromText($10, 4326)
          )
          ON CONFLICT (objectid) DO UPDATE SET
            municipality_name = EXCLUDED.municipality_name,
            province = EXCLUDED.province,
            district_code = EXCLUDED.district_code,
            district_name = EXCLUDED.district_name,
            updated_at = CURRENT_TIMESTAMP
        `, [
          muni.objectid,
          muni.municipality_name,
          muni.municipality_code,
          muni.province,
          muni.category,
          muni.cat2,
          muni.cat_b,
          muni.district_code,
          muni.district_name,
          muni.geom_wkt
        ]);

        successCount++;

        if (successCount % 50 === 0) {
          console.log(`   Inserted ${successCount}/${municipalities.length} municipalities...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`   ✗ Error inserting ${muni.municipality_name}:`, error.message);
      }
    }
  });

  console.log(`\n   ✓ Successfully inserted: ${successCount} municipalities`);
  if (errorCount > 0) {
    console.log(`   ✗ Errors: ${errorCount} municipalities`);
  }
}

/**
 * Verify data loaded correctly
 * @returns {Promise<void>}
 */
async function verifyLoad() {
  console.log('\n📊 Verifying data load...');

  // Count total municipalities
  const countResult = await db.query(`
    SELECT COUNT(*) as count FROM public.municipalities
  `);
  console.log(`   Total municipalities: ${countResult.rows[0].count}`);

  // Check for valid geometries
  const validGeomResult = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE ST_IsValid(geom)) as valid_count,
      COUNT(*) FILTER (WHERE NOT ST_IsValid(geom)) as invalid_count
    FROM public.municipalities
  `);
  console.log(`   Valid geometries: ${validGeomResult.rows[0].valid_count}`);
  console.log(`   Invalid geometries: ${validGeomResult.rows[0].invalid_count}`);

  // Sample data
  const sampleResult = await db.query(`
    SELECT
      objectid,
      municipality_name,
      province,
      ROUND(centroid_lat::numeric, 4) as lat,
      ROUND(centroid_lon::numeric, 4) as lon,
      ROUND(area_km2::numeric, 2) as area_km2
    FROM public.municipalities
    ORDER BY objectid
    LIMIT 5
  `);

  console.log('\n   Sample municipalities:');
  console.log('   ' + '='.repeat(80));
  console.log('   OBJECTID | Municipality Name      | Province        | Lat      | Lon      | Area (km²)');
  console.log('   ' + '-'.repeat(80));

  sampleResult.rows.forEach(row => {
    console.log(
      `   ${String(row.objectid).padEnd(8)} | ` +
      `${(row.municipality_name || '').padEnd(22)} | ` +
      `${(row.province || '').padEnd(15)} | ` +
      `${String(row.lat || '').padEnd(8)} | ` +
      `${String(row.lon || '').padEnd(8)} | ` +
      `${String(row.area_km2 || '')}`
    );
  });
  console.log('   ' + '='.repeat(80));

  // Province distribution
  const provinceResult = await db.query(`
    SELECT
      province,
      COUNT(*) as count
    FROM public.municipalities
    WHERE province IS NOT NULL
    GROUP BY province
    ORDER BY count DESC
  `);

  console.log('\n   Municipalities by province:');
  provinceResult.rows.forEach(row => {
    console.log(`   ${row.province}: ${row.count}`);
  });
}

/**
 * Main ETL process
 */
async function main() {
  console.log('========================================');
  console.log('  ETL: Load Municipalities');
  console.log('========================================');

  try {
    // Test database connection
    await db.testConnection();

    // Check if table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'municipalities'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      throw new Error('municipalities table does not exist. Run migration first: npm run migrate');
    }

    // Extract municipalities from GeoPackage
    const municipalities = await extractMunicipalitiesFromGeoPackage();

    if (municipalities.length === 0) {
      throw new Error('No municipalities found in GeoPackage');
    }

    // Insert into PostgreSQL
    await insertMunicipalities(municipalities);

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
