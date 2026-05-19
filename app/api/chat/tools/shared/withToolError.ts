/**
 * Wraps a tool's execute function so that any thrown error is caught and
 * returned as a structured `{ error, detail }` object instead of propagating.
 *
 * The AI SDK will surface this as a successful tool result with `state =
 * "output-available"`, and the UI can check for the `error` key to render a
 * ToolError card rather than a chart.
 */
export function withToolError<TInput, TOutput>(
  fn: (input: TInput) => Promise<TOutput>,
): (input: TInput) => Promise<TOutput | { error: string; detail: string }> {
  return async (input: TInput) => {
    try {
      return await fn(input);
    } catch (err: unknown) {
      const isError = err instanceof Error;
      // Surface a short human-readable message and the raw detail separately
      // so the UI can choose how much to show.
      const detail = isError ? err.message : String(err);
      const message = extractFriendlyMessage(detail);
      return { error: message, detail };
    }
  };
}

/**
 * Converts a raw error message (often a Postgres/Drizzle stack) into a
 * short, readable sentence for display in the chat UI.
 */
function extractFriendlyMessage(raw: string): string {
  // Postgres error lines start with the severity keyword
  const pgMatch = raw.match(/(?:error|hint|detail):\s*(.+)/i);
  if (pgMatch) return pgMatch[1].trim();

  // Drizzle validation errors tend to start after the class name
  const drizzleMatch = raw.match(/^[A-Za-z]+Error:\s*(.+)/);
  if (drizzleMatch) return drizzleMatch[1].trim();

  // Fallback: first line, capped at 120 chars
  const firstLine = raw.split("\n")[0].trim();
  return firstLine.length > 120 ? firstLine.slice(0, 117) + "…" : firstLine;
}
