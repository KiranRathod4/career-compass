import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function TrackNotesTab({ trackId, initial }: { trackId: string; initial: string }) {
  const [val, setVal] = useState(initial ?? "");
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (val === (initial ?? "")) return;
    timer.current = setTimeout(async () => {
      await supabase.from("custom_tracks").update({ notes_content: val }).eq("id", trackId);
      setSaved(true);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => setSaved(false), 2000);
    }, 1000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [val]); // eslint-disable-line

  return (
    <div className="card-flat p-5 relative">
      <div className="absolute top-3 right-4 text-[12px] transition-opacity duration-300"
        style={{ color: "var(--text-3)", opacity: saved ? 1 : 0 }}>Saved</div>
      <textarea value={val} onChange={(e) => setVal(e.target.value)}
        placeholder="Scratch notes for this track — anything you want to remember. Use **bold** and `code` markers."
        className="w-full text-[14px] outline-none resize-none min-h-[400px] bg-transparent leading-relaxed"
        style={{ color: "var(--text-1)" }} />
    </div>
  );
}
