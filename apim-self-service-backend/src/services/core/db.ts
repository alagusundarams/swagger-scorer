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

import { trace, context } from '@opentelemetry/api';

/**
 * Helper to run a query with automatic logging and error handling.
 * queryName is used to identify the logical operation in logs.
 */
export async function query(text: string, params?: any[], queryName: string = 'UnnamedQuery') {
    // Attempt to get traceId from OpenTelemetry context
    const spanContext = trace.getSpanContext(context.active());
    const traceId = spanContext?.traceId || Math.random().toString(36).substring(2, 9);

    // Create a trace label for logs
    const traceLabel = `[DB:${queryName}:${traceId.substring(0, 8)}]`;

    // Global Query Logging for Transparency/Debugging
    console.log(`${traceLabel} 🚀 Executing: ${text.replace(/\s+/g, ' ').trim()}`);
    if (params && params.length > 0) {
        console.log(`${traceLabel} 📦 Params: ${JSON.stringify(params)}`);
    }

    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log(`${traceLabel} ✅ Result: ${res.rowCount} rows, Duration: ${duration}ms`);
        return res;
    } catch (err) {
        const duration = Date.now() - start;
        console.error(`${traceLabel} ❌ Error after ${duration}ms:`, { text, error: err });
        throw err;
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    await pool.end();
});
