import { forwardRef, useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

type FeedStatus = 'connecting' | 'playing' | 'offline' | 'error'

interface CameraFeedProps {
  src: string | null
  label: string
}

export const CameraFeed = forwardRef<HTMLVideoElement, CameraFeedProps>(
  function CameraFeed({ src, label }, forwardedRef) {
    const internalRef = useRef<HTMLVideoElement | null>(null)
    const hlsRef = useRef<Hls | null>(null)
    const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [status, setStatus] = useState<FeedStatus>(src ? 'connecting' : 'offline')

    // Sync forwarded ref with internal ref
    function setRef(el: HTMLVideoElement | null) {
      internalRef.current = el
      if (typeof forwardedRef === 'function') {
        forwardedRef(el)
      } else if (forwardedRef) {
        forwardedRef.current = el
      }
    }

    useEffect(() => {
      if (!src) {
        setStatus('offline')
        return
      }

      const activeSrc: string = src
      setStatus('connecting')

      function cleanup() {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current)
          retryTimeoutRef.current = null
        }
        if (hlsRef.current) {
          hlsRef.current.destroy()
          hlsRef.current = null
        }
      }

      function scheduleRetry() {
        retryTimeoutRef.current = setTimeout(() => {
          setStatus('connecting')
          startStream()
        }, 15000)
      }

      function startStream() {
        const video = internalRef.current
        if (!video) return

        if (Hls.isSupported()) {
          const hls = new Hls({ liveSyncDurationCount: 3 })
          hlsRef.current = hls

          hls.loadSource(activeSrc)
          hls.attachMedia(video)

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setStatus('playing')
            video.play().catch(() => {
              // Autoplay blocked by browser — video still loaded
            })
          })

          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              setStatus(data.type === Hls.ErrorTypes.NETWORK_ERROR ? 'offline' : 'error')
              hls.destroy()
              hlsRef.current = null
              scheduleRetry()
            }
          })
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari native HLS
          video.src = activeSrc
          const onLoaded = () => {
            setStatus('playing')
            video.play().catch(() => {})
          }
          const onError = () => {
            setStatus('error')
            scheduleRetry()
          }
          video.addEventListener('loadedmetadata', onLoaded)
          video.addEventListener('error', onError)
        } else {
          setStatus('error')
        }
      }

      startStream()
      return cleanup
    }, [src])

    const statusText: Record<FeedStatus, string> = {
      connecting: 'Connecting...',
      playing: label,
      offline: 'Camera offline',
      error: 'Stream unavailable',
    }

    return (
      <div
        data-testid="camera-feed"
        data-status={status}
        className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden"
      >
        {status === 'playing' ? (
          <>
            <video
              ref={setRef}
              className="w-full h-full object-cover"
              muted
              playsInline
              aria-label={label}
            />
            {/* LIVE badge */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" aria-hidden="true" />
              LIVE &middot; ~5s delay
            </div>
          </>
        ) : (
          <>
            {/* Hidden video element so ref is available for Safari native HLS */}
            <video ref={setRef} className="hidden" muted playsInline aria-label={label} />
            <div className="flex flex-col items-center justify-center w-full h-full gap-3 text-gray-400">
              {/* Camera icon SVG */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-12 h-12 opacity-40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium" data-testid="status-text">
                  {statusText[status]}
                </span>
                {status === 'connecting' && (
                  <span className="text-xs text-gray-500">Loading stream...</span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }
)
