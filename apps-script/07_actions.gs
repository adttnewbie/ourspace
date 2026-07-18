function routeAction(request) {
  switch (request.action) {
    case 'health.check':
      return healthCheck()
    case 'session.resume':
      return getSessionResume(request)
    case 'session.recover':
      return recoverSession(request)
    case 'couple.status':
      return getCoupleStatus()
    case 'couple.reset':
      return resetCouple(request)
    case 'pairing.start':
      return pairingStart(request)
    case 'pairing.signal':
      return pairingSignal(request)
    case 'pairing.status':
      return pairingStatus(request)
    case 'home.get':
      return homeGet(request)
    case 'notes.list':
      return notesList(request)
    case 'notes.create':
      return notesCreate(request)
    case 'notes.update':
      return notesUpdate(request)
    case 'notes.delete':
      return notesDelete(request)
    case 'datePlans.list':
      return datePlansList(request)
    case 'datePlans.create':
      return datePlansCreate(request)
    case 'datePlans.update':
      return datePlansUpdate(request)
    case 'datePlans.delete':
      return datePlansDelete(request)
    case 'gallery.list':
      return galleryList(request)
    case 'gallery.health':
      return galleryHealth(request)
    case 'gallery.create':
      return galleryCreate(request)
    case 'gallery.update':
      return galleryUpdate(request)
    case 'gallery.delete':
      return galleryDelete(request)
    case 'sharedLists.list':
      return sharedListsList(request)
    case 'sharedLists.create':
      return sharedListsCreate(request)
    case 'sharedLists.update':
      return sharedListsUpdate(request)
    case 'sharedLists.delete':
      return sharedListsDelete(request)
    case 'backup.health':
      return backupHealth(request)
    case 'backups.list':
      return backupsList(request)
    case 'backup.runNow':
      return backupRunNow(request)
    case 'maintenance.runNow':
      return maintenanceRunNow(request)
    case 'maintenance.installTrigger':
      return maintenanceInstallTrigger()
    case 'maintenance.removeTrigger':
      return maintenanceRemoveTrigger()
    case 'maintenance.status':
      return maintenanceStatus()
    default:
      throw newAppError('NOT_FOUND', 'Unknown action: ' + request.action)
  }
}

function healthCheck() {
  return {
    service: 'ourspace-apps-script',
    status: 'ok',
    timestamp: nowIso(),
    requiredProperties: getRequiredPropertyReport(),
  }
}

function homeGet(request) {
  var session = validateSession(request)
  var anniversaryDate = getSetting('anniversaryDate')
  var activeNotes = listActiveStickyNotes(session.memberId)
  var activeDatePlans = listActiveDatePlans(session.memberId)
  var activeGalleryItems = listActiveGalleryItems(session.memberId)
  var activeSharedItems = listActiveSharedItems(session.memberId)

  return {
    greeting: 'Hai, ' + session.nickname,
    anniversaryDate: anniversaryDate,
    daysTogether: calculateDaysTogether(anniversaryDate),
    today: {
      stickyNotes: activeNotes.filter(function (note) {
        return isTodayIso(note.createdAt)
      }),
    },
    counts: {
      stickyNotes: activeNotes.length,
    },
    summary: buildHomeSummary(
      activeNotes,
      activeDatePlans,
      activeGalleryItems,
      activeSharedItems,
    ),
  }
}

function buildHomeSummary(notes, datePlans, galleryItems, sharedItems) {
  var now = Date.now()
  var latestNote = notes.slice().sort(function (a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })[0] || null
  var nextDate = datePlans
    .filter(function (plan) {
      return (
        plan.status !== 'cancelled' &&
        new Date(plan.scheduledAt).getTime() >= now
      )
    })
    .sort(function (a, b) {
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    })[0] || null
  var galleryItem = galleryItems.slice().sort(function (a, b) {
    var takenDiff = new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()

    if (takenDiff !== 0) {
      return takenDiff
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })[0] || null
  var listItem = sharedItems
    .filter(function (item) {
      return item.status !== 'done'
    })
    .sort(function (a, b) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })[0] || null

  return {
    galleryItem: galleryItem,
    latestNote: latestNote,
    listItem: listItem,
    nextDate: nextDate,
  }
}

