/**
 * Entry point for production with OpenTelemetry
 * 
 * This file imports instrumentation FIRST (required),
 * then starts the server.
 * 
 * Usage: node dist/index.js
 */

// IMPORTANT: Instrumentation must be imported first
import './instrumentation.js';
// Now import and start the server
import './server.js';
