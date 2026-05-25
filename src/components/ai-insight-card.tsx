import { Sparkles, Loader2 } from "lucide-react";
import { ReactNode } from "react";

export function AICard({
  title,
  description,
  onRun,
  loading,
  cta = "Run AI",
  children,
}: {
  title: string;
  description?: string;
  onRun: () => void;
  loading: boolean;
  cta?: string;
  children?: ReactNode;
}) {
  return (
    <div className="card-flat p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="section-label">{title}</span>
          </div>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        <button
          onClick={onRun}
          disabled={loading}
          className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {loading ? "Thinking…" : cta}
        </button>
      </div>
      {children}
    </div>
  );
}

export function ScoreBar({ value, label, tone = "primary" }: { value: number; label?: string; tone?: "primary" | "success" | "warning" | "destructive" }) {
  const color = `var(--color-${tone})`;
  return (
    <div>
      {label && <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>{label}</span><span className="tabular-nums">{Math.round(value)}</span></div>}
      <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} /></div>
    </div>
  );
}
