import { defineConfig, loadEnv, type Plugin } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

function proxyError(code: string, message: string) {
  return JSON.stringify({
    ok: false,
    error: {
      code,
      message,
    },
  })
}

function sendProxyJson(response: ServerResponse, statusCode: number, body: string) {
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

function readBody(request: IncomingMessage) {
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

function appsScriptDevProxy(appsScriptUrl: string): Plugin {
  return {
    name: 'ourspace-apps-script-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/apps-script', async (request, response) => {
        if (request.method !== 'POST') {
          sendProxyJson(response, 405, proxyError('BAD_REQUEST', 'Only POST is allowed'))
          return
        }

        if (!appsScriptUrl) {
          sendProxyJson(
            response,
            500,
            proxyError('CONFIG_MISSING', 'APPS_SCRIPT_URL belum di-set'),
          )
          return
        }

        try {
          const upstreamResponse = await fetch(appsScriptUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain;charset=utf-8',
            },
            body: await readBody(request),
            redirect: 'follow',
            signal: AbortSignal.timeout(55_000),
          })
          const upstreamBody = await upstreamResponse.text()

          if (!upstreamResponse.ok) {
            sendProxyJson(
              response,
              upstreamResponse.status,
              proxyError(
                'INTERNAL_ERROR',
                'Apps Script upstream returned HTTP ' +
                  String(upstreamResponse.status),
              ),
            )
            return
          }

          if (!isOurSpaceJson(upstreamBody)) {
            sendProxyJson(
              response,
              502,
              proxyError(
                'INTERNAL_ERROR',
                'Apps Script upstream did not return JSON',
              ),
            )
            return
          }

          sendProxyJson(response, upstreamResponse.status, upstreamBody)
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Proxy request failed'
          sendProxyJson(response, 502, proxyError('INTERNAL_ERROR', message))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const appsScriptUrl = env.APPS_SCRIPT_URL

  return {
    plugins: [
      tailwindcss(),
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      appsScriptDevProxy(appsScriptUrl),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
  }
})
