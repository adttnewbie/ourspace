function newId(prefix) {
  return prefix + '_' + Utilities.getUuid().replace(/-/g, '')
}

function newSessionToken() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '')
}

function hashSessionToken(token) {
  var secret = getScriptProperty(REQUIRED_SCRIPT_PROPERTIES.SESSION_SECRET)
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    secret + ':' + token,
  )

  return bytes
    .map(function (byte) {
      var value = byte < 0 ? byte + 256 : byte
      return ('0' + value.toString(16)).slice(-2)
    })
    .join('')
}

function nowIso() {
  return new Date().toISOString()
}

function addSecondsIso(startIso, seconds) {
  var start = new Date(startIso)
  return new Date(start.getTime() + seconds * 1000).toISOString()
}

function isAfterNow(isoValue) {
  return new Date(isoValue).getTime() > Date.now()
}
