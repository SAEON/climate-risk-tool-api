/**
 * Verify municipalities table structure
 * Check columns, indexes, triggers, and constraints
 */

import db from '../src/config/database.js';

async function verifyTable() {
  console.log('========================================');
  console.log('  Verifying municipalities table');
  console.log('========================================\n');

  try {
    // Test connection
    await db.testConnection();

    console.log('\n1. TABLE STRUCTURE:');
    console.log('-------------------');

    // Get column information
    const columnsResult = await db.query(`
      SELECT
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'municipalities'
      ORDER BY ordinal_position
    `);

    console.log(`Found ${columnsResult.rows.length} columns:\n`);
    columnsResult.rows.forEach(col => {
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`  ${col.column_name.padEnd(20)} ${col.data_type}${length.padEnd(10)} ${nullable}${defaultVal}`);
    });

    console.log('\n2. INDEXES:');
    console.log('-----------');

    // Get index information
    const indexesResult = await db.query(`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'municipalities'
      ORDER BY indexname
    `);

    console.log(`Found ${indexesResult.rows.length} indexes:\n`);
    indexesResult.rows.forEach(idx => {
      console.log(`  ✓ ${idx.indexname}`);
      console.log(`    ${idx.indexdef}\n`);
    });

    console.log('3. TRIGGERS:');
    console.log('------------');

    // Get trigger information
    const triggersResult = await db.query(`
      SELECT
        trigger_name,
        event_manipulation,
        action_timing,
        action_orientation
      FROM information_schema.triggers
      WHERE event_object_schema = 'public'
        AND event_object_table = 'municipalities'
      ORDER BY trigger_name
    `);

    console.log(`Found ${triggersResult.rows.length} triggers:\n`);
    triggersResult.rows.forEach(trg => {
      console.log(`  ✓ ${trg.trigger_name}`);
      console.log(`    ${trg.action_timing} ${trg.event_manipulation} (${trg.action_orientation})\n`);
    });

    console.log('4. CONSTRAINTS:');
    console.log('---------------');

    // Get constraint information
    const constraintsResult = await db.query(`
      SELECT
        constraint_name,
        constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'municipalities'
      ORDER BY constraint_type, constraint_name
    `);

    console.log(`Found ${constraintsResult.rows.length} constraints:\n`);
    constraintsResult.rows.forEach(con => {
      const type = {
        'PRIMARY KEY': 'PK',
        'UNIQUE': 'UNIQUE',
        'FOREIGN KEY': 'FK',
        'CHECK': 'CHECK'
      }[con.constraint_type] || con.constraint_type;
      console.log(`  ✓ ${con.constraint_name} (${type})`);
    });

    console.log('\n5. POSTGIS GEOMETRY:');
    console.log('--------------------');

    // Check PostGIS geometry column
    const geomResult = await db.query(`
      SELECT
        f_table_name,
        f_geometry_column,
        coord_dimension,
        srid,
        type
      FROM geometry_columns
      WHERE f_table_schema = 'public'
        AND f_table_name = 'municipalities'
    `);

    if (geomResult.rows.length > 0) {
      const geom = geomResult.rows[0];
      console.log(`  ✓ Geometry column: ${geom.f_geometry_column}`);
      console.log(`    Type: ${geom.type}`);
      console.log(`    SRID: ${geom.srid} (WGS84)`);
      console.log(`    Dimensions: ${geom.coord_dimension}D`);
    } else {
      console.log('  ✗ No PostGIS geometry column found');
    }

    console.log('\n6. ROW COUNT:');
    console.log('-------------');

    const countResult = await db.query(`
      SELECT COUNT(*) as count FROM public.municipalities
    `);

    console.log(`  Current rows: ${countResult.rows[0].count}`);

    if (countResult.rows[0].count === '0') {
      console.log('  ⚠ Table is empty - ready for data import');
    }

    console.log('\n========================================');
    console.log('  ✓ Verification complete');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n✗ Verification failed');
    console.error(error);
    process.exit(1);
  } finally {
    await db.closePool();
  }
}

verifyTable();
