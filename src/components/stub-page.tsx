import { Sparkles } from "lucide-react";

export function StubPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="max-w-2xl mx-auto mt-12">
      <div className="card-flat p-10 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
          <Sparkles className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <p className="mt-4 text-xs text-muted-foreground">Coming in the next build phase.</p>
      </div>
    </div>
  );
}
