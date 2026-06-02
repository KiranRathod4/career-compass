import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiCompanyInsider } from "@/lib/ai.functions";
import { EliteGate } from "@/components/elite-gate";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Loader2, Users, Code2, Heart, AlertTriangle, ListChecks, Building2, MessageSquareQuote,
} from "lucide-react";
import { toast } from "sonner";

type Insider = {
  overview: string;
  interview_rounds: { name: string; focus: string; tips?: string }[];
  commonly_asked: string[];
  tech_stack_signals: string[];
  culture_signals: string[];
  red_flags: string[];
  two_week_plan: string[];
};

export function CompanyInsiderDrawer({
  open,
  onOpenChange,
  company,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  company: { name: string; role_focus?: string; location?: string } | null;
}) {
  const run = useServerFn(aiCompanyInsider);
  const [data, setData] = useState<Insider | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInsider = async () => {
    if (!company) return;
    setLoading(true);
    setData(null);
    try {
      const r = await run({
        data: {
          companyName: company.name,
          roleFocus: company.role_focus,
          location: company.location,
        },
      });
      setData(r as Insider);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not fetch insider intel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            {company?.name ?? "Company"}
            <Badge variant="secondary" className="gap-1 ml-1"><Sparkles className="h-3 w-3" /> Insider</Badge>
          </SheetTitle>
          <SheetDescription>
            AI-curated insider intel — interview rounds, topics, signals and a 2-week prep plan.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5">
          <EliteGate
            variant="card"
            feature="Company Insider Intelligence"
            description="Unlock with Elite to see interview rounds, frequently asked questions and a personalized 2-week prep plan for every target company."
          >
            {!data && !loading && (
              <div className="text-center py-8">
                <Button onClick={fetchInsider}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate insider intel
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Built from common hiring patterns for {company?.name}.
                </p>
              </div>
            )}

            {loading && (
              <div className="text-center py-10">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                <p className="text-xs text-muted-foreground mt-2">Gathering insider intel…</p>
              </div>
            )}

            {data && (
              <div className="space-y-6">
                <p className="text-sm text-foreground/90 leading-relaxed">{data.overview}</p>

                <Section icon={<ListChecks className="h-4 w-4 text-primary" />} title="Interview rounds">
                  <div className="space-y-3">
                    {data.interview_rounds.map((r, i) => (
                      <div key={i} className="border-l-2 border-primary/40 pl-3">
                        <div className="text-sm font-medium">{i + 1}. {r.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{r.focus}</div>
                        {r.tips && <div className="text-xs text-foreground/80 mt-1"><span className="text-primary">Tip:</span> {r.tips}</div>}
                      </div>
                    ))}
                  </div>
                </Section>

                <Section icon={<MessageSquareQuote className="h-4 w-4 text-primary" />} title="Commonly asked">
                  <ul className="space-y-1.5 text-sm">
                    {data.commonly_asked.map((q, i) => <li key={i}>• {q}</li>)}
                  </ul>
                </Section>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Section icon={<Code2 className="h-4 w-4 text-primary" />} title="Tech & skills">
                    <ChipList items={data.tech_stack_signals} />
                  </Section>
                  <Section icon={<Heart className="h-4 w-4 text-primary" />} title="Culture signals">
                    <ChipList items={data.culture_signals} />
                  </Section>
                </div>

                <Section icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} title="Watch out for">
                  <ul className="space-y-1.5 text-sm">
                    {data.red_flags.map((r, i) => <li key={i}>• {r}</li>)}
                  </ul>
                </Section>

                <Section icon={<Users className="h-4 w-4 text-primary" />} title="Your 2-week plan">
                  <ol className="space-y-2 text-sm">
                    {data.two_week_plan.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-semibold grid place-items-center shrink-0">{i + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </Section>

                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={fetchInsider}>
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Regenerate
                  </Button>
                </div>
              </div>
            )}
          </EliteGate>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">{icon}<div className="section-label">{title}</div></div>
      {children}
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s, i) => (
        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-muted text-foreground/80">{s}</span>
      ))}
    </div>
  );
}
