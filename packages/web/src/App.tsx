import './lib/chartSetup'
import { useEffect, useState } from 'react'
import { useSSE } from './hooks/useSSE'
import { useNotifications } from './hooks/useNotifications'
import { SensorCard } from './components/SensorCard'
import { StatusBadge } from './components/StatusBadge'
import { RgbControl } from './components/RgbControl'
import { ServoControl } from './components/ServoControl'
import { LedToggle } from './components/LedToggle'
import { PiezoControl } from './components/PiezoControl'
import { LcdControl } from './components/LcdControl'
import { ChartSection } from './components/ChartSection'
import { CameraSection } from './components/CameraSection'
import { SchedulerUI } from './components/SchedulerUI'

export default function App() {
  const state = useSSE('/events')

  const hubOnline = state.status['hub']?.online ?? null
  const nanoOnline = state.status['nano']?.online ?? null

  const motionValue = state.sensors['motion/nano']?.value ?? null
  const photoValue = state.sensors['photoresistor/nano']?.value ?? null
  const potValue = state.sensors['potentiometer/nano']?.value ?? null
  const buttonValue = state.sensors['button/nano']?.value ?? null

  // Motion alert toggle — persisted to localStorage
  const [alertsEnabled, setAlertsEnabled] = useState(() => {
    return localStorage.getItem('motion-alerts-enabled') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('motion-alerts-enabled', String(alertsEnabled))
  }, [alertsEnabled])

  const { requestPermission, permission, supported: notificationsSupported } = useNotifications(
    motionValue,
    alertsEnabled
  )

  function handleAlertToggle() {
    if (permission === 'default') {
      // First click: request permission
      void requestPermission().then(() => {
        setAlertsEnabled(true)
      })
    } else {
      setAlertsEnabled((prev) => !prev)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header — matches bradlannon.ca nav */}
      <nav className="sticky top-0 bg-white border-b-2 border-[#2A9D8F] z-[100] px-[60px] max-md:px-6 flex items-center justify-between h-16 font-[Nunito_Sans,sans-serif]">
        <div className="flex gap-9">
          <a href="https://bradlannon.ca/#portfolio" className="nav-link">Portfolio</a>
          <a href="https://bradlannon.ca/apps.html" className="nav-link active-nav">Apps</a>
          <a href="https://bradlannon.ca/av.html" className="nav-link">A/V</a>
          <a href="https://bradlannon.ca/#about" className="nav-link">About me</a>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge label="Hub" online={hubOnline} />
          <StatusBadge label="Nano" online={nanoOnline} />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Sensors section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-700">Sensors</h2>

            {/* Motion alert toggle */}
            {notificationsSupported && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAlertToggle}
                  title={
                    permission === 'denied'
                      ? 'Notifications blocked in browser settings'
                      : alertsEnabled
                      ? 'Disable motion alerts'
                      : 'Enable motion alerts'
                  }
                  disabled={permission === 'denied'}
                  aria-label={alertsEnabled ? 'Disable motion alerts' : 'Enable motion alerts'}
                  className={`p-1.5 rounded-lg transition-colors ${
                    permission === 'denied'
                      ? 'text-gray-300 cursor-not-allowed'
                      : alertsEnabled
                      ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {alertsEnabled ? (
                    // Bell (enabled)
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M5.85 3.5a.75.75 0 00-1.117-1 9.719 9.719 0 00-2.348 4.876.75.75 0 001.479.248A8.219 8.219 0 015.85 3.5zM19.267 2.5a.75.75 0 00-1.118 1 8.22 8.22 0 011.987 4.124.75.75 0 001.479-.248A9.72 9.72 0 0019.267 2.5z" />
                      <path
                        fillRule="evenodd"
                        d="M12 2.25A6.75 6.75 0 005.25 9v.75a8.217 8.217 0 01-2.119 5.52.75.75 0 00.298 1.206c1.544.57 3.16.99 4.831 1.243a3.75 3.75 0 107.48 0 24.583 24.583 0 004.83-1.244.75.75 0 00.298-1.205 8.217 8.217 0 01-2.118-5.52V9A6.75 6.75 0 0012 2.25zM9.75 18c0-.034 0-.067.002-.1a25.05 25.05 0 004.496 0l.002.1a2.25 2.25 0 11-4.5 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    // Bell with slash (disabled)
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.143 17.082a24.248 24.248 0 003.844.148 24.248 24.248 0 003.844-.148m-7.688 0a3 3 0 106.376 0M9.143 17.082a8.986 8.986 0 01-4.42-1.006.75.75 0 01-.298-1.205 8.217 8.217 0 002.118-5.52V9.75A6.75 6.75 0 0112 3a6.75 6.75 0 016.457 4.736m0 0A6.748 6.748 0 0118.75 9.75v.75m0 0a8.217 8.217 0 002.118 5.52.75.75 0 01-.298 1.205 24.223 24.223 0 01-3.15.789M3 3l18 18"
                      />
                    </svg>
                  )}
                </button>
                <span className="text-xs text-gray-500">
                  {permission === 'denied'
                    ? 'Blocked'
                    : alertsEnabled
                    ? 'Alerts on'
                    : 'Alerts off'}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SensorCard
              label="Motion"
              value={motionValue}
              booleanDisplay
              booleanLabels={['Detected', 'Clear']}
            />
            <SensorCard
              label="Photoresistor"
              value={photoValue}
              unit="lux"
            />
            <SensorCard
              label="Potentiometer"
              value={potValue}
              unit="0-1023"
            />
            <SensorCard
              label="Button"
              value={buttonValue}
              booleanDisplay
              booleanLabels={['Pressed', 'Released']}
            />
          </div>
        </section>

        {/* Sensor History Charts */}
        <section className="mb-8">
          <ChartSection sensors={state.sensors} />
        </section>

        {/* Controls section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <RgbControl />
            <ServoControl />
            <LedToggle ledId="1" label="LED 1" />
            <LedToggle ledId="2" label="LED 2" />
            <PiezoControl />
            <LcdControl />
          </div>
        </section>

        {/* Camera */}
        <section className="mb-8">
          <CameraSection />
        </section>

        {/* Scheduled Actions */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Scheduled Actions</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <SchedulerUI />
          </div>
        </section>
      </main>
    </div>
  )
}
