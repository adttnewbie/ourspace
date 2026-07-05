import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router'
import { clearSession, getStoredSession } from '@/lib/session'
import { clearApiCaches, resumeSession } from '@/lib/api'

type GateState = 'checking' | 'ready' | 'blocked'

export function SessionGate() {
  const [state, setState] = useState<GateState>(() =>
    getStoredSession() === null ? 'blocked' : 'checking',
  )

  useEffect(() => {
    if (state !== 'checking') {
      return
    }

    let active = true

    resumeSession()
      .then(() => {
        if (active) {
          setState('ready')
        }
      })
      .catch((error: unknown) => {
        if (error instanceof Error && active) {
          clearApiCaches()
          clearSession()
          setState('blocked')
          return
        }

        if (active) {
          clearApiCaches()
          clearSession()
          setState('blocked')
        }
      })

    return () => {
      active = false
    }
  }, [state])

  if (state === 'checking') {
    return (
      <main className="grid min-h-dvh place-items-center bg-background px-5 text-foreground">
        <div className="rounded-[2rem] border bg-card p-6 text-center shadow-[0_18px_45px_rgb(103_74_58_/_0.14)]">
          <p className="text-sm font-extrabold text-muted-foreground">
            Lagi cek ruang kalian...
          </p>
        </div>
      </main>
    )
  }

  if (state === 'blocked') {
    return (
      <Navigate
        replace
        state={{
          message:
            'Session di device ini sudah tidak valid. Pairing tidak diulang supaya tanggal jadian tetap aman.',
        }}
        to="/pairing"
      />
    )
  }

  return <Outlet />
}
