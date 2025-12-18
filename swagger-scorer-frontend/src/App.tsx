

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { AnalyzerForm } from './components/AnalyzerForm';
import { ScoreCard } from './components/ScoreCard';
import { ViolationsTable } from './components/ViolationsTable';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { APIDetailPage } from './pages/APIDetailPage';
import { EndpointDetailPage } from './pages/EndpointDetailPage';
import { OnboardingWizard } from './pages/OnboardingWizard';
import { BrowsePage } from './pages/BrowsePage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HeaderFooterTest } from './pages/HeaderFooterTest';

function SwaggerAnalyzerLayout() {
  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden font-sans text-gray-900 antialiased selection:bg-blue-100 selection:text-blue-900">
      <Header />
      <main className="flex-grow flex flex-col overflow-hidden">
        <div className="flex h-full">
          {/* Left: Input (Standard/Monaco) */}
          <div className="w-1/2 h-full flex flex-col border-r-2 border-[#1e1e1e]">
            <AnalyzerForm />
          </div>

          {/* Right: Output (Results) */}
          <div className="w-1/2 h-full overflow-y-auto bg-gray-50 p-8 space-y-8">
            <ScoreCard />
            <ViolationsTable />
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/test-header" element={<HeaderFooterTest />} />
        <Route
          path="/"
          element={<DashboardPage />}
        />
        <Route
          path="/products/:productId"
          element={
            <ProtectedRoute>
              <ProductDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/:productId/apis/:apiId"
          element={
            <ProtectedRoute>
              <APIDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/:productId/apis/:apiId/operations/:operationId"
          element={
            <ProtectedRoute>
              <EndpointDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/browse"
          element={
            <ProtectedRoute>
              <BrowsePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboard"
          element={
            <ProtectedRoute>
              <OnboardingWizard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analyzer"
          element={
            <ProtectedRoute>
              <SwaggerAnalyzerLayout />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
