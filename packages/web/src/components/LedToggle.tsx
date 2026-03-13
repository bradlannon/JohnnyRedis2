import { useState } from 'react'
import { sendCommand } from '../lib/sendCommand'

interface LedToggleProps {
  ledId: string
  label: string
}

export function LedToggle({ ledId, label }: LedToggleProps) {
  const [isOn, setIsOn] = useState(false)

  const handleToggle = () => {
    const next = !isOn
    setIsOn(next)
    sendCommand(`led-${ledId}`, 'nano', 'set', next ? 1 : 0)
  }

  return (
    <div className="rounded-lg shadow bg-white p-4">
      <p className="text-sm font-medium text-gray-500 mb-3">{label}</p>
      <button
        onClick={handleToggle}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          isOn
            ? 'bg-green-500 text-white hover:bg-green-600'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        {isOn ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}
