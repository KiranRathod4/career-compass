import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Check, Loader2, Sparkles, Target, Calendar, Zap, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BLIND_75, STARTER_SKILLS, TARGET_DOMAINS } from "@/lib/seed-data";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
  head: () => ({ meta: [{ title: "Welcome — Taiyaar" }] }),
});

type FormData = {
  full_name: string;
  college_name: string;
  graduation_year: number;
  placement_start_date: string;
  target_domains: string[];
  daily_dsa_target: number;
  daily_application_target: number;
  daily_deep_work_target: number;
  seed_dsa: boolean;
  seed_skills: boolean;
};

function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user!.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState<FormData>({
    full_name: "",
    college_name: "",
    graduation_year: new Date().getFullYear() + 1,
    placement_start_date: new Date().toISOString().slice(0, 10),
    target_domains: [],
    daily_dsa_target: 3,
    daily_application_target: 2,
    daily_deep_work_target: 6,
    seed_dsa: true,
    seed_skills: true,
  });

  // hydrate once
  if (profile && !form.full_name && profile.full_name) {
    setForm((f) => ({
      ...f,
      full_name: profile.full_name ?? "",
      college_name: profile.college_name ?? "",
      graduation_year: profile.graduation_year ?? f.graduation_year,
      placement_start_date: profile.placement_start_date ?? f.placement_start_date,
      target_domains: profile.target_domains ?? [],
    }));
  }

  const update = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm((f) => ({ ...f, [k]: v }));

  const finish = async () => {
    setBusy(true);
    try {
      // 1. Upsert profile
      const { error: pErr } = await supabase.from("profiles").upsert({
        id: user!.id,
        full_name: form.full_name,
        college_name: form.college_name,
        graduation_year: form.graduation_year,
        placement_start_date: form.placement_start_date,
        target_domains: form.target_domains,
        daily_dsa_target: form.daily_dsa_target,
        daily_application_target: form.daily_application_target,
        daily_deep_work_target: form.daily_deep_work_target,
        onboarded_at: new Date().toISOString(),
      });
      if (pErr) throw pErr;

      // 2. Seed Blind 75
      if (form.seed_dsa) {
        const rows = BLIND_75.map((p) => ({ ...p, user_id: user!.id, status: "todo" }));
        // chunk to avoid payload limit
        for (let i = 0; i < rows.length; i += 30) {
          const slice = rows.slice(i, i + 30);
          const { error } = await supabase.from("dsa_problems").insert(slice);
          if (error) throw error;
        }
      }

      // 3. Seed skills based on domains
      if (form.seed_skills && form.target_domains.length > 0) {
        const seen = new Set<string>();
        const skills: Array<{ user_id: string; name: string; category: string; current_level: number; target_level: number }> = [];
        for (const d of form.target_domains) {
          for (const s of STARTER_SKILLS[d] ?? []) {
            if (seen.has(s.name)) continue;
            seen.add(s.name);
            skills.push({ user_id: user!.id, name: s.name, category: s.category, current_level: 1, target_level: 5 });
          }
        }
        if (skills.length) {
          const { error } = await supabase.from("skills").insert(skills);
          if (error) throw error;
        }
      }

      await qc.invalidateQueries();
      toast.success("Taiyaar ho! Chalo shuru karte hain 🚀");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "Setup failed");
      setBusy(false);
    }
  };

  const steps = [
    {
      icon: Sparkles,
      title: "Taiyaar mein swagat hai",
      subtitle: "Pehle thoda apne baare mein batao",
      content: (
        <div className="space-y-4">
          <Field label="Tumhara naam">
            <input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="Aarav Sharma" className={inputCls} />
          </Field>
          <Field label="College ka naam">
            <input value={form.college_name} onChange={(e) => update("college_name", e.target.value)} placeholder="IIT Bombay" className={inputCls} />
          </Field>
        </div>
      ),
      canNext: form.full_name.trim().length > 1,
    },
    {
      icon: Calendar,
      title: "Timeline kya hai?",
      subtitle: "Kab tak job chahiye, planning isi par hogi",
      content: (
        <div className="space-y-4">
          <Field label="Graduation year">
            <input type="number" min={2024} max={2030} value={form.graduation_year} onChange={(e) => update("graduation_year", Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Placement season kab shuru ho rahi hai?">
            <input type="date" value={form.placement_start_date} onChange={(e) => update("placement_start_date", e.target.value)} className={inputCls} />
          </Field>
        </div>
      ),
      canNext: true,
    },
    {
      icon: Target,
      title: "Kis role ke liye taiyaar ho rahe ho?",
      subtitle: "Ek ya zyada chuno — skills isi hisab se aayengi",
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TARGET_DOMAINS.map((d) => {
            const on = form.target_domains.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => update("target_domains", on ? form.target_domains.filter((x) => x !== d) : [...form.target_domains, d])}
                className={`p-3 rounded-lg border text-left text-sm transition ${on ? "border-primary bg-primary/5 text-primary font-medium" : "border-border hover:bg-accent"}`}
              >
                <div className="flex items-center gap-2">
                  {on && <Check className="h-4 w-4" />}
                  {d}
                </div>
              </button>
            );
          })}
        </div>
      ),
      canNext: form.target_domains.length > 0,
    },
    {
      icon: Zap,
      title: "Daily targets set karo",
      subtitle: "Chhote aur realistic rakho — streak banegi tabhi",
      content: (
        <div className="space-y-5">
          <Slider label="DSA problems / day" value={form.daily_dsa_target} min={1} max={10} onChange={(v) => update("daily_dsa_target", v)} />
          <Slider label="Job applications / day" value={form.daily_application_target} min={1} max={10} onChange={(v) => update("daily_application_target", v)} />
          <Slider label="Deep work hours / day" value={form.daily_deep_work_target} min={1} max={12} onChange={(v) => update("daily_deep_work_target", v)} />
        </div>
      ),
      canNext: true,
    },
    {
      icon: BookOpen,
      title: "Starter content load karein?",
      subtitle: "Time bachega — abhi se grind shuru",
      content: (
        <div className="space-y-3">
          <Toggle
            label="Blind 75 DSA problems"
            sub={`${BLIND_75.length} curated questions — Two Sum se Trie tak`}
            on={form.seed_dsa}
            onChange={(v) => update("seed_dsa", v)}
          />
          <Toggle
            label="Starter skills matrix"
            sub={`${form.target_domains.length} domain ke liye relevant skills`}
            on={form.seed_skills}
            onChange={(v) => update("seed_skills", v)}
          />
        </div>
      ),
      canNext: true,
    },
  ];

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <div className="max-w-xl mx-auto py-6">
      {/* progress */}
      <div className="flex items-center gap-1.5 mb-6">
        {steps.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition ${i <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      <div className="card-flat p-8">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">{current.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{current.subtitle}</p>

        <div className="mt-6">{current.content}</div>

        <div className="mt-8 flex items-center justify-between">
          <button
            disabled={step === 0 || busy}
            onClick={() => setStep((s) => s - 1)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" /> Peeche
          </button>

          <div className="text-xs text-muted-foreground">Step {step + 1} / {steps.length}</div>

          {isLast ? (
            <button
              disabled={busy || !current.canNext}
              onClick={finish}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Taiyaar! <Sparkles className="h-4 w-4" /></>}
            </button>
          ) : (
            <button
              disabled={!current.canNext}
              onClick={() => setStep((s) => s + 1)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              Aage <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Slider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-lg font-semibold text-primary tabular-nums">{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-primary" />
    </div>
  );
}

function Toggle({ label, sub, on, onChange }: { label: string; sub: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`w-full flex items-start justify-between gap-3 p-4 rounded-lg border text-left transition ${on ? "border-primary bg-primary/5" : "border-border hover:bg-accent"}`}
    >
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
      </div>
      <div className={`mt-0.5 h-5 w-5 rounded-md flex items-center justify-center transition shrink-0 ${on ? "bg-primary text-primary-foreground" : "border border-border"}`}>
        {on && <Check className="h-3.5 w-3.5" />}
      </div>
    </button>
  );
}
