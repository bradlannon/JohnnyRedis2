import { useRef, useState } from 'react'
import { CameraFeed } from './CameraFeed'

type CameraTab = 'webcam' | 'pi_camera'

export function CameraSection() {
  const webcamUrl: string | null = import.meta.env.VITE_CAMERA_WEBCAM_URL ?? null
  const piCameraUrl: string | null = import.meta.env.VITE_CAMERA_PI_URL ?? null
  const [activeTab, setActiveTab] = useState<CameraTab>('webcam')
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const bothNull = webcamUrl === null && piCameraUrl === null

  function handleFullscreen() {
    videoRef.current?.requestFullscreen().catch(() => {})
  }

  function handleSnapshot() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `snapshot-${activeTab}-${Date.now()}.png`
    a.click()
  }

  if (bothNull) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Camera</h2>
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          No camera URLs configured
        </div>
      </div>
    )
  }

  const activeUrl = activeTab === 'webcam' ? webcamUrl : piCameraUrl
  const activeLabel = activeTab === 'webcam' ? 'Webcam' : 'Pi Camera'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Section header with tabs and controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-700">Camera</h2>
          {/* Tab buttons — same style as ChartSection window selector */}
          <div className="flex gap-1" role="group" aria-label="Camera feed selector">
            {webcamUrl !== null && (
              <button
                onClick={() => setActiveTab('webcam')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  activeTab === 'webcam'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                aria-pressed={activeTab === 'webcam'}
              >
                Webcam
              </button>
            )}
            {piCameraUrl !== null && (
              <button
                onClick={() => setActiveTab('pi_camera')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  activeTab === 'pi_camera'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                aria-pressed={activeTab === 'pi_camera'}
              >
                Pi Camera
              </button>
            )}
          </div>
        </div>

        {/* Camera controls */}
        <div className="flex gap-2">
          <button
            onClick={handleFullscreen}
            title="Fullscreen"
            className="p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Fullscreen"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
              />
            </svg>
          </button>
          <button
            onClick={handleSnapshot}
            title="Take snapshot"
            className="p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Take snapshot"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Only render the active tab's feed — saves bandwidth */}
      <CameraFeed ref={videoRef} src={activeUrl} label={activeLabel} />
    </div>
  )
}
