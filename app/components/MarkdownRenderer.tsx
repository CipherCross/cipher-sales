'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { useState } from 'react'
import type { Components } from 'react-markdown'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="absolute top-2.5 right-2.5 px-2 py-1 rounded-md text-[10px] font-medium tracking-wide uppercase
                 bg-white/5 border border-white/10 text-zinc-400
                 hover:bg-white/10 hover:text-zinc-200 transition-all duration-200
                 backdrop-blur-sm"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

const components: Components = {
  // ---------- CODE BLOCKS ----------
  pre({ children }) {
    // Extract raw text for the copy button
    const extractText = (node: React.ReactNode): string => {
      if (typeof node === 'string') return node
      if (Array.isArray(node)) return node.map(extractText).join('')
      if (node && typeof node === 'object' && 'props' in node) {
        return extractText((node as React.ReactElement<{ children?: React.ReactNode }>).props.children)
      }
      return ''
    }
    const raw = extractText(children as React.ReactNode)

    return (
      <div className="group relative my-4 rounded-xl overflow-hidden
                      border border-cyan-500/10
                      bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950
                      shadow-[0_0_15px_rgba(6,182,212,0.04)]">
        <div className="flex items-center justify-between px-4 py-2
                        border-b border-white/5
                        bg-white/[0.02]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase">code</span>
        </div>
        <div className="overflow-x-auto p-4 text-sm leading-relaxed">
          <CopyButton text={raw} />
          {children}
        </div>
      </div>
    )
  },

  code({ className, children, ...props }) {
    const isInline = !className
    if (isInline) {
      return (
        <code
          className="px-1.5 py-0.5 rounded-md text-[13px] font-mono
                     bg-cyan-500/10 text-cyan-300
                     border border-cyan-500/15"
          {...props}
        >
          {children}
        </code>
      )
    }
    return (
      <code className={`${className ?? ''} !bg-transparent`} {...props}>
        {children}
      </code>
    )
  },

  // ---------- HEADINGS ----------
  h1({ children }) {
    return (
      <h1 className="text-2xl font-bold mt-6 mb-3
                     bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400
                     bg-clip-text text-transparent
                     tracking-tight">
        {children}
      </h1>
    )
  },
  h2({ children }) {
    return (
      <h2 className="text-xl font-semibold mt-5 mb-2
                     bg-gradient-to-r from-cyan-400 to-blue-400
                     bg-clip-text text-transparent
                     tracking-tight">
        {children}
      </h2>
    )
  },
  h3({ children }) {
    return (
      <h3 className="text-lg font-semibold mt-4 mb-2 text-cyan-300/90 tracking-tight">
        {children}
      </h3>
    )
  },
  h4({ children }) {
    return <h4 className="text-base font-semibold mt-3 mb-1 text-zinc-200">{children}</h4>
  },

  // ---------- PARAGRAPH ----------
  p({ children }) {
    return <p className="my-2 leading-7 text-zinc-200/90">{children}</p>
  },

  // ---------- LINKS ----------
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-500/30
                   underline-offset-2 hover:decoration-cyan-400/60 transition-colors"
      >
        {children}
      </a>
    )
  },

  // ---------- LISTS ----------
  ul({ children }) {
    return <ul className="my-2 ml-1 space-y-1.5 list-none">{children}</ul>
  },
  ol({ children }) {
    return <ol className="my-2 ml-1 space-y-1.5 list-none counter-reset-item">{children}</ol>
  },
  li({ children }) {
    return (
      <li className="flex gap-2.5 items-start text-zinc-200/90 leading-7">
        <span className="mt-2.5 w-1.5 h-1.5 shrink-0 rounded-full bg-cyan-500/50" />
        <span className="flex-1">{children}</span>
      </li>
    )
  },

  // ---------- BLOCKQUOTE ----------
  blockquote({ children }) {
    return (
      <blockquote
        className="my-3 pl-4 py-1
                   border-l-2 border-cyan-500/40
                   bg-cyan-500/[0.03] rounded-r-lg
                   text-zinc-300/80 italic"
      >
        {children}
      </blockquote>
    )
  },

  // ---------- HORIZONTAL RULE ----------
  hr() {
    return (
      <hr className="my-6 border-0 h-px
                     bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
    )
  },

  // ---------- TABLE ----------
  table({ children }) {
    return (
      <div className="my-4 overflow-x-auto rounded-xl
                      border border-cyan-500/10
                      shadow-[0_0_15px_rgba(6,182,212,0.04)]">
        <table className="w-full text-sm">{children}</table>
      </div>
    )
  },
  thead({ children }) {
    return (
      <thead className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10
                        border-b border-cyan-500/10">
        {children}
      </thead>
    )
  },
  th({ children }) {
    return (
      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-cyan-400/80">
        {children}
      </th>
    )
  },
  td({ children }) {
    return (
      <td className="px-4 py-2.5 text-zinc-300 border-t border-white/5">
        {children}
      </td>
    )
  },
  tr({ children }) {
    return <tr className="hover:bg-white/[0.02] transition-colors">{children}</tr>
  },

  // ---------- STRONG / EM ----------
  strong({ children }) {
    return <strong className="font-semibold text-zinc-100">{children}</strong>
  },
  em({ children }) {
    return <em className="italic text-zinc-300">{children}</em>
  },

  // ---------- IMAGES ----------
  img({ src, alt }) {
    return (
      <img
        src={src}
        alt={alt ?? ''}
        className="my-3 rounded-xl border border-white/10 max-w-full"
      />
    )
  },
}

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
