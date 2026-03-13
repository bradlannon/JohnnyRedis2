import { Router, type Request, type Response } from 'express'
import { stateCache } from '../state/cache.js'

const router = Router()
const clients = new Set<Response>()

router.get('/events', (req: Request, res: Response) => {
  // Required headers — all four must be set before flushHeaders()
  // X-Accel-Buffering: no instructs nginx to disable proxy buffering per-response
  // This is critical for Hostinger's nginx-proxied environment
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.flushHeaders()

  // Tell client retry interval (10s) as first SSE directive
  res.write('retry: 10000\n\n')

  // Send full cached state immediately on connect (INFRA-04: instant page loads)
  const snapshot = stateCache.snapshot()
  res.write(`event: state:init\ndata: ${JSON.stringify(snapshot)}\n\n`)

  // Register client
  clients.add(res)

  // Keepalive: SSE comment every 25s prevents nginx proxy_read_timeout from closing idle connections
  const keepalive = setInterval(() => {
    res.write(': keepalive\n\n')
  }, 25_000)

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(keepalive)
    clients.delete(res)
  })
})

// Broadcast a named event to all connected SSE clients
export function broadcast(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const res of clients) {
    res.write(payload)
  }
}

export default router
