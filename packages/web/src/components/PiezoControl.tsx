import { sendCommand } from '../lib/sendCommand'

const TONES = [
  { label: 'Beep', frequency: 1000, duration: 200 },
  { label: 'Alert', frequency: 2000, duration: 500 },
] as const

export function PiezoControl() {
  const handleTone = (frequency: number, duration: number) => {
    sendCommand('piezo', 'nano', 'tone', `${frequency},${duration}`)
  }

  return (
    <div className="rounded-lg shadow bg-white p-4">
      <p className="text-sm font-medium text-gray-500 mb-3">Piezo Buzzer</p>
      <div className="flex gap-2">
        {TONES.map(({ label, frequency, duration }) => (
          <button
            key={label}
            onClick={() => handleTone(frequency, duration)}
            className="px-4 py-2 rounded-md text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
