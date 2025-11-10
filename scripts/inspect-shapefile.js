/**
 * Inspect Shapefile DBF attributes
 */

import gdal from 'gdal-async';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SHAPEFILE = resolve(__dirname, '../vector/muni_ssp126_far_term_2081_2100.shp');

async function inspectShapefile() {
  console.log('========================================');
  console.log('  Shapefile Inspection');
  console.log('========================================\n');

  console.log(`Opening: ${SHAPEFILE}\n`);

  const dataset = await gdal.openAsync(SHAPEFILE);
  const layer = await dataset.layers.getAsync(0);

  console.log(`Layer name: ${layer.name}`);
  console.log(`Feature count: ${await layer.features.countAsync()}`);
  console.log(`Geometry type: ${layer.geomType}\n`);

  // Get first feature
  const feature = await layer.features.getAsync(0);
  const fields = feature.fields.toObject();

  console.log('Available fields in DBF:');
  console.log('='.repeat(80));
  console.log('Field Name               | Sample Value');
  console.log('-'.repeat(80));

  Object.entries(fields).forEach(([key, value]) => {
    const displayValue = value === null ? '(null)' : String(value).substring(0, 50);
    console.log(`${key.padEnd(24)} | ${displayValue}`);
  });
  console.log('='.repeat(80));

  // Check what we're actually using
  console.log('\n\nFields we ARE using in municipalities table:');
  console.log('-'.repeat(80));
  const usedFields = [
    'OBJECTID or FID',
    'MUNICNAME',
    'PROVINCE',
    'CATEGORY',
    'CAT2',
    'CAT_B',
    'NAMECODE'
  ];
  usedFields.forEach(f => console.log(`  ✓ ${f}`));

  console.log('\n\nFields we are NOT using:');
  console.log('-'.repeat(80));
  const unusedFields = Object.keys(fields).filter(key => {
    return !['OBJECTID', 'FID', 'MUNICNAME', 'PROVINCE', 'CATEGORY', 'CAT2', 'CAT_B', 'NAMECODE'].includes(key);
  });

  if (unusedFields.length > 0) {
    unusedFields.forEach(f => {
      console.log(`  ⚠ ${f.padEnd(24)} = ${fields[f]}`);
    });
  } else {
    console.log('  (None - we are using all available administrative fields)');
  }

  dataset.close();

  console.log('\n========================================\n');
}

inspectShapefile().catch(console.error);