function notesList(request) {
  var session = validateSession(request)
  var limit = normalizeNotesLimit(request.payload.limit)
  var cursor = normalizeNotesCursor(request.payload.cursor)
  var notes = listActiveStickyNotes(session.memberId).sort(function (a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  var items = notes.slice(cursor, cursor + limit)
  var nextCursor = cursor + limit < notes.length ? String(cursor + limit) : null

  return {
    items: items,
    nextCursor: nextCursor,
  }
}

function notesCreate(request) {
  var session = validateSession(request)
  var body = normalizeNoteBody(request.payload.body)
  var color = normalizeNoteColor(request.payload.color || 'yellow')

  var timestamp = nowIso()
  var note = appendObjectRow('sticky_notes', {
    id: newId('note'),
    body: body,
    color: color,
    createdBy: session.memberId,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: '',
  })

  return {
    note: formatStickyNote(note, session.memberId, {
      id: session.memberId,
      nickname: session.nickname,
    }),
  }
}

function notesUpdate(request) {
  var session = validateSession(request)
  var note = getStickyNoteForWrite(request.payload.id)
  var body = normalizeNoteBody(request.payload.body)
  var color = normalizeNoteColor(request.payload.color || note.color || 'yellow')
  var timestamp = nowIso()

  if (note.createdBy !== session.memberId) {
    throw newAppError('FORBIDDEN', 'Note ini cuma bisa diedit pembuatnya')
  }

  updateObjectRow('sticky_notes', note.rowNumber, {
    body: body,
    color: color,
    updatedAt: timestamp,
  })

  note.body = body
  note.color = color
  note.updatedAt = timestamp

  return {
    note: formatStickyNote(note, session.memberId, {
      id: session.memberId,
      nickname: session.nickname,
    }),
  }
}

function notesDelete(request) {
  var session = validateSession(request)
  var note = getStickyNoteForWrite(request.payload.id)
  var timestamp = nowIso()

  if (note.createdBy !== session.memberId) {
    throw newAppError('FORBIDDEN', 'Note ini cuma bisa dihapus pembuatnya')
  }

  updateObjectRow('sticky_notes', note.rowNumber, {
    deletedAt: timestamp,
    updatedAt: timestamp,
  })

  return {
    id: note.id,
    deletedAt: timestamp,
  }
}

function datePlansList(request) {
  var session = validateSession(request)
  var limit = normalizeListLimit(request.payload.limit, 100)
  var plans = listActiveDatePlans(session.memberId).sort(function (a, b) {
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  }).slice(0, limit)

  return {
    items: plans,
  }
}

function datePlansCreate(request) {
  var session = validateSession(request)
  var title = normalizeDatePlanTitle(request.payload.title)
  var scheduledAt = normalizeDatePlanScheduledAt(request.payload.scheduledAt)
  var locationName = normalizeOptionalDatePlanText(request.payload.locationName)
  var status = normalizeDatePlanStatus(request.payload.status || 'idea')
  var notes = normalizeOptionalDatePlanText(request.payload.notes)
  var timestamp = nowIso()

  var plan = appendObjectRow('date_plans', {
    id: newId('date'),
    title: title,
    scheduledAt: scheduledAt,
    locationName: locationName,
    status: status,
    notes: notes,
    createdBy: session.memberId,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: '',
  })

  return {
    plan: formatDatePlan(plan, session.memberId, {
      id: session.memberId,
      nickname: session.nickname,
    }),
  }
}

function datePlansUpdate(request) {
  var session = validateSession(request)
  var plan = getDatePlanForWrite(request.payload.id)
  var title = normalizeDatePlanTitle(request.payload.title)
  var scheduledAt = normalizeDatePlanScheduledAt(request.payload.scheduledAt)
  var locationName = normalizeOptionalDatePlanText(request.payload.locationName)
  var status = normalizeDatePlanStatus(request.payload.status || plan.status || 'idea')
  var notes = normalizeOptionalDatePlanText(request.payload.notes)
  var timestamp = nowIso()

  if (plan.createdBy !== session.memberId) {
    throw newAppError('FORBIDDEN', 'Rencana date ini cuma bisa diedit pembuatnya')
  }

  updateObjectRow('date_plans', plan.rowNumber, {
    title: title,
    scheduledAt: scheduledAt,
    locationName: locationName,
    status: status,
    notes: notes,
    updatedAt: timestamp,
  })

  plan.title = title
  plan.scheduledAt = scheduledAt
  plan.locationName = locationName
  plan.status = status
  plan.notes = notes
  plan.updatedAt = timestamp

  return {
    plan: formatDatePlan(plan, session.memberId, {
      id: session.memberId,
      nickname: session.nickname,
    }),
  }
}

function datePlansDelete(request) {
  var session = validateSession(request)
  var plan = getDatePlanForWrite(request.payload.id)
  var timestamp = nowIso()

  if (plan.createdBy !== session.memberId) {
    throw newAppError('FORBIDDEN', 'Rencana date ini cuma bisa dihapus pembuatnya')
  }

  updateObjectRow('date_plans', plan.rowNumber, {
    deletedAt: timestamp,
    updatedAt: timestamp,
  })

  return {
    id: plan.id,
    deletedAt: timestamp,
  }
}

function galleryList(request) {
  var session = validateSession(request)
  var limit = normalizeListLimit(request.payload.limit, 30)
  var items = listActiveGalleryItems(session.memberId).sort(function (a, b) {
    var takenDiff = new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()

    if (takenDiff !== 0) {
      return takenDiff
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  }).slice(0, limit)

  return {
    items: items,
  }
}

function galleryHealth(request) {
  validateSession(request)

  var galleryFolder = getGalleryFolder()

  return {
    service: 'ourspace-gallery',
    status: 'ok',
    driveRootFolderConfigured: true,
    galleryFolderName: galleryFolder.getName(),
  }
}

function galleryCreate(request) {
  var session = validateSession(request)
  var fileName = normalizeGalleryFileName(request.payload.fileName)
  var mimeType = normalizeGalleryMimeType(request.payload.mimeType)
  var fileSize = normalizeGalleryFileSize(request.payload.fileSize)
  var base64 = normalizeGalleryBase64(request.payload.base64)
  var caption = normalizeGalleryCaption(request.payload.caption)
  var takenAt = normalizeGalleryTakenAt(request.payload.takenAt)
  var bytes = Utilities.base64Decode(base64)

  if (bytes.length > fileSize + 16 || bytes.length > 3145728) {
    throw newAppError(
      'BAD_REQUEST',
      'Foto maksimal 3 MB dulu ya, biar upload-nya aman.',
    )
  }

  var timestamp = nowIso()
  var fileId = saveGalleryBlob(fileName, mimeType, bytes)
  var item

  try {
    item = appendObjectRow('gallery', {
      id: newId('photo'),
      fileId: fileId,
      fileName: fileName,
      mimeType: mimeType,
      fileSize: fileSize,
      thumbnailData: normalizeGalleryThumbnailData(request.payload.thumbnailData),
      caption: caption,
      takenAt: takenAt,
      createdBy: session.memberId,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: '',
    })
  } catch (error) {
    trashGalleryFile(fileId)
    throw error
  }

  return {
    item: formatGalleryItem(item, session.memberId, {
      id: session.memberId,
      nickname: session.nickname,
    }),
  }
}

function galleryUpdate(request) {
  var session = validateSession(request)
  var item = getGalleryItemForWrite(request.payload.id)
  var caption = normalizeGalleryCaption(request.payload.caption)
  var takenAt = normalizeGalleryTakenAt(request.payload.takenAt)
  var timestamp = nowIso()

  if (item.createdBy !== session.memberId) {
    throw newAppError('FORBIDDEN', 'Foto ini cuma bisa diedit pengunggahnya')
  }

  updateObjectRow('gallery', item.rowNumber, {
    caption: caption,
    takenAt: takenAt,
    updatedAt: timestamp,
  })

  item.caption = caption
  item.takenAt = takenAt
  item.updatedAt = timestamp

  return {
    item: formatGalleryItem(item, session.memberId, {
      id: session.memberId,
      nickname: session.nickname,
    }),
  }
}

function galleryDelete(request) {
  var session = validateSession(request)
  var item = getGalleryItemForWrite(request.payload.id)
  var timestamp = nowIso()

  if (item.createdBy !== session.memberId) {
    throw newAppError('FORBIDDEN', 'Foto ini cuma bisa dihapus pengunggahnya')
  }

  updateObjectRow('gallery', item.rowNumber, {
    deletedAt: timestamp,
    updatedAt: timestamp,
  })

  trashGalleryFile(item.fileId)

  return {
    id: item.id,
    deletedAt: timestamp,
  }
}

function sharedListsList(request) {
  var session = validateSession(request)
  var limit = normalizeListLimit(request.payload.limit, 50)
  var items = listActiveSharedItems(session.memberId).sort(function (a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  }).slice(0, limit)

  return {
    items: items,
  }
}

function sharedListsCreate(request) {
  var session = validateSession(request)
  var title = normalizeSharedListTitle(request.payload.title)
  var category = normalizeSharedListCategory(request.payload.category || 'activity')
  var status = normalizeSharedListStatus(request.payload.status || 'todo')
  var notes = normalizeOptionalSharedListText(request.payload.notes)
  var timestamp = nowIso()

  var item = appendObjectRow('shared_lists', {
    id: newId('list'),
    title: title,
    category: category,
    status: status,
    notes: notes,
    createdBy: session.memberId,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: '',
  })

  return {
    item: formatSharedItem(item, session.memberId, {
      id: session.memberId,
      nickname: session.nickname,
    }),
  }
}

function sharedListsUpdate(request) {
  var session = validateSession(request)
  var item = getSharedItemForWrite(request.payload.id)
  var title = normalizeSharedListTitle(request.payload.title)
  var category = normalizeSharedListCategory(request.payload.category || item.category || 'activity')
  var status = normalizeSharedListStatus(request.payload.status || item.status || 'todo')
  var notes = normalizeOptionalSharedListText(request.payload.notes)
  var timestamp = nowIso()

  if (item.createdBy !== session.memberId) {
    throw newAppError('FORBIDDEN', 'Item list ini cuma bisa diedit pembuatnya')
  }

  updateObjectRow('shared_lists', item.rowNumber, {
    title: title,
    category: category,
    status: status,
    notes: notes,
    updatedAt: timestamp,
  })

  item.title = title
  item.category = category
  item.status = status
  item.notes = notes
  item.updatedAt = timestamp

  return {
    item: formatSharedItem(item, session.memberId, {
      id: session.memberId,
      nickname: session.nickname,
    }),
  }
}

function sharedListsDelete(request) {
  var session = validateSession(request)
  var item = getSharedItemForWrite(request.payload.id)
  var timestamp = nowIso()

  if (item.createdBy !== session.memberId) {
    throw newAppError('FORBIDDEN', 'Item list ini cuma bisa dihapus pembuatnya')
  }

  updateObjectRow('shared_lists', item.rowNumber, {
    deletedAt: timestamp,
    updatedAt: timestamp,
  })

  return {
    id: item.id,
    deletedAt: timestamp,
  }
}

function listActiveStickyNotes(currentMemberId) {
  var members = listActiveMembers()

  return getSheetObjects('sticky_notes')
    .filter(function (row) {
      return !row.deletedAt
    })
    .map(function (row) {
      var author = members.find(function (member) {
        return member.id === row.createdBy
      })

      return formatStickyNote(row, currentMemberId, author)
    })
}

function formatStickyNote(row, currentMemberId, author) {
  return {
    id: row.id,
    body: row.body,
    color: row.color || 'yellow',
    createdBy: row.createdBy,
    createdByNickname: author ? author.nickname : '',
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    canEdit: row.createdBy === currentMemberId,
  }
}

function listActiveDatePlans(currentMemberId) {
  var members = listActiveMembers()

  return getSheetObjects('date_plans')
    .filter(function (row) {
      return !row.deletedAt
    })
    .map(function (row) {
      var author = members.find(function (member) {
        return member.id === row.createdBy
      })

      return formatDatePlan(row, currentMemberId, author)
    })
}

function formatDatePlan(row, currentMemberId, author) {
  return {
    id: row.id,
    title: row.title,
    scheduledAt: toIsoString(row.scheduledAt),
    locationName: row.locationName || '',
    status: row.status || 'idea',
    notes: row.notes || '',
    createdBy: row.createdBy,
    createdByNickname: author ? author.nickname : '',
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    canEdit: row.createdBy === currentMemberId,
    isPast: new Date(toIsoString(row.scheduledAt)).getTime() < Date.now(),
  }
}

function listActiveGalleryItems(currentMemberId) {
  var members = listActiveMembers()

  return getSheetObjects('gallery')
    .filter(function (row) {
      return !row.deletedAt
    })
    .map(function (row) {
      var author = members.find(function (member) {
        return member.id === row.createdBy
      })

      return formatGalleryItem(row, currentMemberId, author)
    })
}

function formatGalleryItem(row, currentMemberId, author) {
  return {
    id: row.id,
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileSize: Number(row.fileSize || 0),
    thumbnailData: row.thumbnailData || '',
    caption: row.caption,
    takenAt: toIsoString(row.takenAt).slice(0, 10),
    createdBy: row.createdBy,
    createdByNickname: author ? author.nickname : '',
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    canEdit: row.createdBy === currentMemberId,
  }
}

function listActiveSharedItems(currentMemberId) {
  var members = listActiveMembers()

  return getSheetObjects('shared_lists')
    .filter(function (row) {
      return !row.deletedAt
    })
    .map(function (row) {
      var author = members.find(function (member) {
        return member.id === row.createdBy
      })

      return formatSharedItem(row, currentMemberId, author)
    })
}

function formatSharedItem(row, currentMemberId, author) {
  return {
    id: row.id,
    title: row.title,
    category: row.category || 'activity',
    status: row.status || 'todo',
    notes: row.notes || '',
    createdBy: row.createdBy,
    createdByNickname: author ? author.nickname : '',
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    canEdit: row.createdBy === currentMemberId,
  }
}

function calculateDaysTogether(anniversaryDate) {
  if (!anniversaryDate) {
    return 0
  }

  var start = new Date(anniversaryDate).getTime()

  if (!Number.isFinite(start)) {
    return 0
  }

  return Math.max(1, Math.floor((Date.now() - start) / 86400000) + 1)
}

function isTodayIso(value) {
  if (!value) {
    return false
  }

  return toIsoString(value).slice(0, 10) === nowIso().slice(0, 10)
}

function toIsoString(value) {
  return value instanceof Date ? value.toISOString() : String(value || '')
}

function getStickyNoteForWrite(id) {
  var noteId = String(id || '').trim()

  if (!noteId) {
    throw newAppError('BAD_REQUEST', 'ID note wajib diisi')
  }

  var note = getSheetObjects('sticky_notes').find(function (row) {
    return row.id === noteId && !row.deletedAt
  })

  if (!note) {
    throw newAppError('NOT_FOUND', 'Note tidak ditemukan')
  }

  return note
}

function getDatePlanForWrite(id) {
  var planId = String(id || '').trim()

  if (!planId) {
    throw newAppError('BAD_REQUEST', 'ID rencana date wajib diisi')
  }

  var plan = getSheetObjects('date_plans').find(function (row) {
    return row.id === planId && !row.deletedAt
  })

  if (!plan) {
    throw newAppError('NOT_FOUND', 'Rencana date tidak ditemukan')
  }

  return plan
}

function getGalleryItemForWrite(id) {
  var itemId = String(id || '').trim()

  if (!itemId) {
    throw newAppError('BAD_REQUEST', 'ID foto wajib diisi')
  }

  var item = getSheetObjects('gallery').find(function (row) {
    return row.id === itemId && !row.deletedAt
  })

  if (!item) {
    throw newAppError('NOT_FOUND', 'Foto tidak ditemukan')
  }

  return item
}

function getSharedItemForWrite(id) {
  var itemId = String(id || '').trim()

  if (!itemId) {
    throw newAppError('BAD_REQUEST', 'ID item list wajib diisi')
  }

  var item = getSheetObjects('shared_lists').find(function (row) {
    return row.id === itemId && !row.deletedAt
  })

  if (!item) {
    throw newAppError('NOT_FOUND', 'Item list tidak ditemukan')
  }

  return item
}

function normalizeNoteBody(value) {
  var body = String(value || '').trim()

  if (!body || body.length > 280) {
    throw newAppError('BAD_REQUEST', 'Body note wajib 1-280 karakter')
  }

  return body
}

function normalizeNoteColor(value) {
  var color = String(value || 'yellow').trim() || 'yellow'
  var allowed = ['pink', 'mint', 'yellow', 'blue', 'lavender']

  if (allowed.indexOf(color) === -1) {
    throw newAppError('BAD_REQUEST', 'Warna note tidak valid')
  }

  return color
}

function normalizeNotesLimit(value) {
  return normalizeListLimit(value, 50)
}

function normalizeListLimit(value, fallback) {
  var limit = Number(value || fallback)

  if (!Number.isFinite(limit) || limit <= 0) {
    return fallback
  }

  return Math.min(Math.floor(limit), 100)
}

function normalizeNotesCursor(value) {
  var cursor = Number(value || 0)

  if (!Number.isFinite(cursor) || cursor < 0) {
    return 0
  }

  return Math.floor(cursor)
}

function normalizeDatePlanTitle(value) {
  var title = String(value || '').trim()

  if (!title) {
    throw newAppError('BAD_REQUEST', 'Judul rencana date wajib diisi')
  }

  return title
}

function normalizeDatePlanScheduledAt(value) {
  var scheduledAt = String(value || '').trim()
  var timestamp = new Date(scheduledAt).getTime()

  if (!scheduledAt || !Number.isFinite(timestamp)) {
    throw newAppError('BAD_REQUEST', 'Tanggal rencana date wajib valid')
  }

  return new Date(timestamp).toISOString()
}

function normalizeDatePlanStatus(value) {
  var status = String(value || 'idea').trim() || 'idea'
  var allowed = ['idea', 'planned', 'done', 'cancelled']

  if (allowed.indexOf(status) === -1) {
    throw newAppError('BAD_REQUEST', 'Status rencana date tidak valid')
  }

  return status
}

function normalizeOptionalDatePlanText(value) {
  return String(value || '').trim()
}

function normalizeGalleryFileName(value) {
  var fileName = String(value || '').trim()

  if (!fileName) {
    throw newAppError('BAD_REQUEST', 'Nama file foto wajib diisi')
  }

  return fileName
}

function normalizeGalleryMimeType(value) {
  var mimeType = String(value || '').trim()
  var allowed = ['image/jpeg', 'image/png', 'image/webp']

  if (allowed.indexOf(mimeType) === -1) {
    throw newAppError('BAD_REQUEST', 'Format foto harus JPG, PNG, atau WebP')
  }

  return mimeType
}

function normalizeGalleryFileSize(value) {
  var fileSize = Number(value || 0)

  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > 3145728) {
    throw newAppError(
      'BAD_REQUEST',
      'Foto maksimal 3 MB dulu ya, biar upload-nya aman.',
    )
  }

  return Math.floor(fileSize)
}

function normalizeGalleryBase64(value) {
  var base64 = String(value || '').trim()

  if (!base64) {
    throw newAppError('BAD_REQUEST', 'Data foto wajib diisi')
  }

  return base64
}

function normalizeGalleryCaption(value) {
  var caption = String(value || '').trim()

  if (!caption) {
    throw newAppError('BAD_REQUEST', 'Caption foto wajib diisi')
  }

  return caption
}

function normalizeGalleryTakenAt(value) {
  var takenAt = String(value || '').trim()
  var timestamp = new Date(takenAt).getTime()

  if (!takenAt || !Number.isFinite(timestamp)) {
    throw newAppError('BAD_REQUEST', 'Tanggal foto wajib valid')
  }

  return new Date(timestamp).toISOString().slice(0, 10)
}

function normalizeGalleryThumbnailData(value) {
  var thumbnailData = String(value || '').trim()

  if (!thumbnailData) {
    return ''
  }

  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(thumbnailData)) {
    throw newAppError('BAD_REQUEST', 'Preview foto tidak valid')
  }

  if (thumbnailData.length > 40000) {
    throw newAppError('BAD_REQUEST', 'Preview foto terlalu besar')
  }

  return thumbnailData
}

function normalizeSharedListTitle(value) {
  var title = String(value || '').trim()

  if (!title) {
    throw newAppError('BAD_REQUEST', 'Judul item list wajib diisi')
  }

  return title
}

function normalizeSharedListCategory(value) {
  var category = String(value || 'activity').trim() || 'activity'
  var allowed = ['place', 'food', 'movie', 'gift', 'activity', 'other']

  if (allowed.indexOf(category) === -1) {
    throw newAppError('BAD_REQUEST', 'Kategori list tidak valid')
  }

  return category
}

function normalizeSharedListStatus(value) {
  var status = String(value || 'todo').trim() || 'todo'
  var allowed = ['todo', 'doing', 'done']

  if (allowed.indexOf(status) === -1) {
    throw newAppError('BAD_REQUEST', 'Status list tidak valid')
  }

  return status
}

function normalizeOptionalSharedListText(value) {
  return String(value || '').trim()
}

function maintenanceRunNow(request) {
  validateSession(request)

  return runMaintenance()
}

function maintenanceInstallTrigger() {
  return installMaintenanceTrigger()
}

function maintenanceRemoveTrigger() {
  return removeMaintenanceTriggers()
}

function maintenanceStatus() {
  var triggers = ScriptApp.getProjectTriggers().filter(function (trigger) {
    return trigger.getHandlerFunction() === 'runMaintenance'
  })

  return {
    installed: triggers.length > 0,
    triggerCount: triggers.length,
    retentionDays: getMaintenanceRetentionDays(),
  }
}
