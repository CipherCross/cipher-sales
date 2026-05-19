"use client";

import { useState } from "react";

interface ToolErrorProps {
  toolName: string;
  message: string;
  detail?: string;
}

export default function ToolError({ toolName, message, detail }: ToolErrorProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs font-mono">
      {/* Header row */}
      <div className="flex items-start gap-2">
        {/* Icon */}
        <svg
          className="mt-0.5 w-3.5 h-3.5 shrink-0 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <span className="text-red-400 font-semibold">{toolName}</span>
          <span className="text-red-300/70 mx-1.5">—</span>
          <span className="text-red-300/90">{message}</span>
        </div>

        {/* Expand toggle (only if there's extra detail) */}
        {detail && detail !== message && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 text-red-400/60 hover:text-red-400 transition-colors"
            title={expanded ? "Hide details" : "Show details"}
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Collapsible raw detail */}
      {expanded && detail && detail !== message && (
        <pre className="mt-2 ml-5 whitespace-pre-wrap break-all text-red-300/50 leading-relaxed">{detail}</pre>
      )}
    </div>
  );
}
