import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { X, ExternalLink, Copy, Sparkles, Trophy, Code, Briefcase, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useXP } from "@/hooks/use-gamification";
import { snapshotLeaderboards } from "@/lib/leaderboard.functions";
import { toast } from "sonner";

export function PortfolioDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { data: level } = useXP();
  const snapshot = useServerFn(snapshotLeaderboards);
  const [snapshotting, setSnapshotting] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["drawer-profile", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("username, full_name, college_name").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["drawer-counts", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const [dsa, jobs, badges] = await Promise.all([
        supabase.from("dsa_problems").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("status", "done"),
        supabase.from("jobs").select("id, status", { count: "exact" }).eq("user_id", user!.id),
        supabase.from("user_badges").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);
      const j = jobs.data ?? [];
      return {
        dsa: dsa.count ?? 0,
        apps: jobs.count ?? 0,
        interviews: j.filter((x: any) => ["interview", "offer"].includes(x.status)).length,
        badges: badges.count ?? 0,
      };
    },
  });

  if (!open) return null;
  const username = (profile as any)?.username;
  const portfolioUrl = username ? `${typeof window !== "undefined" ? window.location.origin : ""}/u/${username}` : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-background border-l border-border z-50 overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold">Your Portfolio</h2>
          <button onClick={onClose} className="h-7 w-7 rounded hover:bg-accent flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-5">
          <div className="card-flat p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-primary" />Level {level?.level ?? 1} · {level?.name ?? "Fresher"}</div>
            <div className="text-2xl font-semibold mt-1">{(level?.xp ?? 0).toLocaleString()} XP</div>
            <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${Math.min(100, level?.progress_pct ?? 0)}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Mini icon={Code} label="DSA" value={counts?.dsa ?? 0} />
            <Mini icon={Briefcase} label="Apps" value={counts?.apps ?? 0} />
            <Mini icon={Trophy} label="Interviews" value={counts?.interviews ?? 0} />
            <Mini icon={Award} label="Badges" value={counts?.badges ?? 0} />
          </div>

          <div className="card-flat p-4 space-y-3">
            <div className="text-sm font-medium">Public portfolio link</div>
            {username ? (
              <>
                <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2 text-xs font-mono break-all">{portfolioUrl}</div>
                <div className="flex gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(portfolioUrl!); toast.success("Link copied"); }} className="flex-1 h-9 rounded-md border border-border text-xs font-medium inline-flex items-center justify-center gap-1.5"><Copy className="h-3.5 w-3.5" />Copy</button>
                  <a href={portfolioUrl!} target="_blank" rel="noreferrer" className="flex-1 h-9 rounded-md bg-primary text-primary-foreground text-xs font-medium inline-flex items-center justify-center gap-1.5"><ExternalLink className="h-3.5 w-3.5" />Open</a>
                </div>
                <p className="text-[11px] text-muted-foreground">Apni mehnat duniya ko dikhao. Share karo.</p>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">Set a username in Settings to enable your public portfolio.</p>
                <Link to="/settings" onClick={onClose} className="inline-flex items-center justify-center h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium">Go to Settings</Link>
              </>
            )}
              try {
                await (snapshot as any)({});
                toast.success("Leaderboard updated");
              } catch (e: any) {

              setSnapshotting(true);
              try {
                await snapshot({ data: undefined as any });
                toast.success("Leaderboard updated");
              } catch (e: any) {
                toast.error(e.message);
              } finally {
                setSnapshotting(false);
              }
            }}
            className="w-full h-9 rounded-md border border-border text-xs font-medium"
          >
            {snapshotting ? "Updating…" : "Refresh leaderboard rank"}
          </button>
        </div>
      </aside>
    </>
  );
}

function Mini({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="card-flat p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</div>
      <div className="mt-0.5 text-lg font-semibold">{value}</div>
    </div>
  );
}
