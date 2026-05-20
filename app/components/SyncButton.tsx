'use client'

import { useState, useEffect } from 'react'

function formatAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

export default function SyncButton() {
  const [status, setStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle')
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  async function handleSync() {
    setStatus('syncing')
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      if (!res.ok) throw new Error(await res.text())
      setStatus('done')
      setLastSynced(new Date())
    } catch {
      setStatus('error')
    } finally {
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const isSyncing = status === 'syncing'
  const isDone = status === 'done'
  const isError = status === 'error'

  return (
    <div className="flex items-center gap-3">
      {lastSynced && (
        <span className="text-xs text-zinc-500 hidden sm:block">
          Synced {formatAgo(lastSynced)}
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
          ${isError
            ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
            : isDone
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : isSyncing
            ? 'bg-white/[0.04] border border-white/[0.06] text-zinc-400 cursor-not-allowed'
            : 'bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:border-cyan-500/20 hover:text-cyan-300 hover:bg-cyan-500/[0.06]'
          }`}
      >
        {isSyncing ? (
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : isDone ? (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : isError ? (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        )}
        {isSyncing ? 'Syncing…' : isDone ? 'Synced' : isError ? 'Failed' : 'Sync Airtable'}
      </button>
    </div>
  )
}
