'use client'

import { useState } from 'react'

export default function SyncButton() {
  const [status, setStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle')

  async function handleSync() {
    setStatus('syncing')
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      if (!res.ok) throw new Error(await res.text())
      setStatus('done')
    } catch {
      setStatus('error')
    } finally {
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const label = {
    idle: 'Sync Airtable',
    syncing: 'Syncing…',
    done: 'Synced ✓',
    error: 'Failed ✗',
  }[status]

  const color = {
    idle: 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100',
    syncing: 'bg-zinc-700 text-zinc-400 cursor-not-allowed',
    done: 'bg-emerald-700 text-white',
    error: 'bg-red-700 text-white',
  }[status]

  return (
    <button
      onClick={handleSync}
      disabled={status === 'syncing'}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${color}`}
    >
      {label}
    </button>
  )
}
