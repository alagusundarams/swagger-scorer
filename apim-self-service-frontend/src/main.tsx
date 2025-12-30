import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { GlobalErrorBoundary } from './core/error-boundary/GlobalErrorBoundary'
import { AuthProvider } from './features/auth/hooks/useAuth'
import { AppDataProvider } from './shared/context/AppDataContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <AppDataProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AppDataProvider>
    </GlobalErrorBoundary>
  </StrictMode>,
)
