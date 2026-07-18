var SOFT_DELETE_SHEETS = ['members', 'sticky_notes', 'date_plans', 'gallery', 'shared_lists']
var PAIRING_SESSION_SHEET = 'pairing_sessions'
var DEFAULT_RETENTION_DAYS = 30

function runMaintenance() {
  beginRequestContext()

  var retentionDays = getMaintenanceRetentionDays()
  var cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
  var cutoffIso = cutoffDate.toISOString()

  var now = nowIso()
  var report = {
    timestamp: now,
    retentionDays: retentionDays,
    deletedRows: {},
    expiredPairingSessions: 0,
    cacheKeysCleared: 0,
    errors: [],
  }

  SOFT_DELETE_SHEETS.forEach(function (sheetName) {
    var sheet = getSheetOrThrow(sheetName)
    var rows = getSheetObjects(sheetName)
    var toDelete = rows.filter(function (row) {
      return row.deletedAt && row.deletedAt < cutoffIso
    })

    if (toDelete.length === 0) {
      report.deletedRows[sheetName] = 0
      return
    }

    toDelete.forEach(function (row) {
      try {
        sheet.deleteRow(row.rowNumber)
      } catch (error) {
        report.errors.push(sheetName + ' row ' + row.rowNumber + ': ' + String(error))
      }
    })

    report.deletedRows[sheetName] = toDelete.length

    if (toDelete.length > 0) {
      invalidateSheetCaches(sheetName)
      invalidateRequestSheetCache(sheetName)
    }
  })

  report.expiredPairingSessions = cleanupExpiredPairingSessions()

  report.cacheKeysCleared = clearMaintenanceCaches()

  console.log('maintenance:done ' + JSON.stringify(report))

  return {
    status: 'completed',
    report: report,
  }
}

function cleanupExpiredPairingSessions() {
  var rows = getSheetObjects(PAIRING_SESSION_SHEET)
  var sheet = getSheetOrThrow(PAIRING_SESSION_SHEET)
  var now = nowIso()
  var deleted = 0

  rows.forEach(function (row) {
    if (row.expiresAt && row.expiresAt < now) {
      try {
        sheet.deleteRow(row.rowNumber)
        deleted++
      } catch (error) {
        console.error('maintenance:pairing-session-delete-error row ' + row.rowNumber + ': ' + String(error))
      }
    }
  })

  if (deleted > 0) {
    invalidateSheetCaches(PAIRING_SESSION_SHEET)
  }

  return deleted
}

function clearMaintenanceCaches() {
  var cleared = 0

  try {
    var cache = CacheService.getScriptCache()

    SOFT_DELETE_SHEETS.forEach(function (sheetName) {
      cache.remove(getSheetRowsCacheKey(sheetName))
      cache.remove(getSheetHeadersCacheKey(sheetName))
      cleared += 2
    })

    cache.remove(getSheetRowsCacheKey(PAIRING_SESSION_SHEET))
    cache.remove(getSheetHeadersCacheKey(PAIRING_SESSION_SHEET))
    cleared += 2

    cache.remove('ourspace:v1:rows:backups')
    cache.remove('ourspace:v1:headers:backups')
    cleared += 2
  } catch (error) {
    console.error('maintenance:cache-clear-error ' + String(error))
  }

  return cleared
}

function installMaintenanceTrigger() {
  removeMaintenanceTriggers()
  ScriptApp.newTrigger('runMaintenance').timeBased().everyDays(1).create()

  return {
    status: 'installed',
    functionName: 'runMaintenance',
    frequency: 'daily',
  }
}

function removeMaintenanceTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'runMaintenance') {
      ScriptApp.deleteTrigger(trigger)
    }
  })

  return {
    status: 'removed',
  }
}

function getMaintenanceRetentionDays() {
  var raw = getSetting('maintenance_retention_days')
  var parsed = raw ? parseInt(raw, 10) : NaN

  if (!isNaN(parsed) && parsed > 0) {
    return parsed
  }

  return DEFAULT_RETENTION_DAYS
}
