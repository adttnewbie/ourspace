export type ApiPayload = Readonly<Record<string, unknown>>

export type ApiRequestOptions = {
  readonly cacheStatus?: 'hit' | 'miss'
  readonly dedupe?: boolean
  readonly memberId?: string
  readonly sessionToken?: string
}

export type ApiErrorBody = {
  readonly code: string
  readonly message: string
}

export type ApiSuccess<TData> = {
  readonly ok: true
  readonly data: TData
}

export type ApiFailure = {
  readonly ok: false
  readonly error: ApiErrorBody
}

export type ApiResponse = ApiSuccess<unknown> | ApiFailure

export type ResumeSessionOptions = {
  readonly force?: boolean
}

export type CachedValue<TData> = {
  readonly data: TData
  readonly expiresAt: number
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

export type SessionRecoverInput = {
  readonly nickname: string
  readonly anniversaryDate: string
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
  readonly summary?: {
    readonly galleryItem?: GalleryItem | null
    readonly latestNote?: StickyNote | null
    readonly listItem?: SharedItem | null
    readonly nextDate?: DatePlan | null
  }
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

export type ListNotesInput = {
  readonly limit?: number
  readonly cursor?: string | null
}

export type NoteWriteInput = {
  readonly body: string
  readonly color?: string
}

export type NoteUpdateInput = NoteWriteInput & {
  readonly id: string
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

export type ListGalleryInput = {
  readonly limit?: number
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

export type SharedItemWriteInput = {
  readonly title: string
  readonly category?: SharedItemCategory
  readonly status?: SharedItemStatus
  readonly notes?: string
}

export type SharedItemUpdateInput = SharedItemWriteInput & {
  readonly id: string
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
