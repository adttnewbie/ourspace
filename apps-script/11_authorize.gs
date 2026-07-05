function authorizeOurSpace() {
  var root = getDriveRootFolder()

  return {
    service: 'ourspace-apps-script',
    status: 'authorized',
    driveRootFolderName: root.getName(),
    requiredProperties: getRequiredPropertyReport(),
  }
}
