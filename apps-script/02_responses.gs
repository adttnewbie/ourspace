function jsonSuccess(data) {
  return ContentService.createTextOutput(
    JSON.stringify({
      ok: true,
      data: data || {},
    }),
  ).setMimeType(ContentService.MimeType.JSON)
}

function jsonFailure(error) {
  return ContentService.createTextOutput(
    JSON.stringify({
      ok: false,
      error: normalizeError(error),
    }),
  ).setMimeType(ContentService.MimeType.JSON)
}
