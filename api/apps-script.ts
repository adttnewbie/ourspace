import type { IncomingMessage, ServerResponse } from 'node:http'

type OurSpaceErrorCode = 'BAD_REQUEST' | 'CONFIG_MISSING' | 'INTERNAL_ERROR'

type ApiRequest = IncomingMessage & {
  readonly body?: unknown
  readonly method?: string
}

function jsonError(code: OurSpaceErrorCode, message: string) {
  return JSON.stringify({
    ok: false,
    error: {
      code,
      message,
    },
  })
}

function sendJson(response: ServerResponse, statusCode: number, body: string) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json;charset=utf-8')
  response.end(body)
}

function isOurSpaceJson(body: string) {
  try {
    const parsed: unknown = JSON.parse(body)

    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      'ok' in parsed &&
      typeof parsed.ok === 'boolean'
    )
  } catch (error) {
    if (error instanceof SyntaxError) {
      return false
    }

    throw error
  }
}

function bodyFromRequest(request: ApiRequest) {
  if (typeof request.body === 'string') {
    return Promise.resolve(request.body)
  }

  if (Buffer.isBuffer(request.body)) {
    return Promise.resolve(request.body.toString('utf8'))
  }

  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []

    request.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })
    request.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'))
    })
    request.on('error', (error: Error) => {
      reject(error)
    })
  })
}

export default async function handler(
  request: ApiRequest,
  response: ServerResponse,
) {
  if (request.method !== 'POST') {
    sendJson(response, 405, jsonError('BAD_REQUEST', 'Only POST is allowed'))
    return
  }

  const appsScriptUrl = process.env.APPS_SCRIPT_URL

  if (!appsScriptUrl) {
    sendJson(
      response,
      500,
      jsonError('CONFIG_MISSING', 'APPS_SCRIPT_URL belum di-set'),
    )
    return
  }

  try {
    const upstreamResponse = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: await bodyFromRequest(request),
      redirect: 'follow',
      signal: AbortSignal.timeout(55_000),
    })
    const upstreamBody = await upstreamResponse.text()

    if (!upstreamResponse.ok) {
      sendJson(
        response,
        upstreamResponse.status,
        jsonError(
          'INTERNAL_ERROR',
          'Apps Script upstream returned HTTP ' + String(upstreamResponse.status),
        ),
      )
      return
    }

    if (!isOurSpaceJson(upstreamBody)) {
      sendJson(
        response,
        502,
        jsonError('INTERNAL_ERROR', 'Apps Script upstream did not return JSON'),
      )
      return
    }

    sendJson(response, upstreamResponse.status, upstreamBody)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Proxy request failed'
    sendJson(response, 502, jsonError('INTERNAL_ERROR', message))
  }
}
