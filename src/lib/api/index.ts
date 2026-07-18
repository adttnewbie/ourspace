import { registerCacheClear } from './client'
import { clearCachedSessionResume } from './auth'
import { clearCachedNotesList } from './notes'
import { clearCachedGalleryList } from './gallery'
import { clearCachedDatePlansList } from './dates'
import { clearCachedSharedItemsList } from './lists'
import { clearCachedHomeData } from './settings'

registerCacheClear(clearCachedSessionResume)
registerCacheClear(clearCachedHomeData)
registerCacheClear(clearCachedNotesList)
registerCacheClear(clearCachedDatePlansList)
registerCacheClear(clearCachedGalleryList)
registerCacheClear(clearCachedSharedItemsList)

export { ApiError, ApiConfigError, ApiNetworkError, apiRequest, runMutation, clearApiCaches } from './client'
export { healthCheck, resumeSession, recoverSession, getCoupleStatus, resetCouple } from './auth'
export {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
  getCachedNotesList,
  setCachedNotesList,
} from './notes'
export {
  listGallery,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  checkGalleryHealth,
  getCachedGalleryList,
  setCachedGalleryList,
} from './gallery'
export {
  listDatePlans,
  createDatePlan,
  updateDatePlan,
  deleteDatePlan,
  getCachedDatePlansList,
  setCachedDatePlansList,
} from './dates'
export {
  listSharedItems,
  createSharedItem,
  updateSharedItem,
  deleteSharedItem,
  getCachedSharedItemsList,
  setCachedSharedItemsList,
} from './lists'
export { getHome, getCachedHomeData, setCachedHomeData } from './settings'
export { startPairing, signalPairing, getPairingStatus } from './pairing'
export { checkBackupHealth, listBackups, runBackupNow } from './backup'

export type {
  ApiPayload,
  ApiRequestOptions,
  ApiErrorBody,
  ApiSuccess,
  ApiFailure,
  ApiResponse,
  ResumeSessionOptions,
  CachedValue,
  HealthCheckData,
  SessionResumeData,
  SessionRecoverData,
  SessionRecoverInput,
  CoupleStatusData,
  CoupleResetData,
  PairingStartData,
  PairingStatusData,
  StickyNote,
  HomeData,
  NotesListData,
  NoteCreateData,
  NoteDeleteData,
  ListNotesInput,
  NoteWriteInput,
  NoteUpdateInput,
  DatePlanStatus,
  DatePlan,
  DatePlansListData,
  DatePlanWriteData,
  DatePlanDeleteData,
  DatePlanWriteInput,
  DatePlanUpdateInput,
  GalleryItem,
  GalleryListData,
  GalleryHealthData,
  GalleryWriteData,
  GalleryDeleteData,
  ListGalleryInput,
  GalleryCreateInput,
  GalleryUpdateInput,
  SharedItemCategory,
  SharedItemStatus,
  SharedItem,
  SharedItemsListData,
  SharedItemWriteData,
  SharedItemDeleteData,
  SharedItemWriteInput,
  SharedItemUpdateInput,
  BackupRecord,
  BackupHealthData,
  BackupsListData,
  BackupRunData,
} from './types'