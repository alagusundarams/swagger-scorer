import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Lazy imports for MFE chunks
const LoginPage = lazy(() => import('./pages/Login/Login.page').then(module => ({ default: module.LoginPage })));
const DashboardPage = lazy(() => import('./pages/Dashboard/Dashboard.page').then(module => ({ default: module.DashboardPage })));
const ProductDetailPage = lazy(() => import('./pages/ProductDetail/ProductDetail.page').then(module => ({ default: module.ProductDetailPage })));
const APIDetailPage = lazy(() => import('./pages/APIDetail/APIDetail.page').then(module => ({ default: module.APIDetailPage })));
const EndpointDetailPage = lazy(() => import('./pages/EndpointDetail/EndpointDetail.page').then(module => ({ default: module.EndpointDetailPage })));
const OnboardingWizard = lazy(() => import('./pages/Onboarding/Onboarding.page').then(module => ({ default: module.OnboardingWizard })));
const BrowsePage = lazy(() => import('./pages/Browse/Browse.page').then(module => ({ default: module.BrowsePage })));
const MarketplacePage = lazy(() => import('./pages/Marketplace/Marketplace.page').then(module => ({ default: module.MarketplacePage })));
const AnalyzerPage = lazy(() => import('./pages/Analyzer/Analyzer.page').then(module => ({ default: module.AnalyzerPage })));
const AdminGovernancePage = lazy(() => import('./pages/AdminGovernance/AdminGovernance.page').then(module => ({ default: module.AdminGovernancePage })));
const AdminMappingView = lazy(() => import('./pages/AdminMapping/AdminMapping.page').then(module => ({ default: module.AdminMappingView })));
const PolicyStudioContainer = lazy(() => import('./features/policy-studio/PolicyStudio.container').then(module => ({ default: module.PolicyStudioContainer })));
const GlobalInventoryPage = lazy(() => import('./pages/GlobalInventory/GlobalInventory.page').then(module => ({ default: module.GlobalInventory })));
const AppsPage = lazy(() => import('./pages/Apps/Apps.page').then(module => ({ default: module.AppsPage })));
const PolicyEditorPage = lazy(() => import('./pages/PolicyEditor/PolicyEditor.page').then(module => ({ default: module.PolicyEditorPage })));

import { ProtectedRoute } from './core/routing/ProtectedRoute';

const LoadingFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-[#0f172a] text-white">
    <div className="animate-pulse flex flex-col items-center gap-4">
      <div className="h-12 w-12 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent animate-spin"></div>
      <p className="text-xs font-bold tracking-widest uppercase text-slate-500">Loading Module...</p>
    </div>
  </div>
);

import { useInventoryStore } from './features/inventory/hooks/useInventoryStore';

function OnboardingWrapper() {
  const { products } = useInventoryStore();
  const validateName = (name: string) =>
    products.some(p => p.name.toLowerCase() === name.toLowerCase() || p.displayName.toLowerCase() === name.toLowerCase());

  return <OnboardingWizard validateProductName={validateName} />;
}

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
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
                <OnboardingWrapper />
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
          <Route
            path="/catalog"
            element={
              <ProtectedRoute>
                <MarketplacePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/apps"
            element={
              <ProtectedRoute>
                <AppsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/governance"
            element={
              <ProtectedRoute>
                <AdminGovernancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/mapping"
            element={
              <ProtectedRoute>
                <AdminMappingView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/global-inventory"
            element={
              <ProtectedRoute>
                <GlobalInventoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/:productId/apis/:apiId/policy-editor"
            element={
              <ProtectedRoute>
                <PolicyEditorPage />
              </ProtectedRoute>
            }
          />
          <Route path="/policy-studio-demo" element={<PolicyStudioContainer />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router >
  );
}

export default App;
