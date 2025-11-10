/**
 * Database Migration Runner
 * Executes SQL migration files in order
 */

import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATIONS_DIR = resolve(__dirname, '../migrations');

/**
 * Run a single migration file
 * @param {string} filename - Migration file name
 * @returns {Promise<void>}
 */
async function runMigration(filename) {
  const filePath = resolve(MIGRATIONS_DIR, filename);

  console.log(`\n▶ Running migration: ${filename}`);

  try {
    const sql = await readFile(filePath, 'utf8');

    // Execute the SQL
    await db.query(sql);

    console.log(`✓ Migration completed: ${filename}`);
  } catch (error) {
    console.error(`✗ Migration failed: ${filename}`);
    console.error(`  Error: ${error.message}`);
    throw error;
  }
}

/**
 * Main migration runner
 */
async function main() {
  console.log('========================================');
  console.log('  Climate Risk Tool - Database Setup');
  console.log('========================================\n');

  try {
    // Test database connection
    console.log('Testing database connection...');
    await db.testConnection();

    // List of migrations in order
    const migrations = [
      '001_create_municipalities_table.sql',
      '002_create_climate_data_table.sql',
      '003_create_climate_indices_table.sql',
      '004_add_district_fields.sql',
    ];

    console.log(`\nFound ${migrations.length} migration(s) to run\n`);

    // Run each migration
    for (const migration of migrations) {
      await runMigration(migration);
    }

    console.log('\n========================================');
    console.log('  ✓ All migrations completed');
    console.log('========================================\n');

    // Verify tables were created
    const result = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('municipalities', 'climate_data', 'climate_indices')
      ORDER BY table_name
    `);

    console.log('Created tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

  } catch (error) {
    console.error('\n✗ Migration process failed');
    console.error(error);
    process.exit(1);
  } finally {
    await db.closePool();
  }
}

// Run migrations
main();
