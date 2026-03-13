interface StatusBadgeProps {
  label: string
  online: boolean | null
}

export function StatusBadge({ label, online }: StatusBadgeProps) {
  const dotColor =
    online === true ? 'bg-green-500' : online === false ? 'bg-red-500' : 'bg-gray-400'
  const statusText =
    online === true ? 'Online' : online === false ? 'Offline' : 'Unknown'

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      {label}: {statusText}
    </span>
  )
}
