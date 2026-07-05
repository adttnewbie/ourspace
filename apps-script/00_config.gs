var REQUIRED_SCRIPT_PROPERTIES = Object.freeze({
  SHEET_ID: 'SHEET_ID',
  SESSION_SECRET: 'SESSION_SECRET',
  PAIRING_WINDOW_SECONDS: 'PAIRING_WINDOW_SECONDS',
  DRIVE_ROOT_FOLDER_ID: 'DRIVE_ROOT_FOLDER_ID',
})

var SHEET_SCHEMAS = Object.freeze({
  members: [
    'id',
    'nickname',
    'deviceLabel',
    'sessionTokenHash',
    'pairedAt',
    'lastSeenAt',
    'createdAt',
    'updatedAt',
    'deletedAt',
  ],
  pairing_sessions: [
    'id',
    'status',
    'firstNickname',
    'firstSignalAt',
    'secondNickname',
    'secondSignalAt',
    'pairedAt',
    'expiresAt',
    'memberAId',
    'memberBId',
    'createdAt',
    'updatedAt',
  ],
  couple_settings: ['key', 'value', 'updatedAt'],
  sticky_notes: [
    'id',
    'body',
    'color',
    'createdBy',
    'createdAt',
    'updatedAt',
    'deletedAt',
  ],
  date_plans: [
    'id',
    'title',
    'scheduledAt',
    'locationName',
    'status',
    'notes',
    'createdBy',
    'createdAt',
    'updatedAt',
    'deletedAt',
  ],
  gallery: [
    'id',
    'fileId',
    'fileName',
    'mimeType',
    'fileSize',
    'thumbnailData',
    'caption',
    'takenAt',
    'createdBy',
    'createdAt',
    'updatedAt',
    'deletedAt',
  ],
  shared_lists: [
    'id',
    'title',
    'category',
    'status',
    'notes',
    'createdBy',
    'createdAt',
    'updatedAt',
    'deletedAt',
  ],
  backups: [
    'id',
    'fileId',
    'status',
    'message',
    'createdAt',
    'updatedAt',
  ],
})

function getScriptProperty(name) {
  var value = PropertiesService.getScriptProperties().getProperty(name)

  if (!value) {
    throw newAppError('CONFIG_MISSING', 'Missing Script Property: ' + name)
  }

  return value
}

function getRequiredPropertyReport() {
  var properties = PropertiesService.getScriptProperties()

  return Object.keys(REQUIRED_SCRIPT_PROPERTIES).map(function (key) {
    var name = REQUIRED_SCRIPT_PROPERTIES[key]

    return {
      name: name,
      configured: Boolean(properties.getProperty(name)),
    }
  })
}

function getPairingWindowSeconds() {
  var rawValue = getScriptProperty(REQUIRED_SCRIPT_PROPERTIES.PAIRING_WINDOW_SECONDS)
  var value = Number(rawValue)

  if (!Number.isFinite(value) || value <= 0) {
    throw newAppError(
      'CONFIG_INVALID',
      'PAIRING_WINDOW_SECONDS must be a positive number',
    )
  }

  return value
}
