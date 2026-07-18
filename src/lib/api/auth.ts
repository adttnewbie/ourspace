import { apiRequest, runMutation, clearApiCaches } from './client'
import type { SessionResumeData, SessionRecoverInput, ResumeSessionOptions } from './types'

const sessionResumeTtlMs = 60_000

let cachedSessionResume:
  | {
      readonly data: SessionResumeData
      readonly expiresAt: number
    }
  | null = null

export function healthCheck() {
  return apiRequest('health.check')
}

export async function resumeSession(options: ResumeSessionOptions = {}) {
  if (
    !options.force &&
    cachedSessionResume &&
    cachedSessionResume.expiresAt > Date.now()
  ) {
    return cachedSessionResume.data
  }

  const data = await apiRequest('session.resume', {}, { dedupe: !options.force })
  cachedSessionResume = {
    data,
    expiresAt: Date.now() + sessionResumeTtlMs,
  }

  return data
}

export function recoverSession(input: SessionRecoverInput) {
  return runMutation(
    () => apiRequest('session.recover', input),
    clearApiCaches,
  )
}

export function getCoupleStatus() {
  return apiRequest('couple.status')
}

export function resetCouple() {
  return runMutation(
    () => apiRequest('couple.reset'),
    clearApiCaches,
  )
}

export function clearCachedSessionResume() {
  cachedSessionResume = null
}
