interface SensorCardProps {
  label: string
  value: number | null
  unit?: string
  booleanDisplay?: boolean
  booleanLabels?: [string, string] // [trueLabel, falseLabel]
}

export function SensorCard({
  label,
  value,
  unit,
  booleanDisplay = false,
  booleanLabels = ['Detected', 'Clear'],
}: SensorCardProps) {
  const displayValue = () => {
    if (value === null) return '---'
    if (booleanDisplay) {
      return value === 1 ? booleanLabels[0] : booleanLabels[1]
    }
    return unit ? `${value} ${unit}` : String(value)
  }

  return (
    <div className="rounded-lg shadow bg-white p-4">
      <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{displayValue()}</p>
    </div>
  )
}
