var BACKUP_SHEETS = [
  'members',
  'pairing_sessions',
  'couple_settings',
  'sticky_notes',
  'date_plans',
  'gallery',
  'shared_lists',
]

function runBackup() {
  var timestamp = nowIso()

  try {
    var data = exportBackupData(timestamp)
    var fileName = 'ourspace-backup-' + formatBackupFileDate(timestamp) + '.json'
    var blob = Utilities.newBlob(
      JSON.stringify(data, null, 2),
      'application/json',
      fileName,
    )
    var file = getBackupFolder().createFile(blob)
    var message =
      'Backed up ' +
      BACKUP_SHEETS.length +
      ' sheets, ' +
      countBackupItems(data.itemCounts) +
      ' rows'

    recordBackup('success', file.getId(), message, timestamp)

    return {
      status: 'success',
      fileId: file.getId(),
      message: message,
      createdAt: timestamp,
    }
  } catch (error) {
    var message =
      error && error.publicMessage
        ? String(error.publicMessage)
        : error && error.message
          ? String(error.message)
          : 'Backup failed'

    recordBackup('failed', '', message, timestamp)
    throw error
  }
}

function backupHealth(request) {
  validateSession(request)

  var folder = getBackupFolder()

  return {
    service: 'ourspace-backup',
    status: 'ok',
    driveRootFolderConfigured: true,
    backupsFolderAccessible: true,
    backupFolderName: folder.getName(),
    latestBackup: getLatestBackupRecord(),
  }
}

function backupsList(request) {
  validateSession(request)

  var limit = normalizeBackupLimit(request.payload.limit)
  var items = listBackupRecords().slice(0, limit)

  return {
    items: items,
  }
}

function backupRunNow(request) {
  validateSession(request)

  return {
    backup: runBackup(),
  }
}

function installBackupTrigger() {
  removeBackupTriggers()
  ScriptApp.newTrigger('runBackup').timeBased().everyDays(1).create()

  return {
    status: 'installed',
    functionName: 'runBackup',
    frequency: 'daily',
  }
}

function removeBackupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'runBackup') {
      ScriptApp.deleteTrigger(trigger)
    }
  })

  return {
    status: 'removed',
    functionName: 'runBackup',
  }
}

function exportBackupData(timestamp) {
  var sheets = {}
  var itemCounts = {}

  BACKUP_SHEETS.forEach(function (sheetName) {
    var rows = getSheetObjects(sheetName).map(stripBackupRow)

    sheets[sheetName] = rows
    itemCounts[sheetName] = rows.length
  })

  return {
    appName: 'OurSpace',
    version: 1,
    generatedAt: timestamp,
    includedSheets: BACKUP_SHEETS.slice(),
    itemCounts: itemCounts,
    sheets: sheets,
  }
}

function stripBackupRow(row) {
  var output = {}
  var skippedKeys = ['rowNumber', 'sessionToken', 'rawSessionToken', 'base64']

  Object.keys(row).forEach(function (key) {
    if (skippedKeys.indexOf(key) === -1) {
      output[key] = row[key]
    }
  })

  return output
}

function countBackupItems(itemCounts) {
  return Object.keys(itemCounts).reduce(function (total, sheetName) {
    return total + Number(itemCounts[sheetName] || 0)
  }, 0)
}

function recordBackup(status, fileId, message, timestamp) {
  try {
    appendObjectRow('backups', {
      id: newId('backup'),
      fileId: fileId,
      status: status,
      message: message,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  } catch (error) {
    console.error(error)
  }
}

function listBackupRecords() {
  return getSheetObjects('backups')
    .map(function (row) {
      return {
        id: row.id,
        fileId: row.fileId || '',
        status: row.status || '',
        message: row.message || '',
        createdAt: toIsoString(row.createdAt),
        updatedAt: toIsoString(row.updatedAt),
      }
    })
    .sort(function (a, b) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
}

function getLatestBackupRecord() {
  var records = listBackupRecords()

  return records.length > 0 ? records[0] : null
}

function normalizeBackupLimit(value) {
  var limit = Number(value || 20)

  if (!Number.isFinite(limit) || limit <= 0) {
    return 20
  }

  return Math.min(Math.floor(limit), 50)
}

function formatBackupFileDate(value) {
  return value.slice(0, 19).replace('T', '-').replace(/:/g, '-')
}
