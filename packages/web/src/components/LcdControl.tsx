import { useState } from 'react'
import { sendCommand } from '../lib/sendCommand'

const MAX_LENGTH = 32

export function LcdControl() {
  const [text, setText] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim()) {
      sendCommand('lcd', 'nano', 'text', text)
      setText('')
    }
  }

  return (
    <div className="rounded-lg shadow bg-white p-4">
      <p className="text-sm font-medium text-gray-500 mb-3">LCD Display</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
          placeholder="Enter text..."
          maxLength={MAX_LENGTH}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {text.length}/{MAX_LENGTH}
          </span>
          <button
            type="submit"
            disabled={!text.trim()}
            className="px-4 py-1.5 rounded-md text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
