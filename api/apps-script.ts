import type { IncomingMessage, ServerResponse } from 'node:http'

type OurSpaceErrorCode = 'BAD_REQUEST' | 'CONFIG_MISSING' | 'INTERNAL_ERROR'
const maxRequestBodyBytes = 7 * 1024 * 1024

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
  const contentLength = Number(request.headers['content-length'] ?? 0)

  if (Number.isFinite(contentLength) && contentLength > maxRequestBodyBytes) {
    return Promise.reject(new Error('Request body terlalu besar'))
  }

  if (typeof request.body === 'string') {
    if (Buffer.byteLength(request.body, 'utf8') > maxRequestBodyBytes) {
      return Promise.reject(new Error('Request body terlalu besar'))
    }
    return Promise.resolve(request.body)
  }

  if (Buffer.isBuffer(request.body)) {
    if (request.body.byteLength > maxRequestBodyBytes) {
      return Promise.reject(new Error('Request body terlalu besar'))
    }
    return Promise.resolve(request.body.toString('utf8'))
  }

  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []

    let totalBytes = 0
    request.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length
      if (totalBytes > maxRequestBodyBytes) {
        reject(new Error('Request body terlalu besar'))
        request.resume()
        return
      }
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
    if (message === 'Request body terlalu besar') {
      sendJson(response, 413, jsonError('BAD_REQUEST', message))
      return
    }

    sendJson(response, 502, jsonError('INTERNAL_ERROR', message))
  }
}
