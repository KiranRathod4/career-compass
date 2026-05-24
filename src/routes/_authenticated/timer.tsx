import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Pause, RotateCcw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { format, subDays } from "date-fns";
import { useReward, BadgeUnlockModal } from "@/hooks/use-reward";

export const Route = createFileRoute("/_authenticated/timer")({ component: TimerPage });

const MODES = [
  { id: "pomodoro", label: "Pomodoro", min: 25 },
  { id: "deep", label: "Deep Work", min: 50 },
  { id: "short", label: "Short Break", min: 5 },
  { id: "long", label: "Long Break", min: 15 },
];

const CATEGORIES = ["DSA","Aptitude","SQL","DevOps","QA","Job Applications","Projects","Other"];

function TimerPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { reward, unlocked, closeUnlock } = useReward();
  const [mode, setMode] = useState(MODES[0]);
  const [remaining, setRemaining] = useState(MODES[0].min * 60);
  const [running, setRunning] = useState(false);
  const [task, setTask] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const startRef = useRef<Date | null>(null);

  useEffect(() => { setRemaining(mode.min * 60); setRunning(false); }, [mode]);

  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(i);
  }, [running]);

  const saveSession = useMutation({
    mutationFn: async (completed: boolean) => {
      if (!startRef.current) return null;
      const dur = Math.round((Date.now() - startRef.current.getTime()) / 60000);
      if (dur < 1) return null;
      await supabase.from("focus_sessions").insert({
        user_id: user!.id, started_at: startRef.current.toISOString(),
        duration_minutes: dur, mode: mode.id, task, category, completed,
      });
      return { dur, completed };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      if (res?.completed && res.dur >= 1) {
        const xp = res.dur >= 45 ? 30 : res.dur >= 20 ? 20 : 10;
        reward("focus_session", xp, { confetti: true, metadata: { minutes: res.dur, mode: mode.id } });
      }
    },
  });

  useEffect(() => {
    if (running && remaining === 0) {
      setRunning(false);
      saveSession.mutate(true);
      startRef.current = null;
    }
  }, [remaining, running]);

  const start = () => { if (!startRef.current) startRef.current = new Date(); setRunning(true); };
  const pause = () => setRunning(false);
  const reset = () => {
    if (startRef.current) saveSession.mutate(false);
    setRunning(false); setRemaining(mode.min * 60); startRef.current = null;
  };

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions", user!.id],
    queryFn: async () => {
      const since = subDays(new Date(), 7).toISOString();
      const { data } = await supabase.from("focus_sessions").select("*").eq("user_id", user!.id).gte("started_at", since).order("started_at", { ascending: false });
      return data ?? [];
    },
  });

  const today = format(new Date(), "yyyy-MM-dd");
  const todaySessions = sessions.filter((s: any) => s.started_at.startsWith(today));
  const totalToday = todaySessions.reduce((s: number, x: any) => s + x.duration_minutes, 0);

  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const key = format(d, "yyyy-MM-dd");
    const mins = sessions.filter((s: any) => s.started_at.startsWith(key)).reduce((sum: number, s: any) => sum + s.duration_minutes, 0);
    return { day: format(d, "EEE"), hours: +(mins / 60).toFixed(1) };
  });

  const totalSec = mode.min * 60;
  const pct = ((totalSec - remaining) / totalSec) * 100;
  const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");
  const r = 120, c = 2 * Math.PI * r;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <BadgeUnlockModal badge={unlocked} onClose={closeUnlock} />
      <div className="card-flat p-8">
        <div className="flex gap-2 justify-center mb-6 flex-wrap">
          {MODES.map((m) => (
            <button key={m.id} onClick={() => setMode(m)}
              className={`px-4 h-8 rounded-full text-xs font-medium border transition ${mode.id === m.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex justify-center my-6">
          <svg width="280" height="280" viewBox="0 0 280 280" className="-rotate-90">
            <circle cx="140" cy="140" r={r} fill="none" stroke="var(--color-border)" strokeWidth="6" />
            <circle cx="140" cy="140" r={r} fill="none" stroke="var(--color-primary)" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} style={{ transition: "stroke-dashoffset 1s linear" }} />
          </svg>
          <div className="absolute flex flex-col items-center justify-center" style={{ width: 280, height: 280 }}>
            <div className="text-5xl font-semibold tabular-nums">{mm}:{ss}</div>
            <div className="text-xs text-muted-foreground mt-1">Session {todaySessions.length + (running ? 1 : 0)}</div>
          </div>
        </div>

        <div className="max-w-md mx-auto space-y-3">
          <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="What are you working on?"
            className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <div className="flex gap-2 justify-center pt-2">
            {!running ? (
              <button onClick={start} className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2"><Play className="h-4 w-4" /> Start</button>
            ) : (
              <button onClick={pause} className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2"><Pause className="h-4 w-4" /> Pause</button>
            )}
            <button onClick={reset} className="h-10 px-4 rounded-md border border-border text-sm flex items-center gap-2"><RotateCcw className="h-4 w-4" /> Reset</button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card-flat p-4">
          <div className="section-label">Today Total</div>
          <div className="text-2xl font-semibold mt-2 tabular-nums">{(totalToday / 60).toFixed(1)}<span className="text-sm text-muted-foreground"> hrs</span></div>
        </div>
        <div className="card-flat p-4">
          <div className="section-label">Sessions Today</div>
          <div className="text-2xl font-semibold mt-2 tabular-nums">{todaySessions.length}</div>
        </div>
        <div className="card-flat p-4">
          <div className="section-label">Week Avg</div>
          <div className="text-2xl font-semibold mt-2 tabular-nums">{(weekData.reduce((s, d) => s + d.hours, 0) / 7).toFixed(1)}<span className="text-sm text-muted-foreground"> hrs</span></div>
        </div>
      </div>

      <div className="card-flat p-4">
        <div className="section-label mb-3">Weekly Deep Work</div>
        <div className="h-48">
          <ResponsiveContainer>
            <BarChart data={weekData}>
              <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
              <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <ReferenceLine y={6} stroke="var(--color-muted-foreground)" strokeDasharray="3 3" />
              <Bar dataKey="hours" fill="var(--color-primary)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-flat p-4">
        <div className="section-label mb-3">Today's Sessions</div>
        {todaySessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No sessions yet today.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="font-normal py-2">Started</th><th className="font-normal">Duration</th><th className="font-normal">Task</th><th className="font-normal">Category</th>
              </tr>
            </thead>
            <tbody>
              {todaySessions.map((s: any) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="py-2 tabular-nums">{format(new Date(s.started_at), "HH:mm")}</td>
                  <td>{s.duration_minutes}m</td>
                  <td>{s.task || "—"}</td>
                  <td className="text-muted-foreground">{s.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
