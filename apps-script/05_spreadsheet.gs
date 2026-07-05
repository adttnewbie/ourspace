var ourspaceSpreadsheetCache = null

function getSpreadsheet() {
  if (ourspaceSpreadsheetCache) {
    return ourspaceSpreadsheetCache
  }

  var startedAt = Date.now()
  console.log('spreadsheet:openById:start')
  ourspaceSpreadsheetCache = SpreadsheetApp.openById(
    getScriptProperty(REQUIRED_SCRIPT_PROPERTIES.SHEET_ID),
  )
  console.log('spreadsheet:openById:done ' + String(Date.now() - startedAt) + 'ms')

  return ourspaceSpreadsheetCache
}

function getSheetOrThrow(name) {
  var sheet = getSpreadsheet().getSheetByName(name)

  if (!sheet) {
    throw newAppError('CONFIG_MISSING', 'Missing sheet: ' + name)
  }

  return sheet
}

function getHeaderRow(sheet) {
  var startedAt = Date.now()
  console.log('spreadsheet:getHeaderRow:start ' + sheet.getName())
  var lastColumn = Math.max(sheet.getLastColumn(), 1)
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].filter(String)
  console.log(
    'spreadsheet:getHeaderRow:done ' +
      sheet.getName() +
      ' ' +
      String(Date.now() - startedAt) +
      'ms',
  )

  return headers
}

function setHeaderRow(sheet, headers) {
  var startedAt = Date.now()
  console.log('spreadsheet:setHeaderRow:start ' + sheet.getName())
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
  sheet.setFrozenRows(1)
  console.log(
    'spreadsheet:setHeaderRow:done ' +
      sheet.getName() +
      ' ' +
      String(Date.now() - startedAt) +
      'ms',
  )
}

function ensureSheet(name, headers) {
  var spreadsheet = getSpreadsheet()
  var sheet = spreadsheet.getSheetByName(name)

  if (!sheet) {
    sheet = spreadsheet.insertSheet(name)
    setHeaderRow(sheet, headers)

    return {
      name: name,
      status: 'created',
    }
  }

  var existingHeaders = getHeaderRow(sheet)
  var missingHeaders = headers.filter(function (header) {
    return existingHeaders.indexOf(header) === -1
  })

  if (existingHeaders.length === 0) {
    setHeaderRow(sheet, headers)

    return {
      name: name,
      status: 'initialized',
    }
  }

  if (missingHeaders.length > 0) {
    throw newAppError(
      'CONFIG_INVALID',
      'Sheet ' + name + ' is missing columns: ' + missingHeaders.join(', '),
    )
  }

  return {
    name: name,
    status: 'ok',
  }
}

function setupSchema() {
  return Object.keys(SHEET_SCHEMAS).map(function (name) {
    return ensureSheet(name, SHEET_SCHEMAS[name])
  })
}

function appendObjectRow(sheetName, row) {
  var startedAt = Date.now()
  console.log('spreadsheet:appendObjectRow:start ' + sheetName)
  var sheet = getSheetOrThrow(sheetName)
  var headers = getHeaderRow(sheet)
  var values = headers.map(function (header) {
    return row[header] === undefined ? '' : row[header]
  })

  sheet.appendRow(values)
  console.log(
    'spreadsheet:appendObjectRow:done ' +
      sheetName +
      ' ' +
      String(Date.now() - startedAt) +
      'ms',
  )

  return row
}

function getSheetObjects(sheetName) {
  var startedAt = Date.now()
  console.log('spreadsheet:getSheetObjects:start ' + sheetName)
  var sheet = getSheetOrThrow(sheetName)
  var headers = getHeaderRow(sheet)
  var lastRow = sheet.getLastRow()

  if (lastRow < 2) {
    console.log(
      'spreadsheet:getSheetObjects:done ' +
        sheetName +
        ' 0 rows ' +
        String(Date.now() - startedAt) +
        'ms',
    )
    return []
  }

  var rows = sheet
    .getRange(2, 1, lastRow - 1, headers.length)
    .getValues()
    .map(function (values, index) {
      var row = {
        rowNumber: index + 2,
      }

      headers.forEach(function (header, columnIndex) {
        row[header] = values[columnIndex]
      })

      return row
    })
  console.log(
    'spreadsheet:getSheetObjects:done ' +
      sheetName +
      ' ' +
      String(rows.length) +
      ' rows ' +
      String(Date.now() - startedAt) +
      'ms',
  )

  return rows
}

function updateObjectRow(sheetName, rowNumber, updates) {
  var startedAt = Date.now()
  console.log('spreadsheet:updateObjectRow:start ' + sheetName)
  var sheet = getSheetOrThrow(sheetName)
  var headers = getHeaderRow(sheet)
  var range = sheet.getRange(rowNumber, 1, 1, headers.length)
  var currentValues = range.getValues()[0]
  var nextValues = headers.map(function (header, index) {
    return updates[header] === undefined ? currentValues[index] : updates[header]
  })

  range.setValues([nextValues])
  console.log(
    'spreadsheet:updateObjectRow:done ' +
      sheetName +
      ' ' +
      String(Date.now() - startedAt) +
      'ms',
  )
}

function upsertSetting(key, value) {
  var timestamp = nowIso()
  var rows = getSheetObjects('couple_settings')
  var existing = rows.find(function (row) {
    return row.key === key
  })

  if (existing) {
    updateObjectRow('couple_settings', existing.rowNumber, {
      value: value,
      updatedAt: timestamp,
    })
    return
  }

  appendObjectRow('couple_settings', {
    key: key,
    value: value,
    updatedAt: timestamp,
  })
}

function insertSettingIfMissing(key, value) {
  var existing = getSheetObjects('couple_settings').find(function (setting) {
    return setting.key === key
  })

  if (existing) {
    return existing.value
  }

  upsertSetting(key, value)
  return value
}

function getSetting(key) {
  var row = getSheetObjects('couple_settings').find(function (setting) {
    return setting.key === key
  })

  return row ? row.value : null
}
