# Swagger Scorer Frontend 🚀

Modern React application for analyzing, scoring, and managing OpenAPI (Swagger) specifications with enterprise-grade features.

## ✨ Current Features

### 🔍 API Analyzer
- **Real-time Analysis**: Instant OpenAPI spec validation and scoring
- **Quality Score**: 0-100 scoring with weighted deductions
- **RAG Status**: Visual health indicators (🟢 Green >95 | 🟡 Amber >85 | 🔴 Red ≤85)
- **Violations Table**: Sortable issues by severity (Error/Warn/Info/Hint)
- **Category

 Breakdown**: Granular scoring for Security, Documentation, Best Practices
- **Maximize/Restore**: Full-screen editor mode with smooth transitions
- **Draft Autosave**: Auto-saves work to backend with 7-day retention
- **Unsaved Changes Protection**: Browser warns before losing work

### 📊 Product & API Inventory
- **Product Catalog**: Browse and manage API products
- **API Explorer**: Navigate through APIs and operations 
- **Breadcrumb Navigation**: Smart breadcrumbs with context preservation
  - Survives browser refresh (sessionStorage fallback)
  - Deep navigation: Product → API → Analyzer
- **Access Management**: Request/approve API access with team-based permissions
- **Subscription Tracking**: Monitor active API subscriptions

### 👑 Admin Governance
- **Orphan Mapping**: Reconcile unassigned legacy resources with Teams
- **Smart Assignment**: Differentiates between Standard Products (cascading app) and GRP Bundles (container only)
- **Control Plane**: Centralized view of all managed assets

### 🛡️ Approval Workflows
- **OBO Justification**: Require reason for Admin overrides/emergency approvals
- **Audit Logging**: Immutable record of all decisions with "Resolved By" tracking
- **Environment Promotion**: Gated workflows from DEV → PROD

## 📜 Scripts & Utilities

### Data Extraction (Day 1 Onboarding)
Simulate extracting existing APIM resources into the portal's inventory.
```bash
# Run extraction (Skips PROD by default)
npx ts-node scripts/sync-apim-to-db.ts
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn

### Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Run tests
npm test

# E2E tests
npm run test:e2e
```

### Environment Variables

Create `.env` file:
```bash
VITE_API_URL=http://localhost:3001
VITE_USE_MOCK_AUTH=true  # Set to false for real auth
```

### 🐳 Docker Production

```bash
# Build
docker build -t swagger-scorer-ui .

# Run (http://localhost:8080)
docker run -p 8080:80 swagger-scorer-ui
```

## 📐 Architecture

### Routing
- `/` - Dashboard
- `/products/:id` - Product detail
- `/products/:id/apis/:id` - API detail
- `/analyzer` - OpenAPI analyzer
- `/discovery` - API marketplace
- `/admin/mapping` - Admin Governance & Assignment

### State Management
- `useAnalysis`: Analyzer state (Zustand)
- `useStore`: Global app state (products, subscriptions)
- `useAuth`: Authentication context

### Navigation
- **URI-based breadcrumbs**: For hierarchical routes (`/products/:id/apis/:id`)
- **State-based breadcrumbs**: For flat routes (`/analyzer`) with context
- **sessionStorage fallback**: Preserves breadcrumbs on refresh

## 📝 License
MIT
