import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './features/auth/hooks/useAuth'
import { AppDataProvider } from './shared/context/AppDataContext'

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <AppDataProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AppDataProvider>
    </StrictMode>
  );
}
