import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ExternalLink, Plus, Trash2 } from "lucide-react";

import { SidebarCustomization } from "@/components/sidebar-customization";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

const DOMAINS = ["QA", "DevOps", "Data", "Full Stack", "AI-ML"];

const DEFAULT_LINKS = [
  { name: "LeetCode", url: "https://leetcode.com" },
  { name: "HackerRank", url: "https://hackerrank.com" },
  { name: "LinkedIn", url: "https://linkedin.com" },
  { name: "GitHub", url: "https://github.com" },
  { name: "Naukri", url: "https://naukri.com" },
  { name: "Internshala", url: "https://internshala.com" },
  { name: "Unstop", url: "https://unstop.com" },
  { name: "GeeksforGeeks", url: "https://geeksforgeeks.org" },
  { name: "NeetCode", url: "https://neetcode.io" },
];

function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user!.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });

  const [form, setForm] = useState<any>({});
  useEffect(() => { if (profile) setForm(profile); }, [profile]);

  const save = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await supabase.from("profiles").update(patch).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const links: { name: string; url: string }[] = (form.quick_links?.length ? form.quick_links : DEFAULT_LINKS);
  const [newLink, setNewLink] = useState({ name: "", url: "" });

  const toggleDomain = (d: string) => {
    const cur = form.target_domains ?? [];
    setForm({ ...form, target_domains: cur.includes(d) ? cur.filter((x: string) => x !== d) : [...cur, d] });
  };
  const removeDomain = (d: string) => {
    const cur = form.target_domains ?? [];
    setForm({ ...form, target_domains: cur.filter((x: string) => x !== d) });
  };
  const [newDomain, setNewDomain] = useState("");
  const addCustomDomain = () => {
    const v = newDomain.trim();
    if (!v) return;
    const cur: string[] = form.target_domains ?? [];
    if (cur.some((x) => x.toLowerCase() === v.toLowerCase())) { toast.error("Already added"); return; }
    setForm({ ...form, target_domains: [...cur, v] });
    setNewDomain("");
  };
  const allDomains = Array.from(new Set([...(DOMAINS), ...((form.target_domains ?? []) as string[])]));
  const customDomains = ((form.target_domains ?? []) as string[]).filter((d) => !DOMAINS.includes(d));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="card-flat p-6">
        <div className="section-label mb-4">Profile</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Full Name"><Input value={form.full_name ?? ""} onChange={(v) => setForm({ ...form, full_name: v })} /></Field>
          <Field label="College"><Input value={form.college_name ?? ""} onChange={(v) => setForm({ ...form, college_name: v })} /></Field>
          <Field label="Graduation Year"><Input type="number" value={form.graduation_year ?? ""} onChange={(v) => setForm({ ...form, graduation_year: +v })} /></Field>
          <Field label="Placement Start Date"><Input type="date" value={form.placement_start_date ?? ""} onChange={(v) => setForm({ ...form, placement_start_date: v })} /></Field>
          <Field label="LinkedIn URL"><Input value={form.linkedin_url ?? ""} onChange={(v) => setForm({ ...form, linkedin_url: v })} /></Field>
          <Field label="GitHub URL"><Input value={form.github_url ?? ""} onChange={(v) => setForm({ ...form, github_url: v })} /></Field>
        </div>

        <div className="mt-5">
          <div className="text-[11px] text-muted-foreground mb-2">Target Domains</div>
          <div className="flex gap-2 flex-wrap">
            {allDomains.map((d) => {
              const on = (form.target_domains ?? []).includes(d);
              const isCustom = !DOMAINS.includes(d);
              return (
                <span key={d} className={`inline-flex items-center gap-1 px-3 h-8 rounded-full text-xs border transition ${on ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
                  <button onClick={() => toggleDomain(d)}>{d}</button>
                  {isCustom && (
                    <button onClick={() => removeDomain(d)} className="opacity-70 hover:opacity-100" title="Remove">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
          <div className="flex gap-2 mt-3 max-w-md">
            <Input value={newDomain} onChange={setNewDomain} placeholder="Add custom domain (e.g. AI/ML)" />
            <button onClick={addCustomDomain} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-1 shrink-0"><Plus className="h-3.5 w-3.5" />Add</button>
          </div>
          {customDomains.length > 0 && (
            <div className="text-[11px] text-muted-foreground mt-2">{customDomains.length} custom · click chip to toggle, trash to delete</div>
          )}
        </div>
      </div>

      <div className="card-flat p-6">
        <div className="section-label mb-4">Daily Targets</div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="DSA / day"><Input type="number" value={form.daily_dsa_target ?? 5} onChange={(v) => setForm({ ...form, daily_dsa_target: +v })} /></Field>
          <Field label="Applications / day"><Input type="number" value={form.daily_application_target ?? 2} onChange={(v) => setForm({ ...form, daily_application_target: +v })} /></Field>
          <Field label="Deep work (hrs)"><Input type="number" step="0.5" value={form.daily_deep_work_target ?? 6} onChange={(v) => setForm({ ...form, daily_deep_work_target: +v })} /></Field>
        </div>
      </div>

      <div className="card-flat p-6">
        <div className="section-label mb-4">Public Portfolio</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Username (for taiyaar.co.in/u/&lt;name&gt;)">
            <Input value={form.username ?? ""} onChange={(v) => setForm({ ...form, username: v.toLowerCase().replace(/[^a-z0-9_-]/g, "") })} placeholder="e.g. rahul-cse" />
          </Field>
          <Field label="Show on public leaderboard?">
            <div className="flex items-center gap-2 h-9">
              <button onClick={() => setForm({ ...form, leaderboard_opt_in: !form.leaderboard_opt_in })}
                className={`h-6 w-10 rounded-full transition relative ${form.leaderboard_opt_in ? "bg-primary" : "bg-muted"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-all ${form.leaderboard_opt_in ? "left-[18px]" : "left-0.5"}`} />
              </button>
              <span className="text-xs text-muted-foreground">{form.leaderboard_opt_in ? "Haan, dikhao" : "Private hai"}</span>
            </div>
          </Field>
        </div>
      </div>

      <div className="card-flat p-6">
        <div className="section-label mb-4">Study Windows (Arena Break-Time Enforcer)</div>
        <StudyWindowsEditor windows={form.study_windows ?? []} onChange={(w) => setForm({ ...form, study_windows: w })} />
      </div>

      <SidebarCustomization
        initialPrepare={profile?.sidebar_prepare_items as string[] | null}
        initialOrder={profile?.sidebar_section_order as string[] | null}
      />



      <div className="card-flat p-6">
        <div className="section-label mb-4">Quick Links</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {links.map((l, i) => (
            <div key={i} className="flex items-center gap-1.5 border border-border rounded-md px-2 h-9">
              <a href={l.url} target="_blank" rel="noopener" className="flex-1 text-sm truncate hover:text-primary flex items-center gap-1.5"><ExternalLink className="h-3 w-3" />{l.name}</a>
              <button onClick={() => setForm({ ...form, quick_links: links.filter((_, x) => x !== i) })} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <Input value={newLink.name} onChange={(v) => setNewLink({ ...newLink, name: v })} placeholder="Name" />
          <Input value={newLink.url} onChange={(v) => setNewLink({ ...newLink, url: v })} placeholder="https://…" />
          <button onClick={() => { if (newLink.name && newLink.url) { setForm({ ...form, quick_links: [...links, newLink] }); setNewLink({ name: "", url: "" }); } }} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm flex items-center gap-1"><Plus className="h-3.5 w-3.5" />Add</button>
        </div>
      </div>

      <div className="flex justify-end">
        <button disabled={save.isPending} onClick={() => save.mutate({
          full_name: form.full_name, college_name: form.college_name, graduation_year: form.graduation_year,
          target_domains: form.target_domains, placement_start_date: form.placement_start_date || null,
          linkedin_url: form.linkedin_url, github_url: form.github_url,
          daily_dsa_target: form.daily_dsa_target, daily_application_target: form.daily_application_target,
          daily_deep_work_target: form.daily_deep_work_target, quick_links: form.quick_links,
          username: form.username || null, leaderboard_opt_in: !!form.leaderboard_opt_in,
          study_windows: form.study_windows ?? [],
        })} className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
          {save.isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[11px] text-muted-foreground">{label}</span><div className="mt-0.5">{children}</div></label>;
}
function Input({ onChange, ...p }: { onChange?: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  return <input {...p} onChange={(e) => onChange?.(e.target.value)} className="w-full h-9 px-2.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />;
}

type StudyWindow = { day: string; start: string; end: string };
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function StudyWindowsEditor({ windows, onChange }: { windows: StudyWindow[]; onChange: (w: StudyWindow[]) => void }) {
  const add = () => onChange([...(windows ?? []), { day: "Mon", start: "09:00", end: "12:00" }]);
  const update = (i: number, patch: Partial<StudyWindow>) =>
    onChange(windows.map((w, x) => (x === i ? { ...w, ...patch } : w)));
  const remove = (i: number) => onChange(windows.filter((_, x) => x !== i));

  return (
    <div className="space-y-2">
      {(windows ?? []).length === 0 && (
        <div className="text-xs text-muted-foreground">No study windows set. Add one so the Arena unlocks during break time.</div>
      )}
      {(windows ?? []).map((w, i) => (
        <div key={i} className="flex items-center gap-2">
          <select value={w.day} onChange={(e) => update(i, { day: e.target.value })}
            className="h-9 px-2 rounded-md border border-border bg-background text-sm">
            {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <Input type="time" value={w.start} onChange={(v) => update(i, { start: v })} />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="time" value={w.end} onChange={(v) => update(i, { end: v })} />
          <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button onClick={add} className="h-8 px-3 rounded-md border border-border text-xs flex items-center gap-1 hover:bg-accent">
        <Plus className="h-3 w-3" /> Add window
      </button>
    </div>
  );
}
