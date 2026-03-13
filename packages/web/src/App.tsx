import './lib/chartSetup'
import { useSSE } from './hooks/useSSE'
import { SensorCard } from './components/SensorCard'
import { StatusBadge } from './components/StatusBadge'
import { RgbControl } from './components/RgbControl'
import { ServoControl } from './components/ServoControl'
import { LedToggle } from './components/LedToggle'
import { PiezoControl } from './components/PiezoControl'
import { LcdControl } from './components/LcdControl'
import { ChartSection } from './components/ChartSection'

export default function App() {
  const state = useSSE('/events')

  const hubOnline = state.status['hub']?.online ?? null
  const nanoOnline = state.status['nano']?.online ?? null

  const motionValue = state.sensors['motion/nano']?.value ?? null
  const photoValue = state.sensors['photoresistor/nano']?.value ?? null
  const potValue = state.sensors['potentiometer/nano']?.value ?? null
  const buttonValue = state.sensors['button/nano']?.value ?? null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h1 className="text-2xl font-bold text-gray-900">JohnnyRedis Dashboard</h1>
            <div className="flex flex-wrap gap-2">
              <StatusBadge label="Hub" online={hubOnline} />
              <StatusBadge label="Nano" online={nanoOnline} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Sensors section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Sensors</h2>
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
        <section>
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
      </main>
    </div>
  )
}
