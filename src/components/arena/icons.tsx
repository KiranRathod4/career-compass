import type { ReactNode } from "react";

const wrap = (children: ReactNode) => (
  <svg viewBox="0 0 80 80" width="88" height="88" xmlns="http://www.w3.org/2000/svg">{children}</svg>
);

export const IconMathSprint = () =>
  wrap(
    <>
      <text x="22" y="56" fontSize="56" fontWeight="800" fill="#f59e0b" fontFamily="JetBrains Mono, monospace">Σ</text>
      <path d="M58 18 L50 36 L60 36 L52 56" stroke="#fbbf24" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" fill="none" />
    </>
  );

export const IconDailyPuzzles = () =>
  wrap(
    <>
      <circle cx="30" cy="34" r="20" fill="#7c3aed" opacity="0.55" />
      <circle cx="50" cy="34" r="20" fill="#a78bfa" opacity="0.55" />
      <circle cx="40" cy="52" r="20" fill="#6d28d9" opacity="0.55" />
    </>
  );

export const IconUnscramble = () =>
  wrap(
    <>
      <g transform="rotate(-12 22 40)"><rect x="6" y="24" width="32" height="32" rx="6" fill="#0d9488" /><text x="22" y="48" fontSize="22" fontWeight="800" fill="#fff" textAnchor="middle" fontFamily="Inter">A</text></g>
      <g transform="rotate(6 40 38)"><rect x="24" y="22" width="32" height="32" rx="6" fill="#14b8a6" /><text x="40" y="46" fontSize="22" fontWeight="800" fill="#fff" textAnchor="middle" fontFamily="Inter">B</text></g>
      <g transform="rotate(-4 58 42)"><rect x="42" y="26" width="32" height="32" rx="6" fill="#2dd4bf" /><text x="58" y="50" fontSize="22" fontWeight="800" fill="#fff" textAnchor="middle" fontFamily="Inter">C</text></g>
    </>
  );

export const IconMemory = () =>
  wrap(
    <>
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => {
          const lit = (r === 0 && c === 1) || (r === 1 && c === 2) || (r === 2 && c === 0);
          const fill = lit ? (r === 0 ? "#db2777" : r === 1 ? "#f59e0b" : "#7c3aed") : "#1e1e2e";
          return <rect key={`${r}${c}`} x={10 + c * 22} y={10 + r * 22} width="18" height="18" rx="4" fill={fill} stroke="#312e81" strokeWidth="1" />;
        })
      )}
    </>
  );

export const IconLogicGrid = () =>
  wrap(
    <>
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2, 3].map((c) => {
          const filled = (r + c) % 3 === 0;
          return (
            <g key={`${r}${c}`}>
              <rect x={10 + c * 15} y={10 + r * 15} width="13" height="13" rx="2" fill={filled ? "#2563eb" : "#1e1e2e"} stroke="#3730a3" strokeWidth="0.5" />
              {filled && <text x={10 + c * 15 + 6.5} y={10 + r * 15 + 10} fontSize="9" fill="#fff" textAnchor="middle" fontFamily="JetBrains Mono">{(r + c) % 4 + 1}</text>}
            </g>
          );
        })
      )}
    </>
  );

export const IconDuel = () =>
  wrap(
    <>
      <path d="M18 14 L12 40 L24 40 L18 66" stroke="#f59e0b" strokeWidth="5" fill="#f59e0b" strokeLinejoin="round" />
      <path d="M62 66 L68 40 L56 40 L62 14" stroke="#7c3aed" strokeWidth="5" fill="#7c3aed" strokeLinejoin="round" />
    </>
  );
