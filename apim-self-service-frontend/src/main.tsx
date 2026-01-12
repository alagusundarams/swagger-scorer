import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css'
import App from './App'
import { AuthProvider } from './features/auth/hooks/useAuth'
import { AppDataProvider } from './shared/context/AppDataContext'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false, // Optional: prevents refetch on window focus if desired
    },
  },
});

import { USE_MOCKS } from './config/env';

async function enableMocking() {
  if (USE_MOCKS) {
    const { worker } = await import('./mocks/browser');
    return worker.start({
      onUnhandledRequest: 'bypass',
    });
  }
}

enableMocking().then(() => {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <AppDataProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </AppDataProvider>
        </QueryClientProvider>
      </StrictMode>
    );
  }
});
