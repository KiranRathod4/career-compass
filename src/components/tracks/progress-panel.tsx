import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { CheckSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Topic = { id: string; status: string; section_name: string; topic_name: string; updated_at?: string | null; completed?: boolean };

export function ProgressPanel({ topics }: { topics: Topic[] }) {
  const total = topics.length;
  const completed = topics.filter((t) => t.status === "Completed").length;
  const inProgress = topics.filter((t) => t.status === "In Progress").length;
  const notStarted = total - completed - inProgress;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  const sectionBars = useMemo(() => {
    const map: Record<string, { total: number; done: number }> = {};
    topics.forEach((t) => {
      const s = (map[t.section_name] ??= { total: 0, done: 0 });
      s.total += 1;
      if (t.status === "Completed") s.done += 1;
    });
    return Object.entries(map).map(([name, v]) => ({
      name,
      pct: v.total ? Math.round((v.done / v.total) * 100) : 0,
    }));
  }, [topics]);

  const donutData = [
    { name: "Completed", value: completed, color: "var(--g-6)" },
    { name: "In Progress", value: inProgress, color: "var(--a-5)" },
    { name: "Not Started", value: notStarted, color: "var(--bg-muted)" },
  ].filter((d) => d.value > 0);

  const recent = useMemo(
    () => [...topics]
      .filter((t) => t.updated_at)
      .sort((a, b) => +new Date(b.updated_at!) - +new Date(a.updated_at!))
      .slice(0, 5),
    [topics],
  );

  // Estimated days to complete
  const recentCompletions = topics.filter((t) => {
    if (t.status !== "Completed" || !t.updated_at) return false;
    return Date.now() - +new Date(t.updated_at) < 7 * 86400000;
  }).length;
  const perDay = recentCompletions / 7;
  const remaining = total - completed;
  const daysEstimate = perDay > 0 ? Math.ceil(remaining / perDay) : null;

  return (
    <div className="space-y-5">
      {/* Ring */}
      <div className="card-flat p-5 flex flex-col items-center">
        <RingChart pct={pct} />
        <div className="t-small mt-2">{completed} / {total} topics complete</div>
      </div>

      {/* Section bars */}
      {sectionBars.length > 0 && (
        <div className="card-flat p-5">
          <div className="section-label mb-3">By section</div>
          <div style={{ height: Math.max(120, sectionBars.length * 28) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={sectionBars} margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 11, fill: "var(--text-3)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v.length > 18 ? v.slice(0, 18) + "…" : v)}
                />
                <Bar dataKey="pct" radius={5} background={{ fill: "var(--bg-muted)", radius: 5 } as any} animationDuration={600}>
                  {sectionBars.map((_, i) => <Cell key={i} fill="var(--p-6)" />)}
                  <LabelList />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Donut */}
      {total > 0 && (
        <div className="card-flat p-5">
          <div className="section-label mb-3">Topic status</div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={75} stroke="none">
                  {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {donutData.map((d) => (
              <div key={d.name} className="flex items-center gap-2 t-small">
                <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                <span className="flex-1">{d.name}</span>
                <span style={{ color: "var(--text-2)" }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="card-flat p-5">
        <div className="section-label mb-3">Recent activity</div>
        {recent.length === 0 ? (
          <div className="t-small text-center py-2" style={{ color: "var(--text-3)" }}>No activity yet.</div>
        ) : (
          <div>
            {recent.map((t) => (
              <div key={t.id} className="flex items-center gap-2 h-8">
                <CheckSquare className="h-3 w-3 shrink-0" style={{ color: "var(--text-3)" }} />
                <span className="flex-1 truncate text-[13px]" style={{ color: "var(--text-2)" }}>
                  {t.topic_name.length > 30 ? t.topic_name.slice(0, 30) + "…" : t.topic_name}
                </span>
                <span className="text-[11px] shrink-0" style={{ color: "var(--text-3)" }}>
                  {formatDistanceToNow(new Date(t.updated_at!), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pace estimate */}
      <div className="rounded-[var(--radius-xl)] p-5" style={{ background: "var(--bg-subtle)" }}>
        <div className="section-label mb-1">At your current pace</div>
        {daysEstimate === null ? (
          <div className="t-mono-lg" style={{ color: "var(--p-6)" }}>Start to see estimate</div>
        ) : (
          <>
            <div className="t-mono-lg" style={{ color: "var(--p-6)" }}>{daysEstimate} days to complete</div>
            <div className="t-small mt-1" style={{ color: "var(--text-3)" }}>Based on last 7 days activity</div>
          </>
        )}
      </div>
    </div>
  );
}

function RingChart({ pct }: { pct: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (c * pct) / 100;
  return (
    <svg width={120} height={120} viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border-2)" strokeWidth={8} />
      <circle
        cx="60" cy="60" r={r} fill="none" stroke="var(--p-6)" strokeWidth={8}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 60 60)"
        style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.4, 0, 0.2, 1)" }}
      />
      <text x="60" y="68" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="22" fontWeight="600" fill="var(--text-1)">
        {pct}%
      </text>
    </svg>
  );
}

// recharts LabelList shim that renders the pct value at end of bar
import { LabelList as RLL } from "recharts";
function LabelList() {
  return <RLL dataKey="pct" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: 12, fill: "var(--text-2)" }} />;
}
