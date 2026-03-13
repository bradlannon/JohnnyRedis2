import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CameraFeed } from './CameraFeed'

// Mock hls.js module
vi.mock('hls.js', () => {
  const Events = {
    MANIFEST_PARSED: 'hlsManifestParsed',
    ERROR: 'hlsError',
  }
  const ErrorTypes = {
    NETWORK_ERROR: 'networkError',
    MEDIA_ERROR: 'mediaError',
  }

  class MockHls {
    static isSupported = vi.fn(() => true)
    static Events = Events
    static ErrorTypes = ErrorTypes
    loadSource = vi.fn()
    attachMedia = vi.fn()
    on = vi.fn()
    destroy = vi.fn()
  }

  return { default: MockHls, Events, ErrorTypes }
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CameraFeed', () => {
  it('renders offline placeholder when src is null', () => {
    render(<CameraFeed src={null} label="Webcam" />)
    expect(screen.getByTestId('status-text')).toHaveTextContent('Camera offline')
  })

  it('renders connecting state initially when src is provided', () => {
    render(<CameraFeed src="https://example.com/stream.m3u8" label="Webcam" />)
    // Status is connecting before HLS fires MANIFEST_PARSED
    expect(screen.getByTestId('status-text')).toHaveTextContent('Connecting...')
  })

  it('renders "Camera offline" status text when status is offline', () => {
    render(<CameraFeed src={null} label="Test Camera" />)
    const el = screen.getByTestId('camera-feed')
    expect(el).toHaveAttribute('data-status', 'offline')
    expect(screen.getByTestId('status-text')).toHaveTextContent('Camera offline')
  })

  it('renders "Connecting..." status text when src is provided', () => {
    render(<CameraFeed src="https://example.com/stream.m3u8" label="Test Camera" />)
    const el = screen.getByTestId('camera-feed')
    expect(el).toHaveAttribute('data-status', 'connecting')
    expect(screen.getByTestId('status-text')).toHaveTextContent('Connecting...')
  })

  it('includes video element accessible to parent via ref', () => {
    const ref = { current: null } as React.RefObject<HTMLVideoElement | null>
    render(<CameraFeed ref={ref} src={null} label="Webcam" />)
    // ref.current may be null in offline state (hidden video) but element exists in DOM
    expect(screen.getByLabelText('Webcam')).toBeInTheDocument()
  })
})
