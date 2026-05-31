import { ArrowLeft, Zap, Copy, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function AptitudeDuel({ onBack }: { onBack: () => void }) {
  const [topic, setTopic] = useState<"Quant" | "Logical" | "Mixed">("Mixed");
  const [diff, setDiff] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [searching, setSearching] = useState(false);

  const startMatch = () => {
    setSearching(true);
    setTimeout(() => { setSearching(false); toast.info("Multiplayer coming soon — try practice mode for now."); }, 2500);
  };

  const inviteCode = "DUEL-" + Math.random().toString(36).slice(2, 7).toUpperCase();

  return (
    <div className="relative max-w-xl mx-auto">
      <button onClick={onBack} className="absolute -top-2 left-0 h-9 w-9 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800"><ArrowLeft className="h-4 w-4" /></button>

      <div className="text-center mt-2 mb-8">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-3">
          <Zap className="h-7 w-7 text-amber-500" />
        </div>
        <h2 className="text-2xl font-extrabold tracking-wide">APTITUDE DUEL</h2>
        <p className="text-sm text-zinc-400 mt-1">Challenge a friend — live</p>
      </div>

      {searching ? (
        <div className="arena-card p-10 text-center">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-[#7c3aed]/30 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-[#7c3aed]/60 animate-ping" style={{ animationDelay: "200ms" }} />
            <div className="absolute inset-4 rounded-full bg-[#7c3aed]/30 flex items-center justify-center"><Users className="h-7 w-7" /></div>
          </div>
          <p className="text-sm">Opponent dhoondh rahe hain...</p>
          <button onClick={() => setSearching(false)} className="mt-6 h-9 px-5 rounded-lg border border-zinc-700 text-xs">Cancel</button>
        </div>
      ) : (
        <div className="arena-card p-6 space-y-6">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Topic</div>
            <div className="flex gap-2">
              {(["Quant", "Logical", "Mixed"] as const).map((t) => (
                <button key={t} onClick={() => setTopic(t)} className={`flex-1 h-10 rounded-lg text-sm font-medium border transition ${topic === t ? "bg-[#7c3aed] border-[#7c3aed] text-white" : "border-zinc-700 hover:bg-zinc-800"}`}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Difficulty</div>
            <div className="flex gap-2">
              {(["Easy", "Medium", "Hard"] as const).map((d) => (
                <button key={d} onClick={() => setDiff(d)} className={`flex-1 h-10 rounded-lg text-sm font-medium border transition ${diff === d ? "bg-[#f59e0b] border-[#f59e0b] text-black" : "border-zinc-700 hover:bg-zinc-800"}`}>{d}</button>
              ))}
            </div>
          </div>

          <button onClick={startMatch} className="w-full h-12 rounded-xl bg-[#7c3aed] text-white font-bold tracking-wide">DUEL START KARO</button>

          <div className="border-t border-zinc-800 pt-4">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Invite link</div>
            <div className="flex gap-2">
              <code className="flex-1 arena-mono text-xs bg-[#1a1a24] border border-zinc-800 rounded-lg px-3 py-2.5">{inviteCode}</code>
              <button onClick={() => { navigator.clipboard.writeText(inviteCode); toast.success("Code copied"); }} className="h-10 px-3 rounded-lg border border-zinc-700 inline-flex items-center gap-1.5 text-xs"><Copy className="h-3.5 w-3.5" />Copy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
