'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState, useEffect, useRef } from 'react'

const transport = new DefaultChatTransport({ api: '/api/chat' })

export default function ChatPage() {
  const { messages, sendMessage, status } = useChat({ transport })
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isLoading = status === 'streaming' || status === 'submitted'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    await sendMessage({ text })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-500">
            <p className="text-lg font-medium text-zinc-300">Ask about your pipeline</p>
            <p className="text-sm">
              e.g. &quot;How is Campaign A performing?&quot; or &quot;Compare AI vs manual hooks&quot;
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
              }`}
            >
              {msg.parts.map((part, i) => {
                if (part.type === 'text') return <span key={i}>{part.text}</span>
                if (part.type.startsWith('tool-')) {
                  const toolName = part.type.replace(/^tool-/, '')
                  const state = (part as { state?: string }).state
                  const done = state === 'output-available' || state === 'output-error'
                  return (
                    <div
                      key={i}
                      className="mt-2 px-3 py-2 bg-zinc-700/50 rounded-lg text-xs text-zinc-400 font-mono"
                    >
                      {done ? `✓ ${toolName}` : `⏳ Running ${toolName}…`}
                    </div>
                  )
                }
                return null
              })}
            </div>
          </div>
        ))}

        {isLoading && messages.at(-1)?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 px-4 py-3">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-3xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e as unknown as React.FormEvent)
              }
            }}
            placeholder="Ask about campaigns, hooks, conversions…"
            rows={1}
            className="flex-1 resize-none rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
