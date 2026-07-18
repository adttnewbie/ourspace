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
  SharedItemsListData,
  SharedItemWriteInput,
  SharedItemUpdateInput,
} from './types'

const sharedItemsCacheKey = 'ourspace:cache:shared-lists'

let cachedSharedItemsList: CachedValue<SharedItemsListData> | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSharedItemsListData(value: unknown): value is SharedItemsListData {
  return isRecord(value) && Array.isArray(value.items)
}

export async function listSharedItems() {
  const data = await apiRequest('sharedLists.list', { limit: 50 }, {
    cacheStatus: getCachedSharedItemsList() ? 'hit' : 'miss',
  })
  setCachedSharedItemsList(data)
  return data
}

export function createSharedItem(input: SharedItemWriteInput) {
  return runMutation(
    () => apiRequest('sharedLists.create', input),
    () => {
      clearCachedSharedItemsList()
    },
  )
}

export function updateSharedItem(input: SharedItemUpdateInput) {
  return runMutation(
    () => apiRequest('sharedLists.update', input),
    () => {
      clearCachedSharedItemsList()
    },
  )
}

export function deleteSharedItem(id: string) {
  return runMutation(
    () => apiRequest('sharedLists.delete', { id }),
    () => {
      clearCachedSharedItemsList()
    },
  )
}

export function getCachedSharedItemsList() {
  if (
    cachedSharedItemsList?.expiresAt &&
    (cachedSharedItemsList.expiresAt > Date.now() || !isBrowserOnline())
  ) {
    traceApiCall({ action: 'sharedLists.list', cacheStatus: 'hit', status: 'cache' })
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

export function setCachedSharedItemsList(data: SharedItemsListData) {
  cachedSharedItemsList = createCacheEntry(data, 60_000)
  writeSessionCache(sharedItemsCacheKey, cachedSharedItemsList)
}

export function clearCachedSharedItemsList() {
  cachedSharedItemsList = null
  clearSessionCache(sharedItemsCacheKey)
}