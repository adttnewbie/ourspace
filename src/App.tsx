import type { ReactNode } from 'react'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { AppShell } from '@/components/app-shell'
import { SettingsSkeleton } from '@/components/loading-skeleton'
import { ScrapbookCard } from '@/components/scrapbook'
import { SessionGate } from '@/components/session-gate'
import { HomePage } from '@/pages/home'
import { PairingPage } from '@/pages/pairing'

const DatesPage = lazy(() =>
  import('@/pages/dates').then((module) => ({ default: module.DatesPage })),
)
const GalleryPage = lazy(() =>
  import('@/pages/gallery').then((module) => ({ default: module.GalleryPage })),
)
const ListsPage = lazy(() =>
  import('@/pages/lists').then((module) => ({ default: module.ListsPage })),
)
const NotesPage = lazy(() =>
  import('@/pages/notes').then((module) => ({ default: module.NotesPage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/settings').then((module) => ({ default: module.SettingsPage })),
)
const SettingsHealthPage = lazy(() =>
  import('@/pages/settings').then((module) => ({
    default: module.SettingsHealthPage,
  })),
)
const SettingsSetupPage = lazy(() =>
  import('@/pages/settings').then((module) => ({
    default: module.SettingsSetupPage,
  })),
)
const SettingsDangerPage = lazy(() =>
  import('@/pages/settings').then((module) => ({
    default: module.SettingsDangerPage,
  })),
)

function RouteFallback() {
  return (
    <ScrapbookCard className="text-center" tone="yellow" tape>
      <p className="text-sm font-extrabold text-muted-foreground">
        Nyiapin halaman...
      </p>
    </ScrapbookCard>
  )
}

function lazyRoute(element: ReactNode, fallback: ReactNode = <RouteFallback />) {
  return <Suspense fallback={fallback}>{element}</Suspense>
}

export function App() {
  return (
    <Routes>
      <Route path="/pairing" element={<PairingPage />} />
      <Route element={<SessionGate />}>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="gallery" element={lazyRoute(<GalleryPage />)} />
          <Route path="dates" element={lazyRoute(<DatesPage />)} />
          <Route path="lists" element={lazyRoute(<ListsPage />)} />
          <Route path="notes" element={lazyRoute(<NotesPage />)} />
          <Route
            path="settings"
            element={lazyRoute(<SettingsPage />, <SettingsSkeleton />)}
          />
          <Route
            path="settings/health"
            element={lazyRoute(<SettingsHealthPage />)}
          />
          <Route
            path="settings/setup"
            element={lazyRoute(<SettingsSetupPage />)}
          />
          <Route
            path="settings/danger"
            element={lazyRoute(<SettingsDangerPage />)}
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
