import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNotifications } from './useNotifications'

// Mock the global Notification constructor
const mockNotificationConstructor = vi.fn()
const mockRequestPermission = vi.fn()

function setupNotificationMock(permissionValue: NotificationPermission = 'granted') {
  const MockNotification = mockNotificationConstructor as unknown as typeof Notification & {
    permission: NotificationPermission
    requestPermission: () => Promise<NotificationPermission>
  }
  MockNotification.permission = permissionValue
  MockNotification.requestPermission = mockRequestPermission.mockResolvedValue(permissionValue)
  vi.stubGlobal('Notification', MockNotification)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useNotifications', () => {
  it('fires notification on motion 0->1 transition when enabled and granted', () => {
    setupNotificationMock('granted')
    const { rerender } = renderHook(
      ({ motion, enabled }: { motion: number | null; enabled: boolean }) =>
        useNotifications(motion, enabled),
      { initialProps: { motion: 0, enabled: true } }
    )

    // Transition from 0 to 1
    rerender({ motion: 1, enabled: true })

    expect(mockNotificationConstructor).toHaveBeenCalledTimes(1)
    expect(mockNotificationConstructor).toHaveBeenCalledWith('JohnnyRedis', {
      body: 'Motion detected!',
      icon: '/favicon.ico',
    })
  })

  it('does NOT fire on motion 1->1 (no re-trigger)', () => {
    setupNotificationMock('granted')
    const { rerender } = renderHook(
      ({ motion, enabled }: { motion: number | null; enabled: boolean }) =>
        useNotifications(motion, enabled),
      { initialProps: { motion: 0, enabled: true } }
    )

    // Transition 0->1 — fires once
    rerender({ motion: 1, enabled: true })
    expect(mockNotificationConstructor).toHaveBeenCalledTimes(1)

    // Re-render with same value 1 — should not fire again (not a rising edge)
    vi.advanceTimersByTime(31_000) // skip cooldown so cooldown isn't the reason
    rerender({ motion: 1, enabled: true })

    expect(mockNotificationConstructor).toHaveBeenCalledTimes(1)
  })

  it('does NOT fire when enabled=false', () => {
    setupNotificationMock('granted')
    const { rerender } = renderHook(
      ({ motion, enabled }: { motion: number | null; enabled: boolean }) =>
        useNotifications(motion, enabled),
      { initialProps: { motion: 0, enabled: false } }
    )

    rerender({ motion: 1, enabled: false })

    expect(mockNotificationConstructor).not.toHaveBeenCalled()
  })

  it('does NOT fire within 30-second cooldown', () => {
    setupNotificationMock('granted')
    const { rerender } = renderHook(
      ({ motion, enabled }: { motion: number | null; enabled: boolean }) =>
        useNotifications(motion, enabled),
      { initialProps: { motion: 0, enabled: true } }
    )

    // First transition — fires
    rerender({ motion: 1, enabled: true })
    expect(mockNotificationConstructor).toHaveBeenCalledTimes(1)

    // Back to 0, then up to 1 again within 30s cooldown
    rerender({ motion: 0, enabled: true })
    // Only 10 seconds elapsed
    vi.advanceTimersByTime(10_000)
    rerender({ motion: 1, enabled: true })

    // Should NOT fire again (still in cooldown)
    expect(mockNotificationConstructor).toHaveBeenCalledTimes(1)
  })

  it('fires again AFTER 30-second cooldown expires', () => {
    setupNotificationMock('granted')
    const { rerender } = renderHook(
      ({ motion, enabled }: { motion: number | null; enabled: boolean }) =>
        useNotifications(motion, enabled),
      { initialProps: { motion: 0, enabled: true } }
    )

    // First fire
    rerender({ motion: 1, enabled: true })
    expect(mockNotificationConstructor).toHaveBeenCalledTimes(1)

    // Reset to 0
    rerender({ motion: 0, enabled: true })

    // Advance past cooldown
    vi.advanceTimersByTime(31_000)

    // New rising edge after cooldown
    rerender({ motion: 1, enabled: true })

    expect(mockNotificationConstructor).toHaveBeenCalledTimes(2)
  })

  it('requestPermission calls Notification.requestPermission', async () => {
    setupNotificationMock('default')
    const { result } = renderHook(() => useNotifications(null, false))

    await act(async () => {
      await result.current.requestPermission()
    })

    expect(mockRequestPermission).toHaveBeenCalledTimes(1)
  })
})
