import { useEffect, useState } from "react";

export function ArenaLocked({ windows }: { windows: Array<{ day: string; start: string; end: string }> }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const active = windows.find((w) => {
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()];
    const hm = now.toTimeString().slice(0, 5);
    return w.day === day && hm >= w.start && hm <= w.end;
  });

  const opensAt = active?.end ?? "00:00";
  const [eh, em] = opensAt.split(":").map(Number);
  const target = new Date(now);
  target.setHours(eh, em, 0, 0);
  const diff = Math.max(0, target.getTime() - now.getTime());
  const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
  const m = String(Math.floor((diff / 60000) % 60)).padStart(2, "0");
  const s = String(Math.floor((diff / 1000) % 60)).padStart(2, "0");

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <svg width="120" height="120" viewBox="0 0 100 100" className="arena-hourglass">
        <path d="M20 10 H80 L65 40 Q50 50 65 60 L80 90 H20 L35 60 Q50 50 35 40 Z" stroke="#7c3aed" strokeWidth="3" fill="rgba(124,58,237,0.15)" />
        <path d="M40 22 H60 L52 35 H48 Z" fill="#f59e0b" />
        <path d="M48 75 H52 L60 88 H40 Z" fill="#f59e0b" opacity="0.6" />
      </svg>
      <h1 className="mt-8 text-3xl font-extrabold tracking-wide">ARENA BAND HAI</h1>
      <p className="mt-3 text-sm text-zinc-400">
        Study window: <span className="arena-mono">{active?.start}</span> → <span className="arena-mono">{active?.end}</span>
      </p>
      <div className="mt-6 arena-mono text-5xl font-bold text-[#f59e0b]">
        {h}:{m}:{s}
      </div>
      <p className="mt-2 text-xs text-zinc-500">Opens in</p>
      <p className="mt-8 text-sm text-zinc-300 max-w-sm">Study first, then play. You'll earn the break.</p>
    </div>
  );
}
