import { useEffect, useRef, useState } from 'react'

type NotificationPermission = 'default' | 'granted' | 'denied'

const COOLDOWN_MS = 30_000

interface UseNotificationsResult {
  requestPermission: () => Promise<void>
  permission: NotificationPermission
  supported: boolean
}

export function useNotifications(
  motionValue: number | null,
  enabled: boolean
): UseNotificationsResult {
  const supported = typeof window !== 'undefined' && 'Notification' in window

  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? (Notification.permission as NotificationPermission) : 'denied'
  )

  const prevMotionRef = useRef<number | null>(null)
  const lastNotifiedAtRef = useRef<number>(0)

  async function requestPermission(): Promise<void> {
    if (!supported) return
    const result = await Notification.requestPermission()
    setPermission(result as NotificationPermission)
  }

  useEffect(() => {
    const prev = prevMotionRef.current

    if (enabled && permission === 'granted' && motionValue === 1 && prev !== 1) {
      const now = Date.now()
      if (now - lastNotifiedAtRef.current >= COOLDOWN_MS) {
        lastNotifiedAtRef.current = now
        new Notification('JohnnyRedis', {
          body: 'Motion detected!',
          icon: '/favicon.ico',
        })
      }
    }

    prevMotionRef.current = motionValue
  }, [motionValue, enabled, permission])

  return { requestPermission, permission, supported }
}
