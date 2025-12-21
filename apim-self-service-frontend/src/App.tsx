

import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Lazy imports for MFE chunks
const LoginPage = lazy(() => import('./features/auth/views/Login.view').then(module => ({ default: module.LoginPage })));
const DashboardPage = lazy(() => import('./features/inventory/views/Dashboard.view').then(module => ({ default: module.DashboardPage })));
const ProductDetailPage = lazy(() => import('./features/inventory/views/ProductDetail.view').then(module => ({ default: module.ProductDetailPage })));
const APIDetailPage = lazy(() => import('./features/inventory/views/APIDetail.view').then(module => ({ default: module.APIDetailPage })));
const EndpointDetailPage = lazy(() => import('./features/inventory/views/EndpointDetail.view').then(module => ({ default: module.EndpointDetailPage })));
const OnboardingWizard = lazy(() => import('./features/provisioning/views/Onboarding.view').then(module => ({ default: module.OnboardingWizard })));
const BrowsePage = lazy(() => import('./features/discovery/views/Browse.view').then(module => ({ default: module.BrowsePage })));
const MarketplacePage = lazy(() => import('./features/discovery/views/Marketplace.view').then(module => ({ default: module.MarketplacePage })));
const AnalyzerPage = lazy(() => import('./features/analyzer/views/Analyzer.view').then(module => ({ default: module.AnalyzerPage })));
const HeaderFooterTest = lazy(() => import('./core/ui/HeaderFooterTest.view').then(module => ({ default: module.HeaderFooterTest })));

import { ProtectedRoute } from './core/routing/ProtectedRoute';

const LoadingFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-[#0f172a] text-white">
    <div className="animate-pulse flex flex-col items-center gap-4">
      <div className="h-12 w-12 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent animate-spin"></div>
      <p className="text-xs font-bold tracking-widest uppercase text-slate-500">Loading Module...</p>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Suspense fallback={<LoadingFallback />}>
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
                <AnalyzerPage />
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
      </Suspense>
    </Router>
  );
}


export default App;
