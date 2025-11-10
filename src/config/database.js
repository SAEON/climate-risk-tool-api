/**
 * Database Configuration and Connection Pool
 * Uses PostgreSQL with PostGIS extension
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

const { Pool } = pg;

// Database configuration from environment variables
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'sarva',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,

  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Test database connection
 * @returns {Promise<boolean>} True if connection successful
 */
export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now, version() as version');

    console.log('✓ Database connection successful');
    console.log(`  Time: ${result.rows[0].now}`);
    console.log(`  PostgreSQL: ${result.rows[0].version.split(',')[0]}`);

    // Check for PostGIS
    const postgisResult = await client.query('SELECT PostGIS_Version() as version');
    console.log(`  PostGIS: ${postgisResult.rows[0].version}`);

    client.release();
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    throw error;
  }
}

/**
 * Execute a query
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
export async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
    }

    return result;
  } catch (error) {
    console.error('Query error:', error.message);
    console.error('Query:', text.substring(0, 200));
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise<Object>} Database client
 */
export async function getClient() {
  const client = await pool.connect();
  return client;
}

/**
 * Execute multiple queries in a transaction
 * @param {Function} callback - Async function that receives client
 * @returns {Promise<any>} Result of callback
 */
export async function transaction(callback) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close all connections in the pool
 * @returns {Promise<void>}
 */
export async function closePool() {
  await pool.end();
  console.log('Database pool closed');
}

// Export pool for direct access if needed
export { pool };

// Default export
export default {
  query,
  getClient,
  transaction,
  testConnection,
  closePool,
  pool
};
