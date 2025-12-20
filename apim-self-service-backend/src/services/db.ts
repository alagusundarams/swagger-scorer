/**
 * @fileoverview Database Service
 * 
 * Provides a PostgreSQL connection pool for the backend.
 * Uses the DATABASE_URL environment variable for connection details.
 */

import pg from 'pg';

// Create a connection pool to handle multiple concurrent requests efficiently
const { Pool } = pg;

// Use the environment variable or fallback to a local development default
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.warn('⚠️  DATABASE_URL environment variable is not set. Database features will be unavailable.');
}

export const pool = new Pool({
    connectionString,
    // Max connections in the pool
    max: 20,
    // Shutdown connection after 30s of inactivity
    idleTimeoutMillis: 30000,
    // Wait up to 2s for a connection
    connectionTimeoutMillis: 2000,
});

/**
 * Helper to run a query with automatic logging and error handling
 */
export async function query(text: string, params?: any[]) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        // console.log('DEBUG: Query executed', { text, duration, rows: res.rowCount });
        return res;
    } catch (err) {
        console.error('❌ Database Query Error:', { text, error: err });
        throw err;
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    await pool.end();
});
