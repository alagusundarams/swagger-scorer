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
    console.log('🔌 Initializing Database Connection...');
    const oldPool = pool;
    pool = new Pool({
        connectionString,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });

    // Close the old pool if it was active
    if (oldPool) {
        await oldPool.end();
    }
}

/**
 * Helper to run a query with automatic logging and error handling
 */
export async function query(text: string, params?: any[]) {
    try {
        const res = await pool.query(text, params);
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
