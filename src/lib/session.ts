const SESSION_STORAGE_KEY = 'ourspace.session'
const PENDING_NICKNAME_KEY = 'ourspace:nickname'

export type StoredSession = {
  readonly memberId: string
  readonly sessionToken: string
}

function isStoredSession(value: unknown): value is StoredSession {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  if (!('memberId' in value) || !('sessionToken' in value)) {
    return false
  }

  return (
    typeof value.memberId === 'string' &&
    typeof value.sessionToken === 'string'
  )
}

export function getStoredSession(): StoredSession | null {
  const rawValue = localStorage.getItem(SESSION_STORAGE_KEY)

  if (rawValue === null) {
    return null
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue)
    return isStoredSession(parsedValue) ? parsedValue : null
  } catch (error) {
    if (error instanceof SyntaxError) {
      clearSession()
      return null
    }

    throw error
  }
}

export function saveSession(memberId: string, sessionToken: string) {
  localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      memberId,
      sessionToken,
    } satisfies StoredSession),
  )
}

export function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY)
}

export function getPendingNickname() {
  return localStorage.getItem(PENDING_NICKNAME_KEY) ?? ''
}

export function savePendingNickname(nickname: string) {
  localStorage.setItem(PENDING_NICKNAME_KEY, nickname.trim())
}

export function clearPendingNickname() {
  localStorage.removeItem(PENDING_NICKNAME_KEY)
}
