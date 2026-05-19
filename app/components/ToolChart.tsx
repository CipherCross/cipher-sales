"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ── Color palette ──────────────────────────────────────────────────────────
const COLORS = [
  "#06b6d4", // cyan-500
  "#818cf8", // indigo-400
  "#34d399", // emerald-400
  "#fbbf24", // amber-400
  "#f472b6", // pink-400
  "#a78bfa", // violet-400
  "#fb923c", // orange-400
  "#38bdf8", // sky-400
];

const GRID_COLOR = "rgba(255,255,255,0.04)";
const AXIS_COLOR = "rgba(161,161,170,0.5)";

// ── Tooltip styling ────────────────────────────────────────────────────────
const tooltipStyle = {
  contentStyle: {
    backgroundColor: "rgba(24,24,27,0.95)",
    border: "1px solid rgba(6,182,212,0.15)",
    borderRadius: "0.75rem",
    fontSize: "0.8rem",
    color: "#e4e4e7",
    backdropFilter: "blur(8px)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
  },
  itemStyle: { color: "#e4e4e7" },
  labelStyle: { color: "#a1a1aa", fontWeight: 600, marginBottom: 4 },
};

// ── Chart type detection from tool name + result shape ─────────────────────

type ChartConfig =
  | { type: "bar"; data: Record<string, unknown>[]; xKey: string; bars: string[] }
  | { type: "stacked-bar"; data: Record<string, unknown>[]; xKey: string; bars: string[] }
  | { type: "line"; data: Record<string, unknown>[]; xKey: string; lines: string[] }
  | { type: "pie"; data: Record<string, unknown>[]; nameKey: string; valueKey: string }
  | { type: "funnel-bar"; data: Record<string, unknown>[]; xKey: string; valueKey: string }
  | null;

export function detectChart(toolName: string, result: unknown): ChartConfig {
  if (!result || typeof result !== "object") return null;

  // ── getCampaignFunnel → horizontal funnel bar ────────────────────────
  if (toolName === "getCampaignFunnel" && Array.isArray(result) && result.length > 0) {
    return { type: "funnel-bar", data: result, xKey: "status", valueKey: "count" };
  }

  // ── compareHookPerformance → grouped bar (total vs replied) ──────────
  if (toolName === "compareHookPerformance" && Array.isArray(result) && result.length > 0) {
    return { type: "bar", data: result, xKey: "hookType", bars: ["total", "replied"] };
  }

  // ── compareCampaigns → bar chart ─────────────────────────────────────
  if (toolName === "compareCampaigns" && Array.isArray(result) && result.length > 0) {
    return { type: "bar", data: result, xKey: "campaignName", bars: ["connectPct", "replyPct"] };
  }

  // ── getResponseBreakdown → pie chart ─────────────────────────────────
  if (toolName === "getResponseBreakdown" && Array.isArray(result) && result.length > 0) {
    // Aggregate to category level for pie
    const categoryMap: Record<string, number> = {};
    for (const r of result as { category: string; count: number }[]) {
      categoryMap[r.category] = (categoryMap[r.category] || 0) + r.count;
    }
    const pieData = Object.entries(categoryMap).map(([category, count]) => ({ category, count }));
    return { type: "pie", data: pieData, nameKey: "category", valueKey: "count" };
  }

  // ── getMessageSequenceEffectiveness → bar ────────────────────────────
  if (toolName === "getMessageSequenceEffectiveness" && Array.isArray(result) && result.length > 0) {
    return { type: "bar", data: result, xKey: "messageNumber", bars: ["replyCount"] };
  }

  // ── getOutreachTimeline → line chart ─────────────────────────────────
  if (toolName === "getOutreachTimeline" && Array.isArray(result) && result.length > 0) {
    const data = (result as { period: string; connections: number; replies: number }[]).map((r) => ({
      ...r,
      period: typeof r.period === "string" ? r.period.slice(0, 10) : String(r.period),
    }));
    return { type: "line", data, xKey: "period", lines: ["connections", "replies"] };
  }

  // ── getIndustryPerformance → bar ─────────────────────────────────────
  if (toolName === "getIndustryPerformance" && Array.isArray(result) && result.length > 0) {
    const first = result[0] as Record<string, unknown>;
    const xKey = "industry" in first ? "industry" : "aiNiche";
    return { type: "bar", data: result, xKey, bars: ["connectPct", "replyPct"] };
  }

  // ── getGeographyPerformance → bar ────────────────────────────────────
  if (toolName === "getGeographyPerformance" && Array.isArray(result) && result.length > 0) {
    return { type: "bar", data: result, xKey: "country", bars: ["connectPct", "replyPct"] };
  }

  // ── getLeadPipeline summary → stacked bar ───────────────────────────
  if (toolName === "getLeadPipeline" && Array.isArray(result) && result.length > 0) {
    const first = result[0] as Record<string, unknown>;
    if ("stage" in first && "leadStatus" in first) {
      return { type: "stacked-bar", data: result, xKey: "stage", bars: ["count"] };
    }
  }

  // ── Upwork bids funnel → funnel bar ──────────────────────────────────
  if (toolName === "getUpworkBidsFunnel" && !Array.isArray(result)) {
    const r = result as Record<string, unknown>;
    const funnelData = [
      { stage: "Sent", count: Number(r.sent) },
      { stage: "Viewed", count: Number(r.viewed) },
      { stage: "Replied", count: Number(r.replied) },
      { stage: "Interviews", count: Number(r.interviews) },
    ];
    return { type: "funnel-bar", data: funnelData, xKey: "stage", valueKey: "count" };
  }

  // ── Upwork bid performance → bar ─────────────────────────────────────
  if (toolName === "getUpworkBidPerformance" && Array.isArray(result) && result.length > 0) {
    const first = result[0] as Record<string, unknown>;
    const xKey = Object.keys(first).find(
      (k) => !["sent", "viewed", "replied", "interviews", "viewPct", "replyPct", "avgConnectsSpent"].includes(k),
    );
    return { type: "bar", data: result, xKey: xKey || "dimension", bars: ["viewPct", "replyPct"] };
  }

  // ── Upwork outreach pipeline → funnel bar ────────────────────────────
  if (toolName === "getUpworkOutreachPipeline" && !Array.isArray(result)) {
    const r = result as { stageBreakdown?: { stage: string; count: number }[] };
    if (r.stageBreakdown && r.stageBreakdown.length > 0) {
      return { type: "funnel-bar", data: r.stageBreakdown, xKey: "stage", valueKey: "count" };
    }
  }

  // ── Upwork bids time trend → line chart ──────────────────────────────
  if (toolName === "getUpworkBidsTrend" && Array.isArray(result) && result.length > 0) {
    return { type: "line", data: result, xKey: "period", lines: ["sent", "viewed", "replied"] };
  }

  // ── Cross-channel summary → bar comparing channels ───────────────────
  if (toolName === "getCrossChannelSummary" && !Array.isArray(result)) {
    const r = result as {
      linkedin?: { replyRatePct: number };
      upworkBids?: { replyRatePct: number };
      upworkOutreach?: { total: number; replied: number };
    };
    if (r.linkedin && r.upworkBids && r.upworkOutreach) {
      const uoReplyRate =
        r.upworkOutreach.total > 0 ? +((r.upworkOutreach.replied / r.upworkOutreach.total) * 100).toFixed(1) : 0;
      const data = [
        { channel: "LinkedIn", replyRatePct: r.linkedin.replyRatePct },
        { channel: "Upwork Bids", replyRatePct: r.upworkBids.replyRatePct },
        { channel: "Upwork Outreach", replyRatePct: uoReplyRate },
      ];
      return { type: "bar", data, xKey: "channel", bars: ["replyRatePct"] };
    }
  }

  return null;
}

