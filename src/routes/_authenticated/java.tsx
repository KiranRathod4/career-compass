import { createFileRoute, Link } from "@tanstack/react-router";
import { Coffee } from "lucide-react";

export const Route = createFileRoute("/_authenticated/java")({ component: JavaPage });

function JavaPage() {
  return (
    <div className="max-w-3xl mx-auto py-16 text-center space-y-3">
      <Coffee className="h-8 w-8 mx-auto text-[color:var(--text-3)]" />
      <h1 className="t-h1">Core Java</h1>
      <p className="t-body max-w-md mx-auto">A dedicated Core Java module is in the works. For now, start a <Link to="/tracks" className="text-primary underline underline-offset-2">custom track</Link> for Java and we'll generate a full roadmap with AI.</p>
    </div>
  );
}
