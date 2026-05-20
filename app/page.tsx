"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useEffect, useRef } from "react";
import MarkdownRenderer from "./components/MarkdownRenderer";
import ToolChart from "./components/ToolChart";
import ToolError from "./components/ToolError";

const transport = new DefaultChatTransport({ api: "/api/chat" });

export default function ChatPage() {
  const { messages, sendMessage, status } = useChat({ transport });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isLoading = status === "streaming" || status === "submitted";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    await sendMessage({ text });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/10 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-cyan-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-zinc-300">Ask about your pipeline</p>
            <p className="text-sm text-zinc-500">
              e.g. &quot;How is Campaign A performing?&quot; or &quot;Compare AI vs manual hooks&quot;
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {/* AI avatar */}
            {msg.role === "assistant" && (
              <div className="shrink-0 mr-3 mt-1">
                <div
                  className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-indigo-500/20
                               border border-cyan-500/15 flex items-center justify-center
                               shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                >
                  <svg
                    className="w-4 h-4 text-cyan-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                    />
                  </svg>
                </div>
              </div>
            )}

            <div
              className={`rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "max-w-[75%] bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-sm px-4 py-3 shadow-lg shadow-indigo-500/10"
                  : "max-w-[85%] bg-zinc-800/80 text-zinc-100 rounded-bl-sm px-5 py-4 border border-white/[0.04] shadow-lg shadow-black/20"
              }`}
            >
              {msg.parts.map((part, i) => {
                if (part.type === "text") {
                  if (msg.role === "user") {
                    return (
                      <span key={i} className="whitespace-pre-wrap">
                        {part.text}
                      </span>
                    );
                  }
                  return <MarkdownRenderer key={i} content={part.text} />;
                }
                if (part.type.startsWith("tool-")) {
                  const toolName = part.type.replace(/^tool-/, "");
                  const toolPart = part as { state?: string; output?: unknown };
                  const state = toolPart.state;
                  const done = state === "output-available" || state === "output-error";

                  // An output-available result may still carry an application-level
                  // error returned by withToolError (e.g. a DB / SQL failure).
                  const output = toolPart.output as Record<string, unknown> | null | undefined;
                  const appError =
                    state === "output-available" &&
                    output != null &&
                    typeof output === "object" &&
                    typeof output.error === "string"
                      ? (output as { error: string; detail?: string })
                      : null;

                  const isError = state === "output-error" || appError !== null;

                  return (
                    <div key={i}>
                      {/* Tool status pill */}
                      <div
                        className={`mt-3 px-3 py-2.5 rounded-lg text-xs font-mono flex items-center gap-2
                          border ${
                            done
                              ? isError
                                ? "bg-red-500/5 border-red-500/15 text-red-400"
                                : "bg-cyan-500/5 border-cyan-500/15 text-cyan-400"
                              : "bg-white/[0.02] border-white/5 text-zinc-500"
                          }`}
                      >
                        {done ? (
                          isError ? (
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          ) : (
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )
                        ) : (
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                        )}
                        {done ? (isError ? `Failed: ${toolName}` : toolName) : `Running ${toolName}…`}
                      </div>

                      {/* App-level error card (DB / SQL errors caught by withToolError) */}
                      {appError && <ToolError toolName={toolName} message={appError.error} detail={appError.detail} />}

                      {/* Chart — only when there's a real, non-error result */}
                      {state === "output-available" && output != null && !appError && (
                        <ToolChart toolName={toolName} result={output} />
                      )}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}

        {isLoading && messages.at(-1)?.role === "user" && (
          <div className="flex justify-start">
            <div className="shrink-0 mr-3 mt-1">
              <div
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-indigo-500/20
                             border border-cyan-500/15 flex items-center justify-center
                             shadow-[0_0_10px_rgba(6,182,212,0.1)] animate-pulse"
              >
                <svg
                  className="w-4 h-4 text-cyan-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                  />
                </svg>
              </div>
            </div>
            <div className="bg-zinc-800/80 rounded-2xl rounded-bl-sm px-5 py-4 border border-white/[0.04]">
              <span className="inline-flex gap-1.5">
                <span className="w-2 h-2 bg-cyan-400/60 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-cyan-400/60 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-cyan-400/60 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-white/[0.04] bg-zinc-900/80 backdrop-blur-sm px-4 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-3xl mx-auto">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
            placeholder="Ask about campaigns, hooks, conversions…"
            rows={1}
            className="flex-1 resize-none rounded-xl bg-zinc-800/80 border border-white/[0.06]
                       px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500
                       focus:outline-none focus:border-cyan-500/40 focus:shadow-[0_0_12px_rgba(6,182,212,0.08)]
                       transition-all duration-200 max-h-48 overflow-y-auto"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-5 py-2.5 rounded-xl
                       bg-gradient-to-r from-indigo-600 to-indigo-500
                       hover:from-indigo-500 hover:to-indigo-400
                       disabled:opacity-40 disabled:cursor-not-allowed
                       text-white text-sm font-medium
                       shadow-lg shadow-indigo-500/20
                       transition-all duration-200"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
