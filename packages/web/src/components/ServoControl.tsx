import { useRef, useState } from 'react'
import { sendCommand } from '../lib/sendCommand'

export function ServoControl() {
  const [angle, setAngle] = useState(90)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAngle = Number(e.target.value)
    setAngle(newAngle)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      sendCommand('servo', 'nano', 'set', newAngle)
    }, 150)
  }

  return (
    <div className="rounded-lg shadow bg-white p-4">
      <p className="text-sm font-medium text-gray-500 mb-3">Servo Position</p>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={180}
          value={angle}
          onChange={handleChange}
          className="flex-1"
        />
        <span className="text-sm font-mono w-12 text-right">{angle}&deg;</span>
      </div>
    </div>
  )
}
