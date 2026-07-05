import { ApiError, type PairingStatusData } from '@/lib/api'

export const HOLD_MS = 3000
export const POLL_MS = 1500

export type PendingSession = {
  readonly memberId: string
  readonly sessionToken: string
}

export type PairingState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'starting' }
  | { readonly kind: 'holding'; readonly progress: number }
  | {
      readonly kind: 'waiting'
      readonly expiresAt: string | null
      readonly pairingSessionId: string
      readonly pendingSession: PendingSession | null
    }
  | { readonly kind: 'expired' }
  | { readonly kind: 'paired' }
  | { readonly kind: 'error'; readonly message: string }

export function getPairingErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.code === 'PAIRING_EXPIRED') {
    return 'Waktu pairing habis. Coba tahan bareng-bareng lagi.'
  }

  if (error instanceof ApiError && error.code === 'COUPLE_ALREADY_PAIRED') {
    return 'OurSpace ini sudah terikat. Pairing cuma sekali.'
  }

  if (error instanceof ApiError && error.code === 'RECOVERY_FAILED') {
    return 'Nama atau tanggal jadiannya belum cocok.'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Pairing gagal tanpa pesan error'
}

export function getPendingSession(
  data: PairingStatusData,
): PendingSession | null {
  if (typeof data.memberId !== 'string' || typeof data.sessionToken !== 'string') {
    return null
  }

  return {
    memberId: data.memberId,
    sessionToken: data.sessionToken,
  }
}

export function secondsLeft(expiresAt: string | null) {
  if (expiresAt === null) {
    return 30
  }

  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
}

export function getStatusCopy(state: PairingState, countdown: number) {
  switch (state.kind) {
    case 'idle':
      return 'Pastikan pasangan kamu buka halaman ini juga, lalu tahan bareng.'
    case 'starting':
      return 'Lagi siapin ruang pairing...'
    case 'holding':
      return 'Jangan dilepas dulu, tinggal sebentar.'
    case 'waiting':
      return 'Sinyal kamu masuk. Nunggu pasangan kamu... ' + String(countdown) + ' detik.'
    case 'expired':
      return 'Belum barengan. Coba sekali lagi dari awal.'
    case 'paired':
      return 'Kalian sudah terikat. Masuk ke home...'
    case 'error':
      return state.message
    default:
      return assertNever(state)
  }
}

function assertNever(value: never): never {
  throw new Error('Unhandled pairing state: ' + JSON.stringify(value))
}