// ── Main chart renderer ────────────────────────────────────────────────────

interface ToolChartProps {
  toolName: string;
  result: unknown;
}

export default function ToolChart({ toolName, result }: ToolChartProps) {
  const config = detectChart(toolName, result);
  if (!config) return null;

  const chartHeight = config.data.length > 10 ? 400 : 300;

  switch (config.type) {
    case "funnel-bar":
      return (
        <div className="my-3 rounded-xl border border-cyan-500/10 bg-zinc-900/60 p-4">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={config.data} layout="vertical" margin={{ left: 20, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
              <XAxis type="number" tick={{ fill: AXIS_COLOR, fontSize: 12 }} />
              <YAxis type="category" dataKey={config.xKey} tick={{ fill: AXIS_COLOR, fontSize: 12 }} width={120} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey={config.valueKey} radius={[0, 6, 6, 0]}>
                {config.data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      );

    case "bar":
      return (
        <div className="my-3 rounded-xl border border-cyan-500/10 bg-zinc-900/60 p-4">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={config.data} margin={{ left: 10, right: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis
                dataKey={config.xKey}
                tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                angle={-35}
                textAnchor="end"
                interval={0}
                height={60}
              />
              <YAxis tick={{ fill: AXIS_COLOR, fontSize: 12 }} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "0.75rem", color: "#a1a1aa" }} />
              {config.bars.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={COLORS[i % COLORS.length]}
                  fillOpacity={0.85}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      );

    case "stacked-bar":
      return (
        <div className="my-3 rounded-xl border border-cyan-500/10 bg-zinc-900/60 p-4">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={config.data} margin={{ left: 10, right: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis
                dataKey={config.xKey}
                tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                angle={-35}
                textAnchor="end"
                interval={0}
                height={60}
              />
              <YAxis tick={{ fill: AXIS_COLOR, fontSize: 12 }} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "0.75rem", color: "#a1a1aa" }} />
              {config.bars.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="a"
                  fill={COLORS[i % COLORS.length]}
                  fillOpacity={0.85}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      );

    case "line":
      return (
        <div className="my-3 rounded-xl border border-cyan-500/10 bg-zinc-900/60 p-4">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={config.data} margin={{ left: 10, right: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis
                dataKey={config.xKey}
                tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                angle={-35}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fill: AXIS_COLOR, fontSize: 12 }} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "0.75rem", color: "#a1a1aa" }} />
              {config.lines.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: COLORS[i % COLORS.length], r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, stroke: COLORS[i % COLORS.length], strokeWidth: 2, fill: "#18181b" }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      );

    case "pie":
      return (
        <div className="my-3 rounded-xl border border-cyan-500/10 bg-zinc-900/60 p-4">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={config.data}
                dataKey={config.valueKey}
                nameKey={config.nameKey}
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={50}
                strokeWidth={0}
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={{ stroke: "rgba(161,161,170,0.3)" }}
              >
                {config.data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "0.75rem", color: "#a1a1aa" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );

    default:
      return null;
  }
}
