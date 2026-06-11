import { createFileRoute } from "@tanstack/react-router";
import { localDateKey } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMemo } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({ component: AnalyticsPage });

const PIE = ["#6366f1", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"];

function AnalyticsPage() {
  const { user } = useAuth();
  const uid = user!.id;

  const tables = ["dsa_problems", "sql_problems", "jobs", "aptitude_log", "focus_sessions", "daily_tracker", "interview_prep", "linkedin_posts", "projects", "resumes", "contacts", "skills"];
  const q = useQuery({
    queryKey: ["analytics", uid],
    queryFn: async () => {
      const results: Record<string, any[]> = {};
      await Promise.all(tables.map(async (t) => {
        const { data } = await (supabase as any).from(t).select("*").eq("user_id", uid);
        results[t] = data ?? [];
      }));
      return results;
    },
  });

  const d = q.data ?? {};
  const dsa = d.dsa_problems ?? [];
  const sql = d.sql_problems ?? [];
  const jobs = d.jobs ?? [];
  const apt = d.aptitude_log ?? [];
  const sessions = d.focus_sessions ?? [];
  const daily = d.daily_tracker ?? [];

  const dsaDone = dsa.filter((r: any) => r.status === "solved" || r.status === "done").length;
  const sqlDone = sql.filter((r: any) => r.status === "solved" || r.status === "done").length;
  const applied = jobs.filter((j: any) => j.status !== "saved").length;
  const totalFocus = Math.round(sessions.reduce((a: number, s: any) => a + (s.duration_minutes || 0), 0) / 60 * 10) / 10;

  const last14 = useMemo(() => {
    const arr: any[] = [];
    for (let i = 13; i >= 0; i--) {
      const dt = new Date(); dt.setDate(dt.getDate() - i);
      const key = dt.toISOString().slice(0, 10);
      const day = daily.find((x: any) => x.date === key);
      const focusMin = sessions.filter((s: any) => (s.started_at || "").slice(0, 10) === key).reduce((a: number, s: any) => a + (s.duration_minutes || 0), 0);
      arr.push({ date: key.slice(5), focus: Math.round(focusMin / 60 * 10) / 10, deep: Number(day?.deep_work_hours || 0), apps: day?.applications_count || 0 });
    }
    return arr;
  }, [daily, sessions]);

  const jobsByStatus = useMemo(() => {
    const m = new Map<string, number>();
    jobs.forEach((j: any) => m.set(j.status, (m.get(j.status) || 0) + 1));
    return Array.from(m, ([name, value]) => ({ name, value }));
  }, [jobs]);

  const dsaByTopic = useMemo(() => {
    const m = new Map<string, number>();
    dsa.forEach((r: any) => { if (r.topic) m.set(r.topic, (m.get(r.topic) || 0) + 1); });
    return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [dsa]);

  const aptAccuracy = useMemo(() => {
    const map = new Map<string, { att: number; cor: number }>();
    apt.forEach((r: any) => {
      const cur = map.get(r.category) ?? { att: 0, cor: 0 };
      cur.att += r.questions_attempted || 0; cur.cor += r.questions_correct || 0;
      map.set(r.category, cur);
    });
    return Array.from(map, ([name, v]) => ({ name, accuracy: v.att ? Math.round((v.cor / v.att) * 100) : 0 }));
  }, [apt]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Cross-module trends across prep, applications, and deep work.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Stat label="DSA solved" value={dsaDone} sub={`of ${dsa.length}`} />
        <Stat label="SQL solved" value={sqlDone} sub={`of ${sql.length}`} />
        <Stat label="Applications" value={applied} sub={`${jobs.length} tracked`} />
        <Stat label="Focus hours" value={totalFocus} sub={`${sessions.length} sessions`} />
      </div>

      <div className="card-flat p-4">
        <div className="section-label mb-2">Last 14 days · deep work & applications</div>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={last14}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="focus" stroke="#6366f1" name="Focus hrs" strokeWidth={2} />
              <Line type="monotone" dataKey="deep" stroke="#8b5cf6" name="Deep work hrs" strokeWidth={2} />
              <Line type="monotone" dataKey="apps" stroke="#22c55e" name="Applications" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card-flat p-4">
          <div className="section-label mb-2">Applications pipeline</div>
          <div className="h-56">
            {jobsByStatus.length ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={jobsByStatus} dataKey="value" nameKey="name" innerRadius={40} outerRadius={75}>
                    {jobsByStatus.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </div>
        </div>

        <div className="card-flat p-4">
          <div className="section-label mb-2">DSA topic coverage</div>
          <div className="h-56">
            {dsaByTopic.length ? (
              <ResponsiveContainer>
                <BarChart data={dsaByTopic}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" fontSize={10} angle={-20} textAnchor="end" height={50} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </div>
        </div>
      </div>

      <div className="card-flat p-4">
        <div className="section-label mb-2">Aptitude accuracy by category</div>
        <div className="h-56">
          {aptAccuracy.length ? (
            <ResponsiveContainer>
              <BarChart data={aptAccuracy}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="accuracy" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Stat label="Resumes" value={(d.resumes ?? []).length} />
        <Stat label="Projects" value={(d.projects ?? []).length} />
        <Stat label="Contacts" value={(d.contacts ?? []).length} />
        <Stat label="LinkedIn posts" value={(d.linkedin_posts ?? []).length} />
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: any; sub?: string }) {
  return <div className="card-flat p-4"><div className="section-label">{label}</div><div className="mt-2 text-2xl font-semibold">{value}</div>{sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}</div>;
}
function Empty() { return <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No data yet</div>; }
