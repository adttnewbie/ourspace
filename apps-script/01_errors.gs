function newAppError(code, message) {
  var error = new Error(message)
  error.code = code
  error.publicMessage = message
  return error
}

function normalizeError(error) {
  if (error && error.code && error.publicMessage) {
    return {
      code: String(error.code),
      message: String(error.publicMessage),
    }
  }

  console.error(error)

  return {
    code: 'INTERNAL_ERROR',
    message: 'Unexpected server error',
  }
}
