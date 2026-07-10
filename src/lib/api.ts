import { appConfig } from '@/lib/env'
import { getStoredSession } from '@/lib/session'

type ApiPayload = Readonly<Record<string, unknown>>

type ApiRequestOptions = {
  readonly cacheStatus?: 'hit' | 'miss'
  readonly dedupe?: boolean
  readonly memberId?: string
  readonly sessionToken?: string
}

type ApiErrorBody = {
  readonly code: string
  readonly message: string
}

type ApiSuccess<TData> = {
  readonly ok: true
  readonly data: TData
}

type ApiFailure = {
  readonly ok: false
  readonly error: ApiErrorBody
}

type ApiResponse = ApiSuccess<unknown> | ApiFailure
type ResumeSessionOptions = {
  readonly force?: boolean
}
type CachedValue<TData> = {
  readonly data: TData
  readonly expiresAt: number
}

const sessionResumeTtlMs = 60_000
const homeCacheTtlMs = 45_000
const listCacheTtlMs = 60_000
const homeCacheKey = 'ourspace:cache:home'
const notesCacheKey = 'ourspace:cache:notes'
const datePlansCacheKey = 'ourspace:cache:date-plans'
const sharedItemsCacheKey = 'ourspace:cache:shared-lists'
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
let cachedSessionResume:
  | {
      readonly data: SessionResumeData
      readonly expiresAt: number
    }
  | null = null
const inFlightRequests = new Map<string, Promise<unknown>>()
let cachedHomeData: CachedValue<HomeData> | null = null
let cachedNotesList: CachedValue<NotesListData> | null = null
let cachedDatePlansList: CachedValue<DatePlansListData> | null = null
let cachedGalleryList: CachedValue<GalleryListData> | null = null
let cachedSharedItemsList: CachedValue<SharedItemsListData> | null = null

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
    typeof value.expiresAt === 'number' &&
    value.expiresAt > Date.now()
  )
}

function isHomeData(value: unknown): value is HomeData {
  return isRecord(value)
}

function isNotesListData(value: unknown): value is NotesListData {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    (typeof value.nextCursor === 'string' || value.nextCursor === null)
  )
}

function isDatePlansListData(value: unknown): value is DatePlansListData {
  return isRecord(value) && Array.isArray(value.items)
}

function isSharedItemsListData(value: unknown): value is SharedItemsListData {
  return isRecord(value) && Array.isArray(value.items)
}

