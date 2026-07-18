import { isBrowserOnline } from '@/lib/online-status'
import {
  apiRequest,
  runMutation,
  readSessionCache,
  writeSessionCache,
  clearSessionCache,
  createCacheEntry,
  traceApiCall,
} from './client'
import type {
  CachedValue,
  DatePlansListData,
  DatePlanWriteInput,
  DatePlanUpdateInput,
} from './types'

const listCacheTtlMs = 60_000
const datePlansCacheKey = 'ourspace:cache:date-plans'

let cachedDatePlansList: CachedValue<DatePlansListData> | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDatePlansListData(value: unknown): value is DatePlansListData {
  return isRecord(value) && Array.isArray(value.items)
}

export async function listDatePlans() {
  const data = await apiRequest('datePlans.list', { limit: 100 }, {
    cacheStatus: getCachedDatePlansList() ? 'hit' : 'miss',
  })
  setCachedDatePlansList(data)
  return data
}

export function createDatePlan(input: DatePlanWriteInput) {
  return runMutation(
    () => apiRequest('datePlans.create', input),
    () => {
      clearCachedDatePlansList()
    },
  )
}

export function updateDatePlan(input: DatePlanUpdateInput) {
  return runMutation(
    () => apiRequest('datePlans.update', input),
    () => {
      clearCachedDatePlansList()
    },
  )
}

export function deleteDatePlan(id: string) {
  return runMutation(
    () => apiRequest('datePlans.delete', { id }),
    () => {
      clearCachedDatePlansList()
    },
  )
}

export function getCachedDatePlansList() {
  if (
    cachedDatePlansList?.expiresAt &&
    (cachedDatePlansList.expiresAt > Date.now() || !isBrowserOnline())
  ) {
    traceApiCall({ action: 'datePlans.list', cacheStatus: 'hit', status: 'cache' })
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

export function setCachedDatePlansList(data: DatePlansListData) {
  cachedDatePlansList = createCacheEntry(data, listCacheTtlMs)
  writeSessionCache(datePlansCacheKey, cachedDatePlansList)
}

export function clearCachedDatePlansList() {
  cachedDatePlansList = null
  clearSessionCache(datePlansCacheKey)
}