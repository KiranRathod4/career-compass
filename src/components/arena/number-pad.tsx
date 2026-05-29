import { Delete, Check } from "lucide-react";

export function NumberPad({ value, onChange, onSubmit, disabled }: { value: string; onChange: (v: string) => void; onSubmit: () => void; disabled?: boolean }) {
  const press = (d: string) => {
    if (disabled) return;
    if (d === "back") onChange(value.slice(0, -1));
    else if (d === "ok") onSubmit();
    else if ((value + d).length <= 6) onChange(value + d);
  };
  const Btn = ({ children, k, accent }: { children: any; k: string; accent?: string }) => (
    <button
      type="button"
      onClick={() => press(k)}
      disabled={disabled}
      className={`arena-tile arena-tile-press h-14 sm:h-16 text-xl sm:text-2xl font-semibold ${accent ?? ""}`}
    >
      {children}
    </button>
  );
  return (
    <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
      {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((n) => (
        <Btn key={n} k={n}>{n}</Btn>
      ))}
      <Btn k="back"><Delete className="h-5 w-5 mx-auto" /></Btn>
      <Btn k="0">0</Btn>
      <Btn k="ok" accent="!bg-[#7c3aed] !border-[#7c3aed] text-white"><Check className="h-5 w-5 mx-auto" /></Btn>
    </div>
  );
}
