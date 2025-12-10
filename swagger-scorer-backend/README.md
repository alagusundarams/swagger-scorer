# Swagger Scorer Backend

OpenAPI/Swagger quality scoring API using Spectral and Fastify.

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build

# Run production build
npm start
```

## Project Structure

```
src/
├── server.ts           # Fastify application entry point
├── routes/             # API route handlers
├── services/           # Business logic (Spectral, scoring)
├── config/             # Configuration loader
├── utils/              # Utility functions
└── types/              # TypeScript type definitions

config/
├── scoring-config.yaml # Scoring weights and thresholds
└── spectral-rules.yaml # Custom Spectral rules

tests/
└── fixtures/           # Sample OpenAPI files for testing
```

## API Endpoints

- `POST /api/v1/analyze` - Analyze OpenAPI spec, returns score and violations
- `GET /api/v1/health` - Health check
- `GET /api/v1/config` - Get current scoring configuration

## Configuration

Edit `config/scoring-config.yaml` to adjust:
- Category weights
- Severity multipliers
- Score thresholds (Green/Amber/Red)

After changing config, restart the server.

## Testing

Tests use Vitest with 80% coverage requirement.

```bash
npm test              # Run all tests
npm run test:ui       # Interactive UI
```

**Testing philosophy**: Simple tests with minimal mocking. We test with real data when possible.

## OpenTelemetry

Observability is built-in with OpenTelemetry. Set env vars to configure:

```bash
# Export traces to console (development)
OTEL_TRACES_EXPORTER=console

# Export to OTLP endpoint (production)
OTEL_EXPORTER_OTLP_ENDPOINT=http://your-collector:4318
```
