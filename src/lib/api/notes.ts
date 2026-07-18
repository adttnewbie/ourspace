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
  NotesListData,
  ListNotesInput,
  NoteWriteInput,
  NoteUpdateInput,
} from './types'

const listCacheTtlMs = 60_000
const notesCacheKey = 'ourspace:cache:notes'

let cachedNotesList: CachedValue<NotesListData> | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNotesListData(value: unknown): value is NotesListData {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    (typeof value.nextCursor === 'string' || value.nextCursor === null)
  )
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
  return runMutation(
    () => apiRequest('notes.create', input),
    () => {
      cachedNotesList = null
      clearSessionCache(notesCacheKey)
    },
  )
}

export function updateNote(input: NoteUpdateInput) {
  return runMutation(
    () => apiRequest('notes.update', input),
    () => {
      cachedNotesList = null
      clearSessionCache(notesCacheKey)
    },
  )
}

export function deleteNote(id: string) {
  return runMutation(
    () => apiRequest('notes.delete', { id }),
    () => {
      cachedNotesList = null
      clearSessionCache(notesCacheKey)
    },
  )
}

export function getCachedNotesList() {
  if (
    cachedNotesList?.expiresAt &&
    (cachedNotesList.expiresAt > Date.now() || !isBrowserOnline())
  ) {
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

export function setCachedNotesList(data: NotesListData) {
  cachedNotesList = createCacheEntry(data, listCacheTtlMs)
  writeSessionCache(notesCacheKey, cachedNotesList)
}

export function clearCachedNotesList() {
  cachedNotesList = null
  clearSessionCache(notesCacheKey)
}