# Swagger Scorer Backend

FastifyOpenAPI/Swagger quality scoring API using Spectral.

## Features

### Spec Analysis
- **Quality Scoring**: 0-100 score based on configurable weights
- **Spectral Validation**: Custom + built-in Spectral rules
- **Category Breakdown**: Security, Documentation, Best Practices, etc.
- **Violation Details**: Severity, path, message for each issue

### Draft Management
- **Save Drafts**: Store OpenAPI specs for later analysis
- **Auto-cleanup**: 7-day TTL with hourly cleanup
- **User-specific**: Isolated draft storage per user

### Configuration
- **Flexible Scoring**: YAML-based configuration
- **Custom Rules**: Add your own Spectral rules
- **Hot Reload**: Config changes don't require restart (future)

## Quick Start

```bash
# Install
npm install

# Development (with hot reload)
npm run dev

# Tests
npm test

# Production
npm run build
npm start
```

## API Endpoints

### Analysis
```
POST /api/v1/analyze
Body: { spec: "openapi: 3.0.0..." }
Response: { score, rag, violations[], categories }
```

### Drafts
```
POST /api/v1/drafts
Body: { spec: "...", apiTitle: "My API" }
Response: { success: true, requestId, expiresAt }

GET /api/v1/drafts/latest
Response: { spec, apiTitle, updatedAt }
```

### Meta
```
GET /api/v1/health
GET /api/v1/config
```

## Project Structure

```
src/
├── server.ts              # Fastify app setup
├── routes/
│   ├── analyze.ts         # Spec analysis endpoint
│   ├── drafts.ts          # Draft storage endpoints
│   ├── health.ts          # Health check
│   └── config.ts          # Configuration endpoint
├── services/
│   ├── spectral.ts        # Spectral integration
│   ├── scorer.ts          # Quality scoring logic
│   └── parser.ts          # Spec parsing
└── config/
    └── loader.ts          # YAML config loader

config/
├── scoring-config.yaml    # Weights & thresholds
└── spectral-rules.yaml    # Custom Spectral rules
```

## Configuration

Edit `config/scoring-config.yaml`:

```yaml
version: "1.0"
weights:
  security: 30
  documentation: 25
  bestPractices: 20
  # ...

severityMultipliers:
  error: 1.0
  warning: 0.5
  # ...

thresholds:
  green: 95
  amber: 85
```

## Draft Storage

Drafts are stored in `/tmp/swagger-drafts/{userId}/`:
- 7-day retention
- Automatic cleanup (hourly)
- Latest draft auto-loaded

**Future**: Migrate to blob storage (Azure/S3) for production.

## Testing

```bash
npm test              # All tests
npm run test:coverage # With coverage (80% minimum)
npm run test:ui       # Interactive UI
```

**Philosophy**: Minimal mocking, real data when possible.

## OpenTelemetry

Built-in observability:

```bash
# Console export (dev)
OTEL_TRACES_EXPORTER=console npm run dev

# OTLP export (prod)
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318 npm start
```

## Coming Soon

- **Git Integration**: Track spec changes by commit hash
- **Approval Workflows**: Multi-stage promotion gates
- **Prisma ORM**: Database persistence
- **Redis Caching**: Performance optimization

## License
MIT
