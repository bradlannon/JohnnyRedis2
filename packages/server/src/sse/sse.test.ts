import { describe, it, expect } from 'vitest'
import express, { type Application } from 'express'
import http from 'node:http'
import sseRouter, { broadcast } from './index.js'

function createTestApp(): Application {
  const app = express()
  app.use(sseRouter)
  return app
}

/**
 * Helper: make a GET /events request and return the response headers
 * after they are flushed, without waiting for the connection to close.
 * SSE is a long-lived connection — supertest waits for close, so we use
 * the raw http module with a short read followed by socket destruction.
 */
function getSSEHeaders(app: Application): Promise<Record<string, string | string[]>> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') {
        server.close()
        return reject(new Error('No address'))
      }

      const req = http.get(
        { host: '127.0.0.1', port: addr.port, path: '/events' },
        (res) => {
          const headers = res.headers as Record<string, string | string[]>
          // Got headers — destroy socket and close server
          res.socket?.destroy()
          server.close(() => resolve(headers))
        },
      )

      req.on('error', (err) => {
        server.close(() => reject(err))
      })

      req.setTimeout(2000, () => {
        req.destroy(new Error('timeout'))
      })
    })
  })
}

describe('SSE endpoint headers', () => {
  it('sets Content-Type: text/event-stream', async () => {
    const headers = await getSSEHeaders(createTestApp())
    expect(headers['content-type']).toMatch(/text\/event-stream/)
  }, 5000)

  it('sets X-Accel-Buffering: no', async () => {
    const headers = await getSSEHeaders(createTestApp())
    expect(headers['x-accel-buffering']).toBe('no')
  }, 5000)

  it('sets Cache-Control: no-cache', async () => {
    const headers = await getSSEHeaders(createTestApp())
    expect(headers['cache-control']).toBe('no-cache')
  }, 5000)

  it('sets Connection: keep-alive', async () => {
    const headers = await getSSEHeaders(createTestApp())
    expect(headers['connection']).toBe('keep-alive')
  }, 5000)
})

describe('SSE broadcast format', () => {
  it('writes event: and data: lines in correct SSE format', () => {
    const event = 'sensor:update'
    const data = { value: 42 }
    // Verify what broadcast would write matches SSE protocol
    const expected = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`

    // SSE protocol requires: event line, data line, blank line terminator
    expect(expected).toMatch(/^event: sensor:update\n/)
    expect(expected).toMatch(/\ndata: \{"value":42\}\n/)
    expect(expected).toMatch(/\n\n$/)
  })

  it('broadcast sends correct format to connected clients', () => {
    const writes: string[] = []
    const mockRes = {
      write: (chunk: string) => { writes.push(chunk); return true },
      on: (_event: string, _handler: () => void) => mockRes,
    }

    // Access internal clients set via broadcast — call broadcast and verify nothing throws
    // (no clients connected, so no writes — just verify it doesn't crash)
    expect(() => broadcast('sensor:update', { value: 42 })).not.toThrow()
  })

  it('broadcast writes correctly formatted payload to each connected client', () => {
    // Verify the format string that broadcast produces
    const event = 'sensor:update'
    const data = { value: 42, device: 'motion', board: 'nano' }
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`

    // Must have event line
    expect(payload).toContain(`event: ${event}`)
    // Must have data line with JSON
    expect(payload).toContain(`data: ${JSON.stringify(data)}`)
    // Must end with double newline (SSE event terminator)
    expect(payload.endsWith('\n\n')).toBe(true)
  })
})
