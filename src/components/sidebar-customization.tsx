import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { GripVertical, Check, Layers } from "lucide-react";
import { PREPARE_ITEMS, PREPARE_ITEM_ORDER } from "@/components/app-sidebar";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

function SortableSection({
  id,
  index,
}: {
  id: string;
  index: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 h-10 rounded-md border bg-card transition select-none ${
        isDragging
          ? "border-primary shadow-overlay z-50"
          : "border-border hover:bg-accent/50"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="h-7 w-7 grid place-content-center rounded-md cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span className="text-[12px] tabular-nums text-muted-foreground w-4">
        {index + 1}
      </span>
      <Layers className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
      <span className="flex-1 text-[13px] font-medium">
        {SECTIONS[id] ?? id}
      </span>
    </div>
  );
}

function DragOverlayItem({ id, index }: { id: string; index: number }) {
  return (
    <div className="flex items-center gap-2 px-3 h-10 rounded-md border border-primary bg-card shadow-overlay select-none">
      <div className="h-7 w-7 grid place-content-center text-muted-foreground">
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <span className="text-[12px] tabular-nums text-muted-foreground w-4">
        {index + 1}
      </span>
      <Layers className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
      <span className="flex-1 text-[13px] font-medium">
        {SECTIONS[id] ?? id}
      </span>
    </div>
  );
}

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
    initialPrepare && initialPrepare.length ? initialPrepare : DEFAULT_PREPARE,
  );
  const [sectionOrder, setSectionOrder] = useState<string[]>(
    initialOrder && initialOrder.length ? initialOrder : DEFAULT_SECTION_ORDER,
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      setSectionOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const next = [...items];
        next.splice(oldIndex, 1);
        next.splice(newIndex, 0, active.id as string);
        return next;
      });
    }
  };

  const resetAll = () => {
    setPrepareItems(DEFAULT_PREPARE);
    setSectionOrder(DEFAULT_SECTION_ORDER);
  };

  const activeIndex = activeId ? sectionOrder.indexOf(activeId) : -1;

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

      {/* Prepare items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] text-muted-foreground">Prepare items</div>
          {prepareItems.length === 0 && (
            <span className="text-[11px] text-warning font-medium">
              Nothing selected
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {PREPARE_ITEM_ORDER.map((k) => {
            const item = PREPARE_ITEMS[k];
            const on = prepareItems.includes(k);
            const Icon = item.icon;
            return (
              <button
                key={k}
                onClick={() => togglePrepare(k)}
                className={`flex items-center gap-2 px-3 h-9 rounded-md border text-[13px] transition active:scale-[0.97] ${
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

        {prepareItems.length === 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/20 bg-warning/[0.04] px-3 py-2.5">
            <Layers className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Your Prepare section is empty. Select at least one item above, or the section will be hidden from your sidebar.
            </p>
          </div>
        )}
      </div>

      {/* Section order */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] text-muted-foreground">Section order</div>
          <span className="text-[11px] text-muted-foreground">
            Drag to reorder
          </span>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => setActiveId(active.id as string)}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext
            items={sectionOrder}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1.5">
              {sectionOrder.map((key, i) => (
                <SortableSection key={key} id={key} index={i} />
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {activeId ? (
              <DragOverlayItem id={activeId} index={activeIndex} />
            ) : null}
          </DragOverlay>
        </DndContext>

        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          Tip: Put the section you open most often at the top. The order updates instantly in the sidebar after saving.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60 active:scale-[0.97] transition"
        >
          {save.isPending ? "Saving…" : "Save sidebar"}
        </button>
      </div>
    </div>
  );
}
