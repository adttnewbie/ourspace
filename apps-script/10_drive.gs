function getDriveRootFolder() {
  try {
    return DriveApp.getFolderById(
      getScriptProperty(REQUIRED_SCRIPT_PROPERTIES.DRIVE_ROOT_FOLDER_ID),
    )
  } catch (error) {
    console.error(error)
    throw newAppError(
      'DRIVE_ERROR',
      'Folder Drive OurSpace belum bisa diakses. Cek DRIVE_ROOT_FOLDER_ID dan authorization Apps Script.',
    )
  }
}

function getOrCreateChildFolder(parent, name) {
  try {
    var existing = parent.getFoldersByName(name)

    if (existing.hasNext()) {
      return existing.next()
    }

    return parent.createFolder(name)
  } catch (error) {
    console.error(error)
    throw newAppError(
      'DRIVE_ERROR',
      'Folder Drive OurSpace belum bisa dibuat. Cek izin Drive Apps Script.',
    )
  }
}

function getGalleryFolder() {
  var root = getDriveRootFolder()

  getOrCreateChildFolder(root, 'backups')

  return getOrCreateChildFolder(root, 'gallery')
}

function getBackupFolder() {
  return getOrCreateChildFolder(getDriveRootFolder(), 'backups')
}

function saveGalleryBlob(fileName, mimeType, bytes) {
  try {
    var blob = Utilities.newBlob(bytes, mimeType, fileName)
    var file = getGalleryFolder().createFile(blob)

    return file.getId()
  } catch (error) {
    if (error && error.code && error.publicMessage) {
      throw error
    }

    console.error(error)
    throw newAppError(
      'DRIVE_ERROR',
      'Foto belum bisa disimpan ke Drive. Cek izin Drive dan folder OurSpace.',
    )
  }
}

function trashGalleryFile(fileId) {
  if (!fileId) {
    return
  }

  try {
    DriveApp.getFileById(fileId).setTrashed(true)
  } catch (error) {
    console.error(error)
  }
}
