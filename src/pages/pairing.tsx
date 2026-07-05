import { useEffect, useRef, useState } from 'react'
import { HeartHandshake, LoaderCircle, RotateCcw } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import {
  ApiError,
  getCoupleStatus,
  getPairingStatus,
  recoverSession,
  resumeSession,
  signalPairing,
  startPairing,
} from '@/lib/api'
import {
  clearSession,
  clearPendingNickname,
  getPendingNickname,
  getStoredSession,
  savePendingNickname,
  saveSession,
} from '@/lib/session'
import { Button } from '@/components/ui/button'
import { PairingStatusSkeleton } from '@/components/loading-skeleton'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { Input } from '@/components/ui/input'
import {
  getPairingErrorMessage,
  getPendingSession,
  getStatusCopy,
  HOLD_MS,
  POLL_MS,
  secondsLeft,
  type PairingState,
} from '@/lib/pairing'

type PairingScreen = 'nickname' | 'hold'
type PairingAccess =
  | { readonly kind: 'checking' }
  | { readonly kind: 'first-time' }
  | { readonly kind: 'recovery-needed' }
  | { readonly kind: 'error'; readonly message: string }

function getRecoveryErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.code === 'RECOVERY_FAILED') {
    return 'Nama atau tanggal jadiannya belum cocok.'
  }

  if (error instanceof ApiError) {
    return 'Akses belum bisa dicek. Coba lagi sebentar ya.'
  }

  if (error instanceof Error) {
    return 'Koneksi lagi belum stabil. Coba lagi sebentar.'
  }

  return 'Recovery belum bisa diproses. Coba lagi sebentar.'
}

export function PairingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectMessage =
    typeof location.state === 'object' &&
    location.state !== null &&
    'message' in location.state &&
    typeof location.state.message === 'string'
      ? location.state.message
      : ''
  const [screen, setScreen] = useState<PairingScreen>(() =>
    getPendingNickname() === '' ? 'nickname' : 'hold',
  )
  const [access, setAccess] = useState<PairingAccess>({ kind: 'checking' })
  const [nicknameInput, setNicknameInput] = useState(getPendingNickname)
  const [recoveryNickname, setRecoveryNickname] = useState(getPendingNickname)
  const [recoveryDate, setRecoveryDate] = useState('')
  const [recoveryError, setRecoveryError] = useState('')
  const [isRecovering, setIsRecovering] = useState(false)
  const [state, setState] = useState<PairingState>({ kind: 'idle' })
  const [countdown, setCountdown] = useState(30)
  const holdStartedAt = useRef(0)
  const holdTimer = useRef<number | null>(null)
  const pairingStartLocked = useRef(false)
  const recoveryLocked = useRef(false)

  useEffect(() => {
    let active = true

    async function checkAccess() {
      if (getStoredSession() !== null) {
        try {
          await resumeSession()

          if (active) {
            navigate('/', { replace: true })
          }

          return
        } catch {
          clearSession()
        }
      }

      try {
        const status = await getCoupleStatus()

        if (active) {
          setAccess(status.isPaired ? { kind: 'recovery-needed' } : { kind: 'first-time' })
        }
      } catch (error) {
        if (active) {
          setAccess({ kind: 'error', message: getPairingErrorMessage(error) })
        }
      }
    }

    checkAccess()

    return () => {
      active = false
    }
  }, [navigate])

  useEffect(() => {
    if (state.kind !== 'waiting') {
      return
    }

    const countdownTimer = window.setInterval(() => {
      setCountdown(secondsLeft(state.expiresAt))
    }, 250)

    const pollTimer = window.setInterval(() => {
      getPairingStatus(state.pairingSessionId)
        .then((data) => {
          if (data.status !== 'paired') {
            return
          }

          const session = getPendingSession(data) ?? state.pendingSession

          if (session === null) {
            setState({
              kind: 'error',
              message: 'Pairing berhasil, tapi session device ini belum tersedia.',
            })
            return
          }

          saveSession(session.memberId, session.sessionToken)
          clearPendingNickname()
          setState({ kind: 'paired' })
          navigate('/', { replace: true })
        })
        .catch((error: unknown) => {
          if (error instanceof ApiError && error.code === 'PAIRING_EXPIRED') {
            setState({ kind: 'expired' })
            return
          }

          setState({ kind: 'error', message: getPairingErrorMessage(error) })
        })
    }, POLL_MS)

    return () => {
      window.clearInterval(countdownTimer)
      window.clearInterval(pollTimer)
    }
  }, [navigate, state])

  async function beginHold() {
    const trimmedNickname = getPendingNickname()

    if (trimmedNickname.length < 2) {
      setScreen('nickname')
      setState({ kind: 'idle' })
      return
    }

    if (pairingStartLocked.current || state.kind === 'holding' || state.kind === 'starting') {
      return
    }

    pairingStartLocked.current = true
    setState({ kind: 'starting' })

    try {
      const pairing = await startPairing(trimmedNickname)

      const pairingSessionId = pairing.pairingSessionId

      if (typeof pairingSessionId !== 'string') {
        setState({ kind: 'error', message: 'Backend belum mengirim pairingSessionId.' })
        return
      }

      sessionStorage.setItem('ourspace.pairingSessionId', pairingSessionId)
      holdStartedAt.current = Date.now()
      setState({ kind: 'holding', progress: 0 })
      holdTimer.current = window.setInterval(() => {
        const progress = Math.min((Date.now() - holdStartedAt.current) / HOLD_MS, 1)
        setState({ kind: 'holding', progress })

        if (progress >= 1) {
          finishHold(pairingSessionId, trimmedNickname)
        }
      }, 40)
    } catch (error) {
      pairingStartLocked.current = false
      if (error instanceof ApiError && error.code === 'COUPLE_ALREADY_PAIRED') {
        setAccess({ kind: 'recovery-needed' })
        return
      }

      setState({ kind: 'error', message: getPairingErrorMessage(error) })
    }
  }

  function cancelHold() {
    if (state.kind !== 'holding') {
      return
    }

    clearHoldTimer()
    pairingStartLocked.current = false
    setState({ kind: 'idle' })
  }

  async function finishHold(pairingSessionId: string, trimmedNickname: string) {
    clearHoldTimer()

    try {
      const data = await signalPairing(pairingSessionId, trimmedNickname)

      if (data.status === 'paired') {
        const session = getPendingSession(data)

        if (session === null) {
          setState({ kind: 'error', message: 'Backend belum mengirim session.' })
          return
        }

        saveSession(session.memberId, session.sessionToken)
        clearPendingNickname()
        setState({ kind: 'paired' })
        navigate('/', { replace: true })
        return
      }

      setState({
        kind: 'waiting',
        expiresAt: data.expiresAt ?? null,
        pairingSessionId,
        pendingSession: getPendingSession(data),
      })
    } catch (error) {
      pairingStartLocked.current = false

      if (error instanceof ApiError && error.code === 'COUPLE_ALREADY_PAIRED') {
        setAccess({ kind: 'recovery-needed' })
        return
      }

      if (error instanceof ApiError && error.code === 'PAIRING_EXPIRED') {
        setState({ kind: 'expired' })
        return
      }

      setState({ kind: 'error', message: getPairingErrorMessage(error) })
    }
  }

