import { isBrowserOnline } from '@/lib/online-status'
import {
  apiRequest,
  readSessionCache,
  writeSessionCache,
  clearSessionCache,
  createCacheEntry,
  traceApiCall,
} from './client'
import type { CachedValue, HomeData } from './types'

const homeCacheTtlMs = 45_000
const homeCacheKey = 'ourspace:cache:home'

let cachedHomeData: CachedValue<HomeData> | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isHomeData(value: unknown): value is HomeData {
  return isRecord(value)
}

export async function getHome() {
  const data = await apiRequest('home.get', {}, {
    cacheStatus: getCachedHomeData() ? 'hit' : 'miss',
  })
  setCachedHomeData(data)
  return data
}

export function getCachedHomeData() {
  if (
    cachedHomeData?.expiresAt &&
    (cachedHomeData.expiresAt > Date.now() || !isBrowserOnline())
  ) {
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

export function setCachedHomeData(data: HomeData) {
  cachedHomeData = createCacheEntry(data, homeCacheTtlMs)
  writeSessionCache(homeCacheKey, cachedHomeData)
}

export function clearCachedHomeData() {
  cachedHomeData = null
  clearSessionCache(homeCacheKey)
}