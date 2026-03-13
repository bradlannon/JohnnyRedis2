import { useEffect, useState } from 'react'

// ---- Types matching the server schema ----

type Device = 'rgb' | 'servo' | 'led1' | 'led2' | 'piezo' | 'lcd'
type Board = 'nano'
type Action = 'on' | 'off' | 'set' | 'tone'

interface CommandPayload {
  device: Device
  board: Board
  action: Action
  value?: string | number
}

interface ScheduledAction {
  id: number
  name: string
  cronExpression: string
  command: CommandPayload
  enabled: boolean
  timezone: string
  createdAt: string
}

// ---- Form state ----

interface FormState {
  name: string
  cronExpression: string
  device: Device
  board: Board
  action: Action
  value: string
  timezone: string
}

function defaultForm(): FormState {
  return {
    name: '',
    cronExpression: '',
    device: 'led1',
    board: 'nano',
    action: 'on',
    value: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
}

const DEVICES: Device[] = ['rgb', 'servo', 'led1', 'led2', 'piezo', 'lcd']
const ACTIONS: Action[] = ['on', 'off', 'set', 'tone']

// ---- Component ----

export function SchedulerUI() {
  const [schedules, setSchedules] = useState<ScheduledAction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm())
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function fetchSchedules() {
    try {
      setError(null)
      const res = await fetch('/api/schedules')
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = (await res.json()) as ScheduledAction[]
      setSchedules(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedules')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchSchedules()
  }, [])

  function openAddForm() {
    setForm(defaultForm())
    setEditingId(null)
    setFormError(null)
    setShowForm(true)
  }

  function openEditForm(schedule: ScheduledAction) {
    setForm({
      name: schedule.name,
      cronExpression: schedule.cronExpression,
      device: schedule.command.device,
      board: schedule.command.board,
      action: schedule.command.action,
      value: schedule.command.value != null ? String(schedule.command.value) : '',
      timezone: schedule.timezone,
    })
    setEditingId(schedule.id)
    setFormError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setFormError(null)
  }

  async function handleSave() {
    setFormError(null)
    setSaving(true)

    const command: CommandPayload = {
      device: form.device,
      board: form.board,
      action: form.action,
      ...(form.value !== '' ? { value: isNaN(Number(form.value)) ? form.value : Number(form.value) } : {}),
    }

    const body = {
      name: form.name,
      cronExpression: form.cronExpression,
      command,
      timezone: form.timezone,
    }

    try {
      const url = editingId !== null ? `/api/schedules/${editingId}` : '/api/schedules'
      const method = editingId !== null ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(errData.error ?? `Server error: ${res.status}`)
      }

      closeForm()
      await fetchSchedules()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!window.confirm(`Delete schedule "${name}"?`)) return

    try {
      const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      await fetchSchedules()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  async function handleToggleEnabled(schedule: ScheduledAction) {
    try {
      const res = await fetch(`/api/schedules/${schedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !schedule.enabled }),
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      await fetchSchedules()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toggle failed')
    }
  }

  const inputClass =
    'w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
  const selectClass = `${inputClass} bg-white`

  return (
    <div>
      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">
          {loading ? 'Loading...' : `${schedules.length} schedule${schedules.length !== 1 ? 's' : ''}`}
        </span>
        <button
          onClick={openAddForm}
          disabled={showForm}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          + Add Schedule
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            {editingId !== null ? 'Edit Schedule' : 'New Schedule'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. Turn on LEDs at 6pm"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Cron Expression */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Cron Expression
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="0 18 * * *"
                value={form.cronExpression}
                onChange={(e) => setForm((f) => ({ ...f, cronExpression: e.target.value }))}
              />
              <p className="text-xs text-gray-400 mt-0.5">minute hour day month weekday</p>
            </div>

            {/* Device */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Device</label>
              <select
                className={selectClass}
                value={form.device}
                onChange={(e) => setForm((f) => ({ ...f, device: e.target.value as Device }))}
              >
                {DEVICES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Board */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Board</label>
              <select
                className={selectClass}
                value={form.board}
                onChange={(e) => setForm((f) => ({ ...f, board: e.target.value as Board }))}
              >
                <option value="nano">nano</option>
              </select>
            </div>

            {/* Action */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
              <select
                className={selectClass}
                value={form.action}
                onChange={(e) => setForm((f) => ({ ...f, action: e.target.value as Action }))}
              >
                {ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* Value */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Value <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. 255 or ff0000"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              />
            </div>

            {/* Timezone */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Timezone</label>
              <input
                type="text"
                className={inputClass}
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
              />
            </div>
          </div>

          {formError && (
            <p className="mt-2 text-xs text-red-600">{String(formError)}</p>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => void handleSave()}
              disabled={saving || !form.name || !form.cronExpression}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={closeForm}
              className="px-4 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Schedule list */}
      {!loading && schedules.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          No schedules yet. Click &ldquo;+ Add Schedule&rdquo; to create one.
        </div>
      )}

      {schedules.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Schedule</th>
                <th className="pb-2 pr-4">Command</th>
                <th className="pb-2 pr-4 text-center">Enabled</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s, i) => (
                <tr
                  key={s.id}
                  className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="py-2 pr-4 font-medium text-gray-800">{s.name}</td>
                  <td className="py-2 pr-4 font-mono text-gray-600 text-xs">
                    {s.cronExpression}
                    {s.timezone !== 'UTC' && (
                      <span className="ml-1 text-gray-400">({s.timezone})</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-gray-600 text-xs">
                    {s.command.device}/{s.command.board} {s.command.action}
                    {s.command.value != null && ` ${s.command.value}`}
                  </td>
                  <td className="py-2 pr-4 text-center">
                    <button
                      onClick={() => void handleToggleEnabled(s)}
                      aria-label={s.enabled ? 'Disable schedule' : 'Enable schedule'}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                        s.enabled ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          s.enabled ? 'translate-x-4' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditForm(s)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void handleDelete(s.id, s.name)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
