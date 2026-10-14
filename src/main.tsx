import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { pedirAlmacenamientoPersistente } from './utils/persistentStorage'

// Que el navegador no pueda borrar el historial por su cuenta.
void pedirAlmacenamientoPersistente()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
