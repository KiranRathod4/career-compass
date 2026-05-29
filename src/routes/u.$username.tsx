import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicPortfolio } from "@/lib/portfolio.functions";
import { Trophy, Code, Briefcase, Github, Linkedin, GraduationCap, Sparkles, Award, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/u/$username")({
  component: PortfolioPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.username} — Taiyaar Portfolio` },
      { name: "description", content: `${params.username}'s placement prep journey on Taiyaar.` },
      { property: "og:title", content: `${params.username} on Taiyaar` },
      { property: "og:description", content: "Placement prep portfolio: XP, badges, projects, DSA progress." },
    ],
  }),
});

function PortfolioPage() {
  const { username } = Route.useParams();
  const fetchFn = useServerFn(getPublicPortfolio);
  const { data, isLoading, error } = useQuery({
    queryKey: ["portfolio", username],
    queryFn: () => fetchFn({ data: { username } }),
    retry: false,
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading portfolio…</div>;
  if (error || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-semibold">Portfolio not found</h1>
      <p className="text-sm text-muted-foreground">No public Taiyaar portfolio at @{username}.</p>
      <Link to="/" className="text-sm text-primary underline">Go home</Link>
    </div>
  );

  const { profile, level, totalXP, badges, projects, skills, stats, heatmap } = data as any;
  const lvl = level as any;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Taiyaar Portfolio · @{profile.username}
            </div>
            <h1 className="mt-1 text-3xl font-semibold">{profile.full_name || profile.username}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {profile.college_name && <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />{profile.college_name}</span>}
              {profile.graduation_year && <span>Class of {profile.graduation_year}</span>}
              {profile.linkedin_url && <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary"><Linkedin className="h-3.5 w-3.5" />LinkedIn</a>}
              {profile.github_url && <a href={profile.github_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary"><Github className="h-3.5 w-3.5" />GitHub</a>}
            </div>
          </div>
          <div className="card-flat px-4 py-3 min-w-[200px]">
            <div className="text-[11px] text-muted-foreground">Level {lvl?.level ?? 1} · {lvl?.name ?? "Fresher"}</div>
            <div className="text-2xl font-semibold mt-1">{totalXP.toLocaleString()} XP</div>
            <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${Math.min(100, lvl?.progress_pct ?? 0)}%` }} />
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon={Code} label="DSA Solved" value={stats.dsaSolved} />
          <Stat icon={Briefcase} label="Applications" value={stats.appsTotal} />
          <Stat icon={Trophy} label="Interviews" value={stats.interviews} />
          <Stat icon={Award} label="Offers" value={stats.offers} accent="text-success" />
        </section>

        <section>
          <h2 className="section-label mb-3">Consistency · last 365 days</h2>
          <Heatmap data={heatmap} />
        </section>

        {badges.length > 0 && (
          <section>
            <h2 className="section-label mb-3">Badges</h2>
            <div className="flex flex-wrap gap-2">
              {badges.map((b: any) => (
                <span key={b.badge_id} className="px-2.5 py-1 rounded-md bg-accent text-xs font-medium">🏅 {b.badge_id}</span>
              ))}
            </div>
          </section>
        )}

        {projects.length > 0 && (
          <section>
            <h2 className="section-label mb-3">Projects</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {projects.map((p: any, i: number) => (
                <div key={i} className="card-flat p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium">{p.title}</h3>
                    <div className="flex gap-1">
                      {p.repo_url && <a href={p.repo_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary"><Github className="h-3.5 w-3.5" /></a>}
                      {p.demo_url && <a href={p.demo_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary"><ExternalLink className="h-3.5 w-3.5" /></a>}
                    </div>
                  </div>
                  {p.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(p.tech_stack || []).slice(0, 6).map((t: string) => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {skills.length > 0 && (
          <section>
            <h2 className="section-label mb-3">Skills</h2>
            <div className="grid md:grid-cols-2 gap-2">
              {skills.map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between card-flat px-3 py-2">
                  <span className="text-sm">{s.name}</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div key={n} className={`h-2 w-3 rounded-sm ${n <= s.current_level ? "bg-primary" : "bg-muted"}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="pt-6 border-t border-border text-center text-xs text-muted-foreground">
          Built on <Link to="/" className="text-primary font-medium">Taiyaar</Link> — AI-powered placement prep for Indian engineering students.
        </footer>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: any; accent?: string }) {
  return (
    <div className="card-flat p-4">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent ?? ""}`}>{value}</div>
    </div>
  );
}

function Heatmap({ data }: { data: Record<string, number> }) {
  const days: { date: string; v: number }[] = [];
  const end = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, v: data[key] ?? 0 });
  }
  const weeks: { date: string; v: number }[][] = [];
  let cur: { date: string; v: number }[] = [];
  days.forEach((d, i) => {
    cur.push(d);
    if (cur.length === 7 || i === days.length - 1) { weeks.push(cur); cur = []; }
  });
  const intensity = (v: number) => v <= 0 ? "bg-muted" : v < 1 ? "bg-primary/20" : v < 3 ? "bg-primary/40" : v < 5 ? "bg-primary/70" : "bg-primary";
  return (
    <div className="flex gap-[2px] overflow-x-auto pb-1">
      {weeks.map((w, i) => (
        <div key={i} className="flex flex-col gap-[2px]">
          {w.map((d) => (
            <div key={d.date} title={`${d.date}: ${d.v}h`} className={`h-2.5 w-2.5 rounded-[2px] ${intensity(d.v)}`} />
          ))}
        </div>
      ))}
    </div>
  );
}
