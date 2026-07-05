import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { App } from './App.tsx'
import { Toaster } from '@/components/ui/sonner'

const root = document.getElementById('root')

if (root === null) {
  throw new Error('Root element #root was not found')
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster />
    </BrowserRouter>
  </StrictMode>,
)
