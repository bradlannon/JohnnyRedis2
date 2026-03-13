import { useRef, useState } from 'react'
import { RgbColorPicker, RgbColor } from 'react-colorful'
import { sendCommand } from '../lib/sendCommand'

export function RgbControl() {
  const [color, setColor] = useState<RgbColor>({ r: 0, g: 0, b: 0 })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = (newColor: RgbColor) => {
    setColor(newColor)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      sendCommand('rgb', 'nano', 'set', `${newColor.r},${newColor.g},${newColor.b}`)
    }, 150)
  }

  return (
    <div className="rounded-lg shadow bg-white p-4">
      <p className="text-sm font-medium text-gray-500 mb-3">RGB LED</p>
      <RgbColorPicker color={color} onChange={handleChange} />
      <div
        className="mt-3 h-8 rounded-md border border-gray-200"
        style={{ backgroundColor: `rgb(${color.r},${color.g},${color.b})` }}
        aria-label={`Color preview: rgb(${color.r}, ${color.g}, ${color.b})`}
      />
    </div>
  )
}
