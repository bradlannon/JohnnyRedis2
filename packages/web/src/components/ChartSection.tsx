import { useState } from 'react'
import { SensorChart } from './SensorChart'
import { type DashboardState } from '../store/dashboardState'

type TimeWindow = '1h' | '24h' | '7d'

interface ChartSectionProps {
  sensors: DashboardState['sensors']
}

const WINDOWS: TimeWindow[] = ['1h', '24h', '7d']

export function ChartSection({ sensors }: ChartSectionProps) {
  const [window, setWindow] = useState<TimeWindow>('1h')

  const photoSensor = sensors['photoresistor/nano']
  const potSensor = sensors['potentiometer/nano']
  const motionSensor = sensors['motion/nano']
  const buttonSensor = sensors['button/nano']

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-700">Sensor History</h2>
        <div className="flex gap-1" role="group" aria-label="Time window selector">
          {WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                window === w
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              aria-pressed={window === w}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SensorChart
          device="photoresistor"
          board="nano"
          label="Photoresistor"
          color="#f59e0b"
          stepped={false}
          window={window}
          latestValue={photoSensor ? { ts: photoSensor.ts, value: photoSensor.value } : null}
        />
        <SensorChart
          device="potentiometer"
          board="nano"
          label="Potentiometer"
          color="#3b82f6"
          stepped={false}
          window={window}
          latestValue={potSensor ? { ts: potSensor.ts, value: potSensor.value } : null}
        />
        <SensorChart
          device="motion"
          board="nano"
          label="Motion"
          color="#ef4444"
          stepped={true}
          window={window}
          latestValue={motionSensor ? { ts: motionSensor.ts, value: motionSensor.value } : null}
        />
        <SensorChart
          device="button"
          board="nano"
          label="Button"
          color="#8b5cf6"
          stepped={true}
          window={window}
          latestValue={buttonSensor ? { ts: buttonSensor.ts, value: buttonSensor.value } : null}
        />
      </div>
    </div>
  )
}
