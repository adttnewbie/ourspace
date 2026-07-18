import { appConfig } from '@/lib/env'
import { getStoredSession } from '@/lib/session'
import { isBrowserOnline, offlineMessage } from '@/lib/online-status'
import type { ApiPayload, ApiRequestOptions, ApiErrorBody, ApiResponse, CachedValue } from './types'

export class ApiError extends Error {
  readonly code: string

  constructor(error: ApiErrorBody) {
    super(error.message)
    this.name = 'ApiError'
    this.code = error.code
  }
}

export class ApiConfigError extends Error {
  constructor() {
    super('VITE_API_URL belum di-set')
    this.name = 'ApiConfigError'
  }
}

export class ApiNetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiNetworkError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCacheEntry(value: unknown): value is CachedValue<unknown> {
  return (
    isRecord(value) &&
    'data' in value &&
    typeof value.expiresAt === 'number'
  )
}

export function readSessionCache<TData>(
  key: string,
  isData: (value: unknown) => value is TData,
): CachedValue<TData> | null {
  try {
    const rawValue = sessionStorage.getItem(key)

    if (rawValue === null) {
      return null
    }

    const parsedValue: unknown = JSON.parse(rawValue)

    if (
      !isCacheEntry(parsedValue) ||
      !isData(parsedValue.data) ||
      (parsedValue.expiresAt <= Date.now() && isBrowserOnline())
    ) {
      sessionStorage.removeItem(key)
      return null
    }

    return {
      data: parsedValue.data,
      expiresAt: parsedValue.expiresAt,
    }
  } catch (error) {
    if (error instanceof Error) {
      return null
    }

    throw error
  }
}

export function writeSessionCache<TData>(key: string, entry: CachedValue<TData>) {
  try {
    sessionStorage.setItem(key, JSON.stringify(entry))
  } catch (error) {
    if (error instanceof Error) {
      return
    }

    throw error
  }
}

export function clearSessionCache(key: string) {
  try {
    sessionStorage.removeItem(key)
  } catch (error) {
    if (error instanceof Error) {
      return
    }

    throw error
  }
}

export function createCacheEntry<TData>(
  data: TData,
  ttlMs: number,
): CachedValue<TData> {
  return {
    data,
    expiresAt: Date.now() + ttlMs,
  }
}

const dedupedReadActions = [
  'health.check',
  'session.resume',
  'couple.status',
  'home.get',
  'notes.list',
  'datePlans.list',
  'gallery.list',
  'sharedLists.list',
  'backup.health',
  'backups.list',
  'gallery.health',
] as const

const inFlightRequests = new Map<string, Promise<unknown>>()

function isDedupedReadAction(action: string) {
  return dedupedReadActions.some((readAction) => readAction === action)
}

export function traceApiCall(event: {
  readonly action: string
  readonly cacheStatus?: 'hit' | 'miss'
  readonly deduped?: boolean
  readonly durationMs?: number
  readonly errorCode?: string
  readonly status: 'cache' | 'start' | 'success' | 'error' | 'deduped'
}) {
  if (!import.meta.env.DEV) {
    return
  }

  console.debug('[OurSpace API]', {
    action: event.action,
    cache: event.cacheStatus,
    deduped: event.deduped,
    durationMs: event.durationMs,
    errorCode: event.errorCode,
    status: event.status,
    timestamp: new Date().toISOString(),
  })
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    isRecord(value) &&
    typeof value.code === 'string' &&
    typeof value.message === 'string'
  )
}

function parseApiResponse(value: unknown): ApiResponse {
  if (!isRecord(value) || typeof value.ok !== 'boolean') {
    throw new ApiNetworkError('Response API tidak sesuai format')
  }

  if (value.ok) {
    return {
      ok: true,
      data: value.data,
    }
  }

  if (!isApiErrorBody(value.error)) {
    throw new ApiNetworkError('Response error API tidak sesuai format')
  }

  return {
    ok: false,
    error: value.error,
  }
}

function getRequestIdentity(options?: ApiRequestOptions) {
  const storedSession = getStoredSession()

  return {
    memberId: options?.memberId ?? storedSession?.memberId ?? '',
    sessionToken: options?.sessionToken ?? storedSession?.sessionToken ?? '',
  }
}

