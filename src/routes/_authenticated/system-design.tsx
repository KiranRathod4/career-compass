import { createFileRoute, Link } from "@tanstack/react-router";
import { Layers } from "lucide-react";

export const Route = createFileRoute("/_authenticated/system-design")({ component: SDPage });

function SDPage() {
  return (
    <div className="max-w-3xl mx-auto py-16 text-center space-y-3">
      <Layers className="h-8 w-8 mx-auto text-[color:var(--text-3)]" />
      <h1 className="t-h1">System Design</h1>
      <p className="t-body max-w-md mx-auto">A dedicated System Design module is coming. Meanwhile, create a <Link to="/tracks" className="text-primary underline underline-offset-2">custom track</Link> for System Design — the AI roadmap covers scalability, databases, caching, and more.</p>
    </div>
  );
}
