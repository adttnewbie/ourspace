import { isBrowserOnline } from '@/lib/online-status'
import {
  apiRequest,
  runMutation,
  createCacheEntry,
  traceApiCall,
} from './client'
import type {
  CachedValue,
  GalleryListData,
  GalleryCreateInput,
  GalleryUpdateInput,
  ListGalleryInput,
} from './types'

const listCacheTtlMs = 60_000

let cachedGalleryList: CachedValue<GalleryListData> | null = null

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
  return runMutation(
    () => apiRequest('gallery.create', input),
    () => {
      cachedGalleryList = null
    },
  )
}

export function updateGalleryItem(input: GalleryUpdateInput) {
  return runMutation(
    () => apiRequest('gallery.update', input),
    () => {
      cachedGalleryList = null
    },
  )
}

export function deleteGalleryItem(id: string) {
  return runMutation(
    () => apiRequest('gallery.delete', { id }),
    () => {
      cachedGalleryList = null
    },
  )
}

export function getCachedGalleryList() {
  if (
    cachedGalleryList?.expiresAt &&
    (cachedGalleryList.expiresAt > Date.now() || !isBrowserOnline())
  ) {
    traceApiCall({ action: 'gallery.list', cacheStatus: 'hit', status: 'cache' })
    return cachedGalleryList.data
  }

  cachedGalleryList = null
  traceApiCall({ action: 'gallery.list', cacheStatus: 'miss', status: 'cache' })
  return null
}

export function setCachedGalleryList(data: GalleryListData) {
  cachedGalleryList = createCacheEntry(data, listCacheTtlMs)
}

export function clearCachedGalleryList() {
  cachedGalleryList = null
}