export function apiRequest(
  action: 'health.check',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').HealthCheckData>
export function apiRequest(
  action: 'session.resume',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').SessionResumeData>
export function apiRequest(
  action: 'session.recover',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').SessionRecoverData>
export function apiRequest(
  action: 'couple.status',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').CoupleStatusData>
export function apiRequest(
  action: 'couple.reset',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').CoupleResetData>
export function apiRequest(
  action: 'pairing.start',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').PairingStartData>
export function apiRequest(
  action: 'pairing.signal',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').PairingStatusData>
export function apiRequest(
  action: 'pairing.status',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').PairingStatusData>
export function apiRequest(
  action: 'home.get',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').HomeData>
export function apiRequest(
  action: 'notes.list',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').NotesListData>
export function apiRequest(
  action: 'notes.create',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').NoteCreateData>
export function apiRequest(
  action: 'notes.update',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').NoteCreateData>
export function apiRequest(
  action: 'notes.delete',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').NoteDeleteData>
export function apiRequest(
  action: 'datePlans.list',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').DatePlansListData>
export function apiRequest(
  action: 'datePlans.create',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').DatePlanWriteData>
export function apiRequest(
  action: 'datePlans.update',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').DatePlanWriteData>
export function apiRequest(
  action: 'datePlans.delete',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').DatePlanDeleteData>
export function apiRequest(
  action: 'gallery.list',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').GalleryListData>
export function apiRequest(
  action: 'gallery.health',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').GalleryHealthData>
export function apiRequest(
  action: 'gallery.create',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').GalleryWriteData>
export function apiRequest(
  action: 'gallery.update',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').GalleryWriteData>
export function apiRequest(
  action: 'gallery.delete',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').GalleryDeleteData>
export function apiRequest(
  action: 'sharedLists.list',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').SharedItemsListData>
export function apiRequest(
  action: 'sharedLists.create',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').SharedItemWriteData>
export function apiRequest(
  action: 'sharedLists.update',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').SharedItemWriteData>
export function apiRequest(
  action: 'sharedLists.delete',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').SharedItemDeleteData>
export function apiRequest(
  action: 'backup.health',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').BackupHealthData>
export function apiRequest(
  action: 'backups.list',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').BackupsListData>
export function apiRequest(
  action: 'backup.runNow',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<import('./types').BackupRunData>
export async function apiRequest(
  action: string,
  payload: ApiPayload = {},
  options?: ApiRequestOptions,
): Promise<unknown> {
  if (appConfig.apiUrl === '') {
    throw new ApiConfigError()
  }

  const identity = getRequestIdentity(options)
  const requestKey = `${appConfig.apiUrl}:${action}:${identity.memberId}:${JSON.stringify(payload)}`
  const body = JSON.stringify({
    action,
    memberId: identity.memberId,
    sessionToken: identity.sessionToken,
    payload,
  })
  const shouldDedupe = options?.dedupe !== false && isDedupedReadAction(action)
  const existingRequest = shouldDedupe ? inFlightRequests.get(requestKey) : undefined

  if (existingRequest) {
    traceApiCall({
      action,
      cacheStatus: options?.cacheStatus,
      deduped: true,
      status: 'deduped',
    })
    return existingRequest
  }

  const startedAt = performance.now()
  traceApiCall({ action, cacheStatus: options?.cacheStatus, status: 'start' })
  const request = sendApiRequest(body)
    .then((data) => {
      traceApiCall({
        action,
        cacheStatus: options?.cacheStatus,
        durationMs: Math.round(performance.now() - startedAt),
        status: 'success',
      })
      return data
    })
    .catch((error: unknown) => {
      traceApiCall({
        action,
        cacheStatus: options?.cacheStatus,
        durationMs: Math.round(performance.now() - startedAt),
        errorCode: error instanceof ApiError ? error.code : error instanceof Error ? error.name : 'UNKNOWN',
        status: 'error',
      })
      throw error
    })
    .finally(() => {
      if (shouldDedupe) {
        inFlightRequests.delete(requestKey)
      }
    })

  if (shouldDedupe) {
    inFlightRequests.set(requestKey, request)
  }

  return request
}

async function sendApiRequest(body: string): Promise<unknown> {
  if (!isBrowserOnline()) {
    throw new ApiError({ code: 'NETWORK_OFFLINE', message: offlineMessage })
  }

  let response: Response

  try {
    response = await fetch(appConfig.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body,
    })
  } catch (error) {
    if (!isBrowserOnline() || error instanceof TypeError) {
      throw new ApiError({ code: 'NETWORK_OFFLINE', message: offlineMessage })
    }

    throw new ApiNetworkError('API belum bisa dihubungi. Coba lagi sebentar.')
  }

  const responseText = await response.text()
  let responseBody: unknown

  try {
    responseBody = JSON.parse(responseText)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ApiNetworkError('HTTP ' + String(response.status))
    }

    throw error
  }

  const apiResponse = parseApiResponse(responseBody)

  if (!apiResponse.ok) {
    throw new ApiError(apiResponse.error)
  }

  if (!response.ok) {
    throw new ApiNetworkError('HTTP ' + String(response.status))
  }

  return apiResponse.data
}

export async function runMutation<TData>(
  request: () => Promise<TData>,
  clearCaches: () => void,
) {
  const data = await request()
  clearCaches()
  return data
}

const cacheClearCallbacks: (() => void)[] = []

export function registerCacheClear(callback: () => void) {
  cacheClearCallbacks.push(callback)
}

export function clearApiCaches() {
  cacheClearCallbacks.forEach((callback) => callback())
}
