function parseJsonRequest(event) {
  if (!event || !event.postData || !event.postData.contents) {
    throw newAppError('BAD_REQUEST', 'Missing JSON request body')
  }

  var parsed

  try {
    parsed = JSON.parse(event.postData.contents)
  } catch (error) {
    throw newAppError('BAD_REQUEST', 'Request body must be valid JSON')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw newAppError('BAD_REQUEST', 'Request body must be a JSON object')
  }

  if (typeof parsed.action !== 'string' || parsed.action.length === 0) {
    throw newAppError('BAD_REQUEST', 'Request action is required')
  }

  return {
    action: parsed.action,
    memberId: typeof parsed.memberId === 'string' ? parsed.memberId : '',
    sessionToken:
      typeof parsed.sessionToken === 'string' ? parsed.sessionToken : '',
    payload:
      parsed.payload && typeof parsed.payload === 'object' && !Array.isArray(parsed.payload)
        ? parsed.payload
        : {},
  }
}
