/**
 * @fileoverview OpenTelemetry instrumentation setup
 * 
 * This file configures OpenTelemetry for observability.
 * It must be imported BEFORE any other application code.
 * 
 * What OpenTelemetry does:
 * - Traces: Records the flow of requests through the system
 * - Metrics: Collects performance data (request duration, error rates, etc.)
 * - Logs: Correlates logs with traces
 * 
 * For development: Traces export to console
 * For production: Configure OTEL_EXPORTER_OTLP_ENDPOINT to send to collector
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

/**
 * Initialize OpenTelemetry SDK
 * 
 * This sets up automatic instrumentation for:
 * - HTTP requests/responses
 * - DNS lookups  
 * - File system operations
 * - And more...
 * 
 * Environment variables to configure:
 * - OTEL_SERVICE_NAME: Name of this service (default: swagger-scorer-backend)
 * - OTEL_EXPORTER_OTLP_ENDPOINT: Where to send traces (default: console)
 * - OTEL_LOG_LEVEL: Logging level for OTel itself (default: info)
 */
const sdk = new NodeSDK({
    // Service identification
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]:
            process.env.OTEL_SERVICE_NAME || 'swagger-scorer-backend',
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
    }),

    // Trace exporter
    traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    }),

    // Auto-instrumentation with Log Correlation
    instrumentations: [
        getNodeAutoInstrumentations({
            // HTTP Instrumentation: Ensure W3C headers are propagated
            '@opentelemetry/instrumentation-http': {
                ignoreIncomingPaths: ['/health', '/metrics'], // Reduce noise
            },
            // Pino Instrumentation: Inject trace/span IDs into logs
            '@opentelemetry/instrumentation-pino': {
                logHook: (_span, record) => {
                    record['resource.service.name'] = process.env.OTEL_SERVICE_NAME || 'swagger-scorer-backend';
                },
            },
            // Disable instrumentations we don't need
            '@opentelemetry/instrumentation-fs': {
                enabled: false,
            },
        }),
    ],
});

// Start the SDK
sdk.start();
console.log('OpenTelemetry instrumentation started');

// Gracefully shut down on process termination
process.on('SIGTERM', () => {
    sdk
        .shutdown()
        .then(() => console.log('OpenTelemetry SDK shut down successfully'))
        .catch((error) => console.error('Error shutting down OpenTelemetry SDK', error))
        .finally(() => process.exit(0));
});
