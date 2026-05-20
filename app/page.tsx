"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MarkdownRenderer from "./components/MarkdownRenderer";
import ToolChart from "./components/ToolChart";
import ToolError from "./components/ToolError";

const transport = new DefaultChatTransport({ api: "/api/chat" });

const STARTER_PROMPTS = [
  "How is my LinkedIn outreach performing?",
  "Compare AI vs manual hooks",
  "What's the Upwork bid funnel?",
  "Show me the cross-channel summary",
];

export default function ChatPage() {
  const { messages, sendMessage, status, stop } = useChat({ transport });
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  async function handleChipClick(text: string) {
    if (isLoading) return;
    await sendMessage({ text });
  }

  function copyMessage(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-5">
          <AnimatePresence>
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-zinc-500"
              >
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
                <div className="text-center">
                  <p className="text-lg font-medium text-zinc-300">Ask about your pipeline</p>
                  <p className="text-sm text-zinc-500 mt-1">Get instant analytics across LinkedIn and Upwork</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {STARTER_PROMPTS.map((prompt, i) => (
                    <motion.button
                      key={prompt}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.07, duration: 0.3, ease: "easeOut" }}
                      onClick={() => handleChipClick(prompt)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium
                                 bg-zinc-800/80 border border-white/[0.08] text-zinc-400
                                 hover:border-cyan-500/30 hover:text-cyan-300 hover:bg-cyan-500/[0.06]
                                 transition-all duration-200"
                    >
                      {prompt}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {messages.map((msg) => {
            const textContent = msg.parts
              .filter((p): p is { type: "text"; text: string } => p.type === "text")
              .map((p) => p.text)
              .join("\n\n");

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
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

                <div className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} group`}>
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
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                ) : (
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                )
                              ) : (
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              )}
                              {done ? (isError ? `Failed: ${toolName}` : toolName) : `Running ${toolName}…`}
                            </div>

                            {appError && <ToolError toolName={toolName} message={appError.error} detail={appError.detail} />}

                            {state === "output-available" && output != null && !appError && (
                              <ToolChart toolName={toolName} result={output} />
                            )}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>

                  {/* Copy action (assistant only, fade in on hover) */}
                  {msg.role === "assistant" && textContent && (
                    <div className="flex items-center gap-1 mt-1.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={() => copyMessage(msg.id, textContent)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-zinc-500
                                   hover:text-zinc-300 hover:bg-white/[0.05] transition-all duration-150"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {isLoading && messages.at(-1)?.role === "user" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex justify-start"
            >
              <div className="shrink-0 mr-3 mt-1">
                <div
                  className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-indigo-500/20
                               border border-cyan-500/15 flex items-center justify-center
                               shadow-[0_0_10px_rgba(6,182,212,0.1)] animate-pulse"
                >
                  <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
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
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
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
          {isLoading ? (
            <button
              type="button"
              onClick={() => stop()}
              className="px-5 py-2.5 rounded-xl
                         bg-zinc-700 hover:bg-zinc-600
                         text-white text-sm font-medium
                         transition-all duration-200 flex items-center gap-2 shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-5 py-2.5 rounded-xl
                         bg-gradient-to-r from-indigo-600 to-indigo-500
                         hover:from-indigo-500 hover:to-indigo-400
                         disabled:opacity-40 disabled:cursor-not-allowed
                         text-white text-sm font-medium
                         shadow-lg shadow-indigo-500/20
                         transition-all duration-200 shrink-0"
            >
              Send
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