function clearHoldTimer() {
    if (holdTimer.current !== null) {
      window.clearInterval(holdTimer.current)
      holdTimer.current = null
    }
  }

  function retry() {
    clearHoldTimer()
    pairingStartLocked.current = false
    sessionStorage.removeItem('ourspace.pairingSessionId')
    setState({ kind: 'idle' })
    setCountdown(30)
  }

  function continueToHold() {
    const trimmedNickname = nicknameInput.trim()

    if (trimmedNickname.length < 2) {
      setState({ kind: 'error', message: 'Nickname minimal 2 karakter.' })
      return
    }

    savePendingNickname(trimmedNickname)
    setNicknameInput(trimmedNickname)
    setState({ kind: 'idle' })
    setScreen('hold')
  }

  function changeNickname() {
    if (state.kind === 'holding' || state.kind === 'waiting' || state.kind === 'starting') {
      return
    }

    clearHoldTimer()
    clearPendingNickname()
    sessionStorage.removeItem('ourspace.pairingSessionId')
    setNicknameInput('')
    setState({ kind: 'idle' })
    setScreen('nickname')
  }

  async function submitRecovery() {
    const nickname = recoveryNickname.trim()

    if (recoveryLocked.current || isRecovering) {
      return
    }

    if (!nickname || !recoveryDate) {
      setRecoveryError('Nama dan tanggal jadian wajib diisi.')
      return
    }

    recoveryLocked.current = true
    setIsRecovering(true)
    setRecoveryError('')

    try {
      const data = await recoverSession({
        nickname,
        anniversaryDate: recoveryDate,
      })

      saveSession(data.memberId, data.sessionToken)
      clearPendingNickname()
      navigate('/', { replace: true })
    } catch (error) {
      setRecoveryError(getRecoveryErrorMessage(error))
    } finally {
      recoveryLocked.current = false
      setIsRecovering(false)
    }
  }

  const progress =
    state.kind === 'holding' ? Math.round(state.progress * 100) : 0

  if (access.kind === 'checking') {
    return <PairingStatusSkeleton />
  }

  if (access.kind === 'recovery-needed') {
    return (
      <main className="min-h-dvh bg-background px-4 pb-6 pt-8 text-foreground">
        <div className="mx-auto max-w-[420px] overflow-hidden rounded-[2rem] border bg-card p-5 shadow-[0_18px_45px_rgb(103_74_58_/_0.14)]">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.04em] text-muted-foreground">
            OurSpace
          </p>
          <h1 className="text-3xl font-black leading-tight">
            OurSpace ini sudah terikat.
          </h1>
          <p className="mt-2 text-sm font-bold leading-relaxed text-muted-foreground">
            Pairing cuma sekali. Recovery ini cuma buat masuk lagi di device ini.
          </p>
          {redirectMessage ? (
            <p className="mt-3 rounded-[1.25rem] bg-scrap-blue px-4 py-3 text-sm font-extrabold leading-relaxed text-muted-foreground">
              {redirectMessage}
            </p>
          ) : null}
          <div className="mt-4 rounded-[1.5rem] bg-scrap-yellow p-4 text-sm font-bold leading-relaxed text-muted-foreground">
            <p>
              Tulis nickname kamu dan tanggal jadian kalian. Jawaban ini hanya
              dipakai buat ngasih akses baru ke device ini.
            </p>
          </div>

          <div className="mt-3 grid gap-2 rounded-[1.5rem] bg-scrap-mint p-4 text-sm font-extrabold leading-relaxed text-muted-foreground">
            <p>Recovery tidak bikin pairing baru.</p>
            <p>Tanggal jadian tetap aman dan tidak akan diubah.</p>
          </div>

          <div className="mt-4 grid gap-4">
            <label className="block">
              <span className="text-sm font-extrabold text-muted-foreground">
                Nickname kamu
              </span>
              <Input
                className="mt-2 rounded-3xl"
                maxLength={40}
                onChange={(event) => {
                  setRecoveryNickname(event.target.value)
                  setRecoveryError('')
                }}
                placeholder="Nama kamu di OurSpace"
                value={recoveryNickname}
              />
              <span className="mt-1 block text-xs font-bold text-muted-foreground">
                Pakai nama yang dulu dipakai waktu pairing.
              </span>
            </label>
            <label className="block">
              <span className="text-sm font-extrabold text-muted-foreground">
                Tanggal jadian
              </span>
              <DatePickerInput
                ariaLabel="Tanggal jadian"
                className="mt-2 rounded-3xl"
                onChange={(value) => {
                  setRecoveryDate(value)
                  setRecoveryError('')
                }}
                value={recoveryDate}
              />
              <span className="mt-1 block text-xs font-bold text-muted-foreground">
                Pilih tanggal jadian kalian. Format yang dikirim tetap YYYY-MM-DD.
              </span>
            </label>
          </div>

          {recoveryError ? (
            <p className="mt-3 text-sm font-extrabold text-destructive">
              {recoveryError}
            </p>
          ) : null}

          <p className="mt-4 rounded-[1.25rem] bg-scrap-pink px-4 py-3 text-xs font-extrabold leading-relaxed text-muted-foreground">
            Kalau lupa tanggalnya, buka dari device yang masih login. Reset dari
            Settings cuma dipakai kalau benar-benar mau mulai ulang.
          </p>

          <Button
            className="mt-4 w-full"
            disabled={isRecovering}
            onClick={submitRecovery}
          >
            {isRecovering ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
            ) : null}
            {isRecovering ? 'Mengecek akses...' : 'Masuk lagi'}
          </Button>
        </div>
      </main>
    )
  }

  if (access.kind === 'error') {
    return (
      <main className="min-h-dvh bg-background px-4 pb-6 pt-8 text-foreground">
        <div className="mx-auto max-w-[420px] overflow-hidden rounded-[2rem] border bg-card p-5 shadow-[0_18px_45px_rgb(103_74_58_/_0.14)]">
          <h1 className="text-3xl font-black leading-tight">
            Status OurSpace belum kebaca.
          </h1>
          <p className="mt-3 text-sm font-bold leading-relaxed text-muted-foreground">
            {access.message}
          </p>
        </div>
      </main>
    )
  }

  if (screen === 'nickname') {
    return (
      <main className="min-h-dvh bg-background px-4 pb-6 pt-8 text-foreground">
        <div className="mx-auto max-w-[420px] overflow-hidden rounded-[2rem] border bg-card p-5 shadow-[0_18px_45px_rgb(103_74_58_/_0.14)]">
          <div>
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.04em] text-muted-foreground">
              OurSpace
            </p>
            <h1 className="max-w-72 text-3xl font-black leading-tight">
              Kamu mau dipanggil apa?
            </h1>
            <p className="mt-3 text-sm font-bold leading-relaxed text-muted-foreground">
              Nama ini dipakai buat pairing dan sapaan di ruang kalian nanti.
            </p>
            {redirectMessage ? (
              <p className="mt-3 rounded-[1.25rem] bg-scrap-blue px-4 py-3 text-sm font-extrabold leading-relaxed text-muted-foreground">
                {redirectMessage}
              </p>
            ) : null}
          </div>

          <div className="relative mt-5 rounded-[1.5rem] bg-scrap-yellow p-4 shadow-[0_10px_30px_rgb(103_74_58_/_0.10)]">
            <span
              aria-hidden="true"
              className="absolute -top-2 left-7 h-4 w-16 rotate-[-4deg] rounded-sm bg-white/70 shadow-[0_6px_16px_rgb(103_74_58_/_0.10)]"
            />
            <label className="block">
              <span className="text-sm font-extrabold text-muted-foreground">
                Nickname kamu
              </span>
              <Input
                className="mt-2 rounded-3xl"
                maxLength={40}
                onChange={(event) => setNicknameInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    continueToHold()
                  }
                }}
                placeholder="Contoh: sayang"
                value={nicknameInput}
              />
            </label>
            {state.kind === 'error' ? (
              <p className="mt-3 text-sm font-extrabold text-destructive">
                {state.message}
              </p>
            ) : null}
          </div>

          <Button className="mt-4 w-full" onClick={continueToHold}>
            Lanjut ke pairing
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-background px-5 py-6 text-foreground">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-[480px] flex-col justify-between overflow-hidden rounded-[2rem] border bg-card p-6 shadow-[0_24px_80px_rgb(103_74_58_/_0.14)]">
        <div>
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.04em] text-muted-foreground">
            OurSpace
          </p>
          <h1 className="max-w-72 text-4xl font-black leading-tight">
            Tahan bareng, mulai cerita kalian.
          </h1>
          <p className="mt-4 text-base font-semibold leading-relaxed text-muted-foreground">
            Tahan tombol selama 3 detik. Pasangan kamu juga harus tahan dari
            device mereka.
          </p>
          <button
            className="mt-4 text-sm font-extrabold text-primary underline decoration-2 underline-offset-4 disabled:opacity-50"
            disabled={state.kind === 'holding' || state.kind === 'waiting' || state.kind === 'starting'}
            onClick={changeNickname}
            type="button"
          >
            Ganti nama
          </button>
        </div>

        <div className="grid place-items-center py-8">
          <button
            aria-label="Tahan untuk mulai pairing"
            className="relative grid size-52 place-items-center rounded-full border-8 border-white bg-primary text-primary-foreground shadow-[0_18px_45px_rgb(241_111_143_/_0.35)] transition-transform duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring active:scale-[0.98] disabled:opacity-70"
            disabled={state.kind === 'waiting' || state.kind === 'starting'}
            onPointerCancel={cancelHold}
            onPointerDown={beginHold}
            onPointerLeave={cancelHold}
            onPointerUp={cancelHold}
            style={{
              background:
                state.kind === 'holding'
                  ? 'conic-gradient(var(--primary) ' +
                    String(progress) +
                    '%, var(--accent-yellow) 0)'
                  : undefined,
            }}
            type="button"
          >
            <span className="grid size-40 place-items-center rounded-full bg-primary">
              {state.kind === 'starting' ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" size={52} />
              ) : (
                <HeartHandshake aria-hidden="true" size={58} strokeWidth={2.2} />
              )}
            </span>
          </button>
          <p className="mt-5 text-center text-sm font-extrabold text-muted-foreground">
            {state.kind === 'holding'
              ? 'Tahan terus... ' + String(progress) + '%'
              : 'Lepas sebelum penuh berarti batal.'}
          </p>
        </div>

        <div className="rounded-[1.5rem] bg-scrap-yellow p-4">
          <p className="text-sm font-bold leading-relaxed">{getStatusCopy(state, countdown)}</p>
        </div>

        {state.kind === 'expired' || state.kind === 'error' ? (
          <Button className="mt-5" onClick={retry} variant="secondary">
            <RotateCcw aria-hidden="true" size={18} />
            Coba lagi
          </Button>
        ) : null}
      </div>
    </main>
  )
}
