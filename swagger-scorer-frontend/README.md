# Swagger Scorer Frontend 🚀

A premium, modern React application for analyzing and scoring OpenAPI (Swagger) specifications. This UI interacts with the Swagger Scorer Backend to provide real-time quality assessments, RAG (Red/Amber/Green) status, and detailed violation reports.

![Swagger Scorer](https://via.placeholder.com/800x400?text=Swagger+Scorer+UI+Preview)

## ✨ Key Features

- **Real-time Analysis**: Instant feedback on your OpenAPI specs.
- **Quality Score**: 0-100 numeric score based on weighted deductions.
- **RAG Status**: Visual health indicators (Green > 95, Amber > 85, Red <= 85).
- **Detailed Violations**: Sortable table of issues with severity levels (Error, Warn, Info, Hint).
- **Category Breakdown**: granular scoring for Security, Documentation, Best Practices, etc.
- **Premium UX**: Glassmorphism design, smooth micro-animations, and full Dark Mode.

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 (with `@tailwindcss/postcss`)
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Deployment**: Nginx (Reverse Proxy & Static Serve) + Docker

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ (required by Vite)
- Docker (optional, for production build)

### Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```
   The app will run at `http://localhost:5173`.
   
   > **Note**: Ensure the backend is running on port `3001` locally. The Vite proxy is configured to forward `/api` requests to `http://localhost:3001`.

3. **Run Tests**
   ```bash
   npm test
   ```

### 🐳 Docker Production Build

The project includes a multi-stage Dockerfile that builds the React app and serves it via Nginx.

1. **Build the Image**
   ```bash
   docker build -t swagger-scorer-ui .
   ```

2. **Run the Container**
   ```bash
   docker run -p 8080:80 swagger-scorer-ui
   ```
   Access the app at `http://localhost:8080`.

   > **Note**: In production, Nginx proxies API calls to `http://backend:3000`. Ensure your docker-compose network is set up correctly.

## 📐 Architecture

- **Proxying**: 
  - In **Development**, `vite.config.ts` proxies `/api` to `localhost:3001`.
  - In **Production**, `nginx.conf` proxies `/api/v1/` to the backend service.
- **State**: `useAnalysis` store (Zustand) handles the entire analysis session state.
- **Components**: Modular design (`AnalyzerForm`, `ScoreCard`, `ViolationsTable`) for maintainability.

## 📝 License
MIT
