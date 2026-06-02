import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { aiProbability } from "@/lib/ai.functions";
import { EliteGate } from "@/components/elite-gate";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, CheckCircle2, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/probability")({ component: ProbabilityPage });

type Result = {
  probability: number;
  confidence: "low" | "medium" | "high";
  strengths: string[];
  gaps: string[];
  next_actions: string[];
};

function ProbabilityPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <EliteGate
        variant="card"
        feature="Placement Probability"
        description="An honest, evidence-based estimate of your odds — updated from your real activity, applications and skill profile."
      >
        <ProbabilityContent />
      </EliteGate>
    </div>
  );
}

function ProbabilityContent() {
  const { user } = useAuth();
  const run = useServerFn(aiProbability);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: snapshot } = useQuery({
    queryKey: ["prob-snapshot", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const uid = user!.id;
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [profile, dsa, apps, jobs, projects, skills, interviews, focus] = await Promise.all([
        supabase.from("profiles").select("graduation_year, target_domains, daily_dsa_target, daily_application_target").eq("id", uid).maybeSingle(),
        supabase.from("dsa_problems").select("difficulty,status").eq("user_id", uid),
        supabase.from("jobs").select("status,applied_at").eq("user_id", uid).gte("applied_at", since.slice(0, 10)),
        supabase.from("jobs").select("status").eq("user_id", uid),
        supabase.from("projects").select("status").eq("user_id", uid),
        supabase.from("skills").select("name,current_level,target_level").eq("user_id", uid),
        supabase.from("interview_prep").select("confidence,category").eq("user_id", uid),
        supabase.from("focus_sessions").select("duration_minutes,completed").eq("user_id", uid).gte("started_at", since),
      ]);
      return { profile: profile.data, dsa: dsa.data ?? [], apps30: apps.data ?? [], jobsAll: jobs.data ?? [], projects: projects.data ?? [], skills: skills.data ?? [], interviews: interviews.data ?? [], focus: focus.data ?? [] };
    },
  });

  const buildContext = (): string => {
    if (!snapshot) return "";
    const s = snapshot;
    const dsaDone = s.dsa.filter((d: any) => d.status === "done").length;
    const dsaByDiff = (k: string) => s.dsa.filter((d: any) => d.status === "done" && (d.difficulty || "").toLowerCase() === k).length;
    const focusHrs = Math.round(s.focus.filter((f: any) => f.completed).reduce((a: number, f: any) => a + (f.duration_minutes || 0), 0) / 60);
    const shipped = s.projects.filter((p: any) => p.status === "shipped" || p.status === "deployed").length;
    const interviewsByConfidence = s.interviews.reduce((acc: Record<number, number>, i: any) => { acc[i.confidence] = (acc[i.confidence] || 0) + 1; return acc; }, {});
    return [
      `Graduation year: ${s.profile?.graduation_year ?? "unknown"}`,
      `Target domains: ${(s.profile?.target_domains ?? []).join(", ") || "not set"}`,
      `DSA solved total: ${dsaDone} (easy: ${dsaByDiff("easy")}, medium: ${dsaByDiff("medium")}, hard: ${dsaByDiff("hard")})`,
      `Applications in last 30 days: ${s.apps30.length}`,
      `Total jobs tracked: ${s.jobsAll.length}; interview stage: ${s.jobsAll.filter((j: any) => ["interview", "offer"].includes(j.status)).length}`,
      `Projects shipped/deployed: ${shipped} of ${s.projects.length}`,
      `Skills tracked: ${s.skills.length}; near target (>=80%): ${s.skills.filter((sk: any) => sk.current_level / Math.max(1, sk.target_level) >= 0.8).length}`,
      `Interview prep entries: ${s.interviews.length}; high-confidence (4-5): ${(interviewsByConfidence[4] || 0) + (interviewsByConfidence[5] || 0)}`,
      `Focus hours (last 30d): ${focusHrs}`,
    ].join("\n");
  };

  const compute = async () => {
    setLoading(true);
    try {
      const r = await run({ data: { context: buildContext() } });
      setResult(r as Result);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not compute probability");
    } finally {
      setLoading(false);
    }
  };

  const score = result?.probability ?? 0;
  const tone = score >= 70 ? "text-emerald-500" : score >= 40 ? "text-amber-500" : "text-rose-500";
  const band = score >= 70 ? "On track" : score >= 40 ? "Building momentum" : "Needs focus";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Placement Probability</h1>
            <Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" /> Elite</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            A calibrated estimate of your offer odds based on your actual progress — not vibes. Re-run anytime your profile shifts.
          </p>
        </div>
        <Button onClick={compute} disabled={loading || !snapshot}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-2" />}
          {result ? "Recompute" : "Compute my score"}
        </Button>
      </div>

      {!result && !loading && (
        <div className="card-flat p-10 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center mx-auto mb-4">
            <TrendingUp className="h-7 w-7 text-primary" />
          </div>
          <h3 className="font-semibold">Ready when you are</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            We'll pull your DSA, applications, projects, skills and prep activity, then return a calibrated score with concrete next steps.
          </p>
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card-flat p-6 lg:col-span-1 text-center">
            <div className="section-label">Offer probability</div>
            <div className={`text-7xl font-bold font-mono mt-3 ${tone}`}>{score}<span className="text-2xl text-muted-foreground">%</span></div>
            <div className="text-sm font-medium mt-1">{band}</div>
            <div className="mt-4">
              <Progress value={score} />
            </div>
            <div className="text-xs text-muted-foreground mt-3">
              Confidence: <span className="font-medium capitalize">{result.confidence}</span>
            </div>
          </div>

          <div className="card-flat p-6 lg:col-span-2 space-y-5">
            <Section title="Strengths" icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} items={result.strengths} />
            <Section title="Gaps" icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} items={result.gaps} />
            <div>
              <div className="flex items-center gap-2 mb-2"><ArrowRight className="h-4 w-4 text-primary" /><div className="section-label">Next actions</div></div>
              <ol className="space-y-2">
                {result.next_actions.map((a, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-semibold grid place-items-center shrink-0">{i + 1}</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, items }: { title: string; icon: React.ReactNode; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">{icon}<div className="section-label">{title}</div></div>
      <ul className="space-y-1.5">
        {items.map((s, i) => <li key={i} className="text-sm text-foreground/90">• {s}</li>)}
      </ul>
    </div>
  );
}
