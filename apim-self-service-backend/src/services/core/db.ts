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
let pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Max connections in the pool
    max: 20,
    // Shutdown connection after 30s of inactivity
    idleTimeoutMillis: 30000,
    // Wait up to 2s for a connection
    connectionTimeoutMillis: 2000,
});

/**
 * Initialize the database connection with a specific URL.
 * This should be called once the application configuration is loaded.
 */
export async function initDb(connectionString: string) {
    const maskedUrl = connectionString.replace(/:([^:@]+)@/, ':****@');
    console.log(`🔌 Initializing Database Connection to: ${maskedUrl}`);
    const oldPool = pool;
    pool = new Pool({
        connectionString,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });

    // Verify connection immediately
    try {
        await pool.query('SELECT 1');
        console.log('✅ Database Connected Successfully');
    } catch (err) {
        console.error('❌ Database Connection Failed:', err);
    }

    // Close the old pool if it was active
    if (oldPool) {
        await oldPool.end();
    }
}

/**
 * Helper to run a query with automatic logging and error handling
 */
export async function query(text: string, params?: any[]) {
    // Global Query Logging for Transparency/Debugging
    console.log(`[SQL Query] Executing: ${text.replace(/\s+/g, ' ').trim()}`);
    if (params && params.length > 0) {
        console.log(`[SQL Params] ${JSON.stringify(params)}`);
    }

    try {
        const start = Date.now();
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log(`[SQL Result] Rows: ${res.rowCount}, Duration: ${duration}ms`);
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