function readSessionCache<TData>(
  key: string,
  isData: (value: unknown) => value is TData,
): CachedValue<TData> | null {
  try {
    const rawValue = sessionStorage.getItem(key)

    if (rawValue === null) {
      return null
    }

    const parsedValue: unknown = JSON.parse(rawValue)

    if (!isCacheEntry(parsedValue) || !isData(parsedValue.data)) {
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

function writeSessionCache<TData>(key: string, entry: CachedValue<TData>) {
  try {
    sessionStorage.setItem(key, JSON.stringify(entry))
  } catch (error) {
    if (error instanceof Error) {
      return
    }

    throw error
  }
}

function clearSessionCache(key: string) {
  try {
    sessionStorage.removeItem(key)
  } catch (error) {
    if (error instanceof Error) {
      return
    }

    throw error
  }
}

function createCacheEntry<TData>(
  data: TData,
  ttlMs: number,
): CachedValue<TData> {
  return {
    data,
    expiresAt: Date.now() + ttlMs,
  }
}

function isDedupedReadAction(action: string) {
  return dedupedReadActions.some((readAction) => readAction === action)
}

function traceApiCall(event: {
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
): Promise<HealthCheckData>
export function apiRequest(
  action: 'session.resume',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<SessionResumeData>
export function apiRequest(
  action: 'session.recover',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<SessionRecoverData>
export function apiRequest(
  action: 'couple.status',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<CoupleStatusData>
export function apiRequest(
  action: 'couple.reset',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<CoupleResetData>
export function apiRequest(
  action: 'pairing.start',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<PairingStartData>
export function apiRequest(
  action: 'pairing.signal',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<PairingStatusData>
export function apiRequest(
  action: 'pairing.status',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<PairingStatusData>
export function apiRequest(
  action: 'home.get',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<HomeData>
export function apiRequest(
  action: 'notes.list',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<NotesListData>
export function apiRequest(
  action: 'notes.create',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<NoteCreateData>
export function apiRequest(
  action: 'notes.update',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<NoteCreateData>
export function apiRequest(
  action: 'notes.delete',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<NoteDeleteData>
export function apiRequest(
  action: 'datePlans.list',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<DatePlansListData>
export function apiRequest(
  action: 'datePlans.create',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<DatePlanWriteData>
export function apiRequest(
  action: 'datePlans.update',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<DatePlanWriteData>
export function apiRequest(
  action: 'datePlans.delete',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<DatePlanDeleteData>
export function apiRequest(
  action: 'gallery.list',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<GalleryListData>
export function apiRequest(
  action: 'gallery.health',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<GalleryHealthData>
export function apiRequest(
  action: 'gallery.create',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<GalleryWriteData>
export function apiRequest(
  action: 'gallery.update',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<GalleryWriteData>
export function apiRequest(
  action: 'gallery.delete',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<GalleryDeleteData>
export function apiRequest(
  action: 'sharedLists.list',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<SharedItemsListData>
export function apiRequest(
  action: 'sharedLists.create',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<SharedItemWriteData>
export function apiRequest(
  action: 'sharedLists.update',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<SharedItemWriteData>
export function apiRequest(
  action: 'sharedLists.delete',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<SharedItemDeleteData>
export function apiRequest(
  action: 'backup.health',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<BackupHealthData>
export function apiRequest(
  action: 'backups.list',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<BackupsListData>
export function apiRequest(
  action: 'backup.runNow',
  payload?: ApiPayload,
  options?: ApiRequestOptions,
): Promise<BackupRunData>
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
  const response = await fetch(appConfig.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body,
  })

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

export type HealthCheckData = {
  readonly service?: string
  readonly status?: string
  readonly timestamp?: string
}

export type SessionResumeData = {
  readonly member?: {
    readonly id: string
    readonly nickname: string
  }
  readonly members?: readonly {
    readonly id: string
    readonly nickname: string
  }[]
  readonly anniversaryDate?: string | null
}

export type SessionRecoverData = SessionResumeData & {
  readonly memberId: string
  readonly sessionToken: string
}

export type CoupleStatusData = {
  readonly isPaired: boolean
}

export type CoupleResetData = {
  readonly reset: boolean
  readonly isPaired: boolean
  readonly membersReset?: number
  readonly pairingSessionsExpired?: number
}

export type PairingStartData = {
  readonly pairingSessionId?: string
  readonly status?: string
  readonly expiresAt?: string
}

export type PairingStatusData = {
  readonly anniversaryDate?: string | null
  readonly memberId?: string
  readonly members?: readonly {
    readonly id: string
    readonly nickname: string
  }[]
  readonly pairingSessionId?: string
  readonly sessionToken?: string
  readonly status?: string
  readonly expiresAt?: string
}

export type HomeData = {
  readonly greeting?: string
  readonly anniversaryDate?: string | null
  readonly daysTogether?: number
  readonly today?: {
    readonly stickyNotes?: readonly StickyNote[]
  }
  readonly counts?: {
    readonly stickyNotes?: number
  }
}

export type StickyNote = {
  readonly id: string
  readonly body: string
  readonly color: string
  readonly createdBy: string
  readonly createdByNickname?: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly canEdit?: boolean
}

export type NotesListData = {
  readonly items: readonly StickyNote[]
  readonly nextCursor: string | null
}

export type NoteCreateData = {
  readonly note: StickyNote
}

export type NoteDeleteData = {
  readonly id: string
  readonly deletedAt?: string
}

export type DatePlanStatus = 'idea' | 'planned' | 'done' | 'cancelled'

export type DatePlan = {
  readonly id: string
  readonly title: string
  readonly scheduledAt: string
  readonly locationName?: string
  readonly status: DatePlanStatus
  readonly notes?: string
  readonly createdBy: string
  readonly createdByNickname?: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly canEdit?: boolean
  readonly isPast?: boolean
}

export type DatePlansListData = {
  readonly items: readonly DatePlan[]
}

export type DatePlanWriteData = {
  readonly plan: DatePlan
}

export type DatePlanDeleteData = {
  readonly id: string
  readonly deletedAt?: string
}

export type GalleryItem = {
  readonly id: string
  readonly fileName: string
  readonly mimeType: string
  readonly fileSize: number
  readonly thumbnailData: string
  readonly caption: string
  readonly takenAt: string
  readonly createdBy: string
  readonly createdByNickname?: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly canEdit?: boolean
}

export type GalleryListData = {
  readonly items: readonly GalleryItem[]
}

export type GalleryHealthData = {
  readonly service?: string
  readonly status?: string
  readonly driveRootFolderConfigured?: boolean
  readonly galleryFolderName?: string
}

export type GalleryWriteData = {
  readonly item: GalleryItem
}

export type GalleryDeleteData = {
  readonly id: string
  readonly deletedAt?: string
}

export type SharedItemCategory =
  | 'place'
  | 'food'
  | 'movie'
  | 'gift'
  | 'activity'
  | 'other'

export type SharedItemStatus = 'todo' | 'doing' | 'done'

export type SharedItem = {
  readonly id: string
  readonly title: string
  readonly category: SharedItemCategory
  readonly status: SharedItemStatus
  readonly notes?: string
  readonly createdBy: string
  readonly createdByNickname?: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly canEdit?: boolean
}

export type SharedItemsListData = {
  readonly items: readonly SharedItem[]
}

export type SharedItemWriteData = {
  readonly item: SharedItem
}

export type SharedItemDeleteData = {
  readonly id: string
  readonly deletedAt?: string
}

export type BackupRecord = {
  readonly id: string
  readonly fileId: string
  readonly status: string
  readonly message: string
  readonly createdAt: string
  readonly updatedAt: string
}

export type BackupHealthData = {
  readonly service?: string
  readonly status?: string
  readonly driveRootFolderConfigured?: boolean
  readonly backupsFolderAccessible?: boolean
  readonly backupFolderName?: string
  readonly latestBackup?: BackupRecord | null
}

export type BackupsListData = {
  readonly items: readonly BackupRecord[]
}

export type BackupRunData = {
  readonly backup?: {
    readonly status?: string
    readonly fileId?: string
    readonly message?: string
    readonly createdAt?: string
  }
}

export type ListNotesInput = {
  readonly limit?: number
  readonly cursor?: string | null
}

export type ListGalleryInput = {
  readonly limit?: number
}

export type NoteWriteInput = {
  readonly body: string
  readonly color?: string
}

export type NoteUpdateInput = NoteWriteInput & {
  readonly id: string
}

export type DatePlanWriteInput = {
  readonly title: string
  readonly scheduledAt: string
  readonly locationName?: string
  readonly status?: DatePlanStatus
  readonly notes?: string
}

export type DatePlanUpdateInput = DatePlanWriteInput & {
  readonly id: string
}

export type GalleryCreateInput = {
  readonly fileName: string
  readonly mimeType: string
  readonly fileSize: number
  readonly base64: string
  readonly thumbnailData?: string
  readonly caption: string
  readonly takenAt: string
}

export type GalleryUpdateInput = {
  readonly id: string
  readonly caption: string
  readonly takenAt: string
}

export type SharedItemWriteInput = {
  readonly title: string
  readonly category?: SharedItemCategory
  readonly status?: SharedItemStatus
  readonly notes?: string
}

export type SharedItemUpdateInput = SharedItemWriteInput & {
  readonly id: string
}

export type SessionRecoverInput = {
  readonly nickname: string
  readonly anniversaryDate: string
}

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
  clearApiCaches()
  return apiRequest('session.recover', input)
}

export function getCoupleStatus() {
  return apiRequest('couple.status')
}

export function resetCouple() {
  clearApiCaches()
  return apiRequest('couple.reset')
}

export function startPairing(nickname: string) {
  return apiRequest('pairing.start', { nickname })
}

export function signalPairing(pairingSessionId: string, nickname: string) {
  return apiRequest('pairing.signal', {
    pairingSessionId,
    nickname,
  })
}

export function getPairingStatus(pairingSessionId: string) {
  return apiRequest('pairing.status', { pairingSessionId })
}

export async function getHome() {
  const data = await apiRequest('home.get', {}, {
    cacheStatus: getCachedHomeData() ? 'hit' : 'miss',
  })
  setCachedHomeData(data)
  return data
}

export async function listNotes(input: ListNotesInput = {}) {
  const data = await apiRequest('notes.list', {
    limit: input.limit,
    cursor: input.cursor ?? null,
  }, {
    cacheStatus: getCachedNotesList() ? 'hit' : 'miss',
  })

  if ((input.limit ?? 50) === 50 && (input.cursor ?? null) === null) {
    setCachedNotesList(data)
  }

  return data
}

export function createNote(input: NoteWriteInput) {
  clearCachedHomeData()
  clearCachedNotesList()
  return apiRequest('notes.create', input)
}

export function updateNote(input: NoteUpdateInput) {
  clearCachedHomeData()
  clearCachedNotesList()
  return apiRequest('notes.update', input)
}

export function deleteNote(id: string) {
  clearCachedHomeData()
  clearCachedNotesList()
  return apiRequest('notes.delete', { id })
}

export async function listDatePlans() {
  const data = await apiRequest('datePlans.list', { limit: 100 }, {
    cacheStatus: getCachedDatePlansList() ? 'hit' : 'miss',
  })
  setCachedDatePlansList(data)
  return data
}

export function createDatePlan(input: DatePlanWriteInput) {
  clearCachedHomeData()
  clearCachedDatePlansList()
  return apiRequest('datePlans.create', input)
}

export function updateDatePlan(input: DatePlanUpdateInput) {
  clearCachedHomeData()
  clearCachedDatePlansList()
  return apiRequest('datePlans.update', input)
}

export function deleteDatePlan(id: string) {
  clearCachedHomeData()
  clearCachedDatePlansList()
  return apiRequest('datePlans.delete', { id })
}

export async function listGallery(input: ListGalleryInput = {}) {
  const limit = input.limit ?? 30
  const data = await apiRequest('gallery.list', { limit }, {
    cacheStatus: getCachedGalleryList() ? 'hit' : 'miss',
  })

  if (limit === 30) {
    setCachedGalleryList(data)
  }

  return data
}

export function checkGalleryHealth() {
  return apiRequest('gallery.health')
}

export function createGalleryItem(input: GalleryCreateInput) {
  clearCachedHomeData()
  clearCachedGalleryList()
  return apiRequest('gallery.create', input)
}

export function updateGalleryItem(input: GalleryUpdateInput) {
  clearCachedHomeData()
  clearCachedGalleryList()
  return apiRequest('gallery.update', input)
}

export function deleteGalleryItem(id: string) {
  clearCachedHomeData()
  clearCachedGalleryList()
  return apiRequest('gallery.delete', { id })
}

export async function listSharedItems() {
  const data = await apiRequest('sharedLists.list', { limit: 50 }, {
    cacheStatus: getCachedSharedItemsList() ? 'hit' : 'miss',
  })
  setCachedSharedItemsList(data)
  return data
}

export function createSharedItem(input: SharedItemWriteInput) {
  clearCachedHomeData()
  clearCachedSharedItemsList()
  return apiRequest('sharedLists.create', input)
}

export function updateSharedItem(input: SharedItemUpdateInput) {
  clearCachedHomeData()
  clearCachedSharedItemsList()
  return apiRequest('sharedLists.update', input)
}

export function deleteSharedItem(id: string) {
  clearCachedHomeData()
  clearCachedSharedItemsList()
  return apiRequest('sharedLists.delete', { id })
}

export function getCachedHomeData() {
  if (cachedHomeData?.expiresAt && cachedHomeData.expiresAt > Date.now()) {
    traceApiCall({ action: 'home.get', cacheStatus: 'hit', status: 'cache' })
    return cachedHomeData.data
  }

  const entry = readSessionCache(homeCacheKey, isHomeData)
  cachedHomeData = entry
  traceApiCall({
    action: 'home.get',
    cacheStatus: entry ? 'hit' : 'miss',
    status: 'cache',
  })
  return entry?.data ?? null
}

export function getCachedNotesList() {
  if (cachedNotesList?.expiresAt && cachedNotesList.expiresAt > Date.now()) {
    traceApiCall({ action: 'notes.list', cacheStatus: 'hit', status: 'cache' })
    return cachedNotesList.data
  }

  const entry = readSessionCache(notesCacheKey, isNotesListData)
  cachedNotesList = entry
  traceApiCall({
    action: 'notes.list',
    cacheStatus: entry ? 'hit' : 'miss',
    status: 'cache',
  })
  return entry?.data ?? null
}

export function getCachedDatePlansList() {
  if (
    cachedDatePlansList?.expiresAt &&
    cachedDatePlansList.expiresAt > Date.now()
  ) {
    traceApiCall({
      action: 'datePlans.list',
      cacheStatus: 'hit',
      status: 'cache',
    })
    return cachedDatePlansList.data
  }

  const entry = readSessionCache(datePlansCacheKey, isDatePlansListData)
  cachedDatePlansList = entry
  traceApiCall({
    action: 'datePlans.list',
    cacheStatus: entry ? 'hit' : 'miss',
    status: 'cache',
  })
  return entry?.data ?? null
}

export function getCachedGalleryList() {
  if (cachedGalleryList?.expiresAt && cachedGalleryList.expiresAt > Date.now()) {
    traceApiCall({ action: 'gallery.list', cacheStatus: 'hit', status: 'cache' })
    return cachedGalleryList.data
  }

  cachedGalleryList = null
  traceApiCall({ action: 'gallery.list', cacheStatus: 'miss', status: 'cache' })
  return null
}

export function getCachedSharedItemsList() {
  if (
    cachedSharedItemsList?.expiresAt &&
    cachedSharedItemsList.expiresAt > Date.now()
  ) {
    traceApiCall({
      action: 'sharedLists.list',
      cacheStatus: 'hit',
      status: 'cache',
    })
    return cachedSharedItemsList.data
  }

  const entry = readSessionCache(sharedItemsCacheKey, isSharedItemsListData)
  cachedSharedItemsList = entry
  traceApiCall({
    action: 'sharedLists.list',
    cacheStatus: entry ? 'hit' : 'miss',
    status: 'cache',
  })
  return entry?.data ?? null
}

export function setCachedHomeData(data: HomeData) {
  const entry = createCacheEntry(data, homeCacheTtlMs)
  cachedHomeData = entry
  writeSessionCache(homeCacheKey, entry)
}

export function setCachedNotesList(data: NotesListData) {
  const entry = createCacheEntry(data, listCacheTtlMs)
  cachedNotesList = entry
  writeSessionCache(notesCacheKey, entry)
}

export function setCachedDatePlansList(data: DatePlansListData) {
  const entry = createCacheEntry(data, listCacheTtlMs)
  cachedDatePlansList = entry
  writeSessionCache(datePlansCacheKey, entry)
}

export function setCachedGalleryList(data: GalleryListData) {
  cachedGalleryList = createCacheEntry(data, listCacheTtlMs)
}

export function setCachedSharedItemsList(data: SharedItemsListData) {
  const entry = createCacheEntry(data, listCacheTtlMs)
  cachedSharedItemsList = entry
  writeSessionCache(sharedItemsCacheKey, entry)
}

function clearCachedHomeData() {
  cachedHomeData = null
  clearSessionCache(homeCacheKey)
}

function clearCachedNotesList() {
  cachedNotesList = null
  clearSessionCache(notesCacheKey)
}

function clearCachedDatePlansList() {
  cachedDatePlansList = null
  clearSessionCache(datePlansCacheKey)
}

function clearCachedGalleryList() {
  cachedGalleryList = null
}

function clearCachedSharedItemsList() {
  cachedSharedItemsList = null
  clearSessionCache(sharedItemsCacheKey)
}

export function clearApiCaches() {
  cachedSessionResume = null
  clearCachedHomeData()
  clearCachedNotesList()
  clearCachedDatePlansList()
  clearCachedGalleryList()
  clearCachedSharedItemsList()
}

export function checkBackupHealth() {
  return apiRequest('backup.health')
}

export function listBackups() {
  return apiRequest('backups.list', { limit: 20 })
}

export function runBackupNow() {
  return apiRequest('backup.runNow', {}, { dedupe: false })
}
