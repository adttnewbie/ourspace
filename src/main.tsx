import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import './index.css'
import { App } from './App.tsx'
import { ErrorBoundary } from '@/components/error-boundary'
import { isNativePlatform } from '@/lib/platform'
import { registerServiceWorker } from '@/lib/service-worker'
import { Toaster } from '@/components/ui/sonner'

const root = document.getElementById('root')

if (root === null) {
  throw new Error('Root element #root was not found')
}

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
        <Toaster />
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
)

if (!import.meta.env.DEV && !isNativePlatform()) {
  registerServiceWorker()
}
