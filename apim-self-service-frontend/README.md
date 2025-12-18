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

### 🎨 Premium UX
- **Dark Mode**: Full dark theme support
- **Glassmorphism Design**: Modern, translucent UI elements
- **Micro-animations**: Smooth transitions and hover effects
- **Responsive Layout**: Mobile-first design
- **Production-ready**: Clean code, no debug logs

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **State**: Zustand (analyzer) + React Context (auth)
- **Routing**: React Router v7 with protected routes
- **HTTP**: Axios
- **Testing**: Vitest + Playwright (E2E)

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

### State Management
- `useAnalysis`: Analyzer state (Zustand)
- `useStore`: Global app state (products, subscriptions)
- `useAuth`: Authentication context

### Navigation
- **URI-based breadcrumbs**: For hierarchical routes (`/products/:id/apis/:id`)
- **State-based breadcrumbs**: For flat routes (`/analyzer`) with context
- **sessionStorage fallback**: Preserves breadcrumbs on refresh

## 🔜 Coming Soon

### Deployment Pipeline (In Progress)
- 4-tier environments: DEV → QA → STAGE → PROD
- Full audit trail (who promoted, when, approvals)
- Git commit tracking
- Deployment history timeline
- Rollback functionality

See [implementation_plan.md](./.gemini/antigravity/brain/234d4628-b0ec-498c-ba71-a88033b0e34f/implementation_plan.md) for details.

## 📝 License
MIT
