import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Check } from "lucide-react";
import { PREPARE_ITEMS, PREPARE_ITEM_ORDER } from "@/components/app-sidebar";

const SECTIONS: Record<string, string> = {
  overview: "Overview",
  prepare: "Prepare",
  career: "Career",
  grow: "Grow",
  insights: "Insights",
  rewards: "Rewards",
};
const DEFAULT_SECTION_ORDER = ["overview", "prepare", "career", "grow", "insights", "rewards"];
const DEFAULT_PREPARE = ["dsa", "aptitude", "sql", "devops", "qa", "custom_tracks"];

export function SidebarCustomization({
  initialPrepare,
  initialOrder,
}: {
  initialPrepare?: string[] | null;
  initialOrder?: string[] | null;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [prepareItems, setPrepareItems] = useState<string[]>(
    (initialPrepare && initialPrepare.length ? initialPrepare : DEFAULT_PREPARE),
  );
  const [sectionOrder, setSectionOrder] = useState<string[]>(
    (initialOrder && initialOrder.length ? initialOrder : DEFAULT_SECTION_ORDER),
  );

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          sidebar_prepare_items: prepareItems,
          sidebar_section_order: sectionOrder,
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sidebar-profile"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Sidebar updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePrepare = (key: string) => {
    setPrepareItems((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key],
    );
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...sectionOrder];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setSectionOrder(next);
  };

  const resetAll = () => {
    setPrepareItems(DEFAULT_PREPARE);
    setSectionOrder(DEFAULT_SECTION_ORDER);
  };

  return (
    <div className="card-flat p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="section-label">Sidebar Personalization</div>
          <p className="text-[12px] text-muted-foreground mt-1">
            Show only what you actually use. Reorder sections to match your daily flow.
          </p>
        </div>
        <button
          onClick={resetAll}
          className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          Reset to default
        </button>
      </div>

      <div>
        <div className="text-[11px] text-muted-foreground mb-2">Prepare items</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {PREPARE_ITEM_ORDER.map((k) => {
            const item = PREPARE_ITEMS[k];
            const on = prepareItems.includes(k);
            const Icon = item.icon;
            return (
              <button
                key={k}
                onClick={() => togglePrepare(k)}
                className={`flex items-center gap-2 px-3 h-9 rounded-md border text-[13px] transition ${
                  on
                    ? "border-primary bg-[var(--p-alpha-08)] text-foreground"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 text-left truncate">{item.label}</span>
                {on && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-[11px] text-muted-foreground mb-2">Section order</div>
        <div className="space-y-1.5">
          {sectionOrder.map((key, i) => (
            <div
              key={key}
              className="flex items-center gap-2 px-3 h-10 rounded-md border border-border bg-card"
            >
              <span className="text-[12px] tabular-nums text-muted-foreground w-4">{i + 1}</span>
              <span className="flex-1 text-[13px] font-medium">{SECTIONS[key] ?? key}</span>
              <button
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="h-7 w-7 grid place-content-center rounded-md hover:bg-accent disabled:opacity-30"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                disabled={i === sectionOrder.length - 1}
                onClick={() => move(i, 1)}
                className="h-7 w-7 grid place-content-center rounded-md hover:bg-accent disabled:opacity-30"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
        >
          {save.isPending ? "Saving…" : "Save sidebar"}
        </button>
      </div>
    </div>
  );
}
