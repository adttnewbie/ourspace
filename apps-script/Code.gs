function doPost(event) {
  console.log('doPost:start')

  try {
    var body = event && event.postData ? event.postData.contents : ''
    console.log('doPost:body-received ' + body.length)

    var request = parseJsonRequest(event)
    console.log('doPost:json-parsed')
    console.log('doPost:action ' + request.action)

    if (request.action === 'health.check') {
      console.log('doPost:before-handler')
      console.log('doPost:after-handler')

      return jsonSuccess({
        service: 'OurSpace API',
        method: 'POST',
        status: 'active',
      })
    }

    console.log('doPost:before-handler')
    var data = routeAction(request)
    console.log('doPost:after-handler')

    return jsonSuccess(data)
  } catch (error) {
    console.log('doPost:error ' + (error && error.message ? error.message : error))
    return jsonPostFailure(error)
  }
}

function jsonPostFailure(error) {
  var normalized = normalizeError(error)

  return ContentService.createTextOutput(
    JSON.stringify({
      ok: false,
      error: {
        code: normalized.code || 'INTERNAL_ERROR',
        message: normalized.message || 'Unexpected server error',
      },
    }),
  ).setMimeType(ContentService.MimeType.JSON)
}

function doGet(event) {
  return jsonSuccess({
    service: 'ourspace-apps-script',
    status: 'ok',
    entrypoint: 'doGet',
    hasDoPost: typeof doPost === 'function',
    timestamp: nowIso(),
  })
}
