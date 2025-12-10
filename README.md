# Swagger Scorer

A comprehensive OpenAPI specification quality scoring tool that analyzes your API specs against **52 industry-standard rules** based on OWASP API Security, Spectral OAS, and RESTful best practices.

## 🎯 Features

- **Real-time Analysis** - Instant feedback as you write your OpenAPI spec
- **Industry-Standard Rules** - 52 rules covering security, design, documentation, and more
- **Visual Score Dashboard** - Beautiful dark-themed UI with donut charts and category breakdowns
- **Line-by-Line Violations** - Click to jump to the exact line with issues
- **VS Code-like Editor** - Monaco editor with YAML syntax highlighting

## 📊 Scoring Categories

| Category | Weight | Focus |
|----------|--------|-------|
| 🔒 Security | 30% | OWASP API Top 10 |
| 📐 Structural | 20% | OpenAPI spec compliance |
| 🎨 API Design | 20% | RESTful best practices |
| 📚 Documentation | 15% | API discoverability |
| 🗄️ Data Models | 10% | Schema quality |
| ⚠️ Error Handling | 5% | Response consistency |

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ or 22+
- npm 9+

### Backend Setup
```bash
cd swagger-scorer-backend
npm install
npm run dev
```
Backend runs on http://localhost:3001

### Frontend Setup
```bash
cd swagger-scorer-frontend
npm install
npm run dev
```
Frontend runs on http://localhost:5173

## 🏗️ Project Structure

```
swagger-scorer/
├── swagger-scorer-backend/     # Node.js + Fastify API
│   ├── config/                 # Scoring rules & configuration
│   │   ├── scoring-config.yaml # Category weights & thresholds
│   │   ├── spectral-rules.yaml # Custom Spectral rules
│   │   └── rule-categories.yaml# Rule-to-category mappings
│   └── src/
│       ├── routes/             # API endpoints
│       ├── services/           # Business logic
│       └── config/             # Config loader
│
└── swagger-scorer-frontend/    # React + Vite + TypeScript
    └── src/
        ├── components/         # UI components
        ├── store/              # Zustand state management
        └── api/                # API client
```

## 📖 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/health` | GET | Health check |
| `/api/v1/config` | GET | Get scoring configuration |
| `/api/v1/analyze` | POST | Analyze OpenAPI spec |

## 🔧 Configuration

Edit `config/scoring-config.yaml` to customize:
- Category weights (must sum to 100)
- Score thresholds for RAG status
- Severity multipliers

## 🧪 Testing

```bash
# Backend tests (17 tests)
cd swagger-scorer-backend
npm test

# Frontend tests (5 tests)
cd swagger-scorer-frontend
npm test
```

## 📜 License

MIT
