

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './layouts/Header/Header.view';
import { Breadcrumbs } from './layouts/MainLayout/Breadcrumbs';
import { AnalyzerForm } from './features/analyzer/components/AnalyzerForm';
import { ScoreCard } from './features/analyzer/components/ScoreCard';
import { ViolationsTable } from './features/analyzer/components/ViolationsTable';
import { LoginPage } from './features/auth/views/Login.view';
import { DashboardPage } from './features/inventory/views/Dashboard.view';
import { ProductDetailPage } from './features/inventory/views/ProductDetail.view';
import { APIDetailPage } from './features/inventory/views/APIDetail.view';
import { EndpointDetailPage } from './features/inventory/views/EndpointDetail.view';
import { OnboardingWizard } from './features/provisioning/views/Onboarding.view';
import { BrowsePage } from './features/discovery/views/Browse.view';
import { MarketplacePage } from './features/discovery/views/Marketplace.view';
import { ProtectedRoute } from './core/routing/ProtectedRoute';
import { HeaderFooterTest } from './core/ui/HeaderFooterTest.view';

import { useAnalysis } from './features/analyzer/store/useAnalysis';

function SwaggerAnalyzerLayout() {
  const { isMaximized } = useAnalysis();

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden font-sans text-gray-900 antialiased selection:bg-blue-100 selection:text-blue-900">
      <Header pageName="API Analyzer" />
      <Breadcrumbs />
      <main className="flex-grow flex flex-col overflow-hidden relative">
        <div className="flex h-full">
          {/* Left: Input (Standard/Monaco) */}
          <div className={`h-full flex flex-col border-r-2 border-[#1e1e1e] transition-all duration-300 ${isMaximized ? 'w-full' : 'w-1/2'}`}>
            <AnalyzerForm />
          </div>

          {/* Right: Output (Results) */}
          {!isMaximized && (
            <div className="w-1/2 h-full overflow-y-auto bg-gray-50 p-8 space-y-8 pb-20">
              <ScoreCard />
              <ViolationsTable />
            </div>
          )}
        </div>
      </main>
      <div className="bg-slate-900 border-t border-slate-700 p-2 z-50">
        <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest">Analyzer Mode</p>
      </div>
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
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
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
        <Route
          path="/catalog"
          element={
            <ProtectedRoute>
              <MarketplacePage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
