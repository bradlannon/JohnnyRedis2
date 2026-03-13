export async function sendCommand(
  device: string,
  board: string,
  action: string,
  value?: string | number | boolean
): Promise<void> {
  const response = await fetch('/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device, board, action, ...(value !== undefined ? { value } : {}) }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    console.error('sendCommand error:', response.status, body)
  }
}
