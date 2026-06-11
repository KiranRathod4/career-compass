import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  AlertTriangle, Clock, Battery, Zap, TrendingDown, Wifi,
  CheckCircle2, ChevronDown, ArrowRight, Check, Sparkles,
  Target, Briefcase, Trophy, BarChart3, Menu, X,
  Github, Twitter, Linkedin,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Taiyaar — The placement prep system for Indian engineering students" },
      { name: "description", content: "Stop running on 10 browser tabs. Taiyaar connects DSA, jobs, mocks, and daily focus — with AI that tells you exactly what to do today." },
      { property: "og:title", content: "Taiyaar — Your placement season, finally has a system." },
      { property: "og:description", content: "AI-powered placement prep for Indian engineering students." },
    ],
  }),
});

/* ──────────────────────────────────────────────────────────────
   Landing-page-only color tokens (kept inline, scoped via CSS var)
   ────────────────────────────────────────────────────────────── */
const C = {
  heroDark: "#0f0a1e",
  heroMid: "#1a0f3a",
  sectionLight: "#f8f7ff",
  sectionDark: "#09090b",
  purple: "#7c3aed",
  purpleLight: "#8b5cf6",
  amber: "#f59e0b",
};

/* ──────────────────────────────────────────────────────────────
   Reveal: stagger-in on scroll
   ────────────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* Count-up */
function CountUp({ to, suffix = "", duration = 1400 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.floor(eased * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return <span ref={ref}>{n.toLocaleString("en-IN")}{suffix}</span>;
}

/* Logo wordmark */
function Wordmark({ light = true }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2 select-none" style={{ color: light ? "white" : C.sectionDark }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M5 6h14M12 6v14M9 11l3-3 3 3" stroke={C.purpleLight} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.3px" }}>Taiyaar</span>
    </Link>
  );
}

/* ──────────────────────────────────────────────────────────────
   NAV
   ────────────────────────────────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const links = [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how" },
    { label: "Pricing", href: "#pricing" },
    { label: "Blog", href: "#" },
  ];

  return (
    <>
      <nav
        className="fixed top-0 inset-x-0 z-[100] transition-[background-color] duration-[250ms]"
        style={{
          height: 56,
          background: scrolled ? "rgba(15,10,30,0.85)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
        }}
      >
        <div className="h-full mx-auto flex items-center justify-between" style={{ maxWidth: 1200, padding: "0 32px" }}>
          <Wordmark />
          <div className="hidden md:flex items-center gap-7">
            {links.map((l) => (
              <a key={l.label} href={l.href} className="text-[14px] transition-colors duration-150"
                 style={{ color: "rgba(255,255,255,0.6)" }}
                 onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
                 onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}>
                {l.label}
              </a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Link to="/login" className="text-[13px] font-medium px-3 h-[34px] flex items-center rounded-md"
                  style={{ color: "rgba(255,255,255,0.85)" }}>
              Sign in
            </Link>
            <Link to="/login"
                  className="text-[13px] font-medium px-4 h-[34px] flex items-center rounded-md transition-colors"
                  style={{ background: C.purple, color: "white" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.purpleLight)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = C.purple)}>
              Start free
            </Link>
          </div>
          <button className="md:hidden text-white" onClick={() => setMobileOpen(true)} aria-label="Menu">
            <Menu size={22} />
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[110] flex flex-col" style={{ background: C.heroDark }}>
          <div className="flex items-center justify-between px-6" style={{ height: 56 }}>
            <Wordmark />
            <button className="text-white" onClick={() => setMobileOpen(false)} aria-label="Close"><X size={22} /></button>
          </div>
          <div className="flex flex-col items-center justify-center flex-1 gap-6">
            {links.map((l) => (
              <a key={l.label} href={l.href} className="text-xl text-white/85" onClick={() => setMobileOpen(false)}>{l.label}</a>
            ))}
            <Link to="/login" className="mt-6 px-6 h-11 flex items-center rounded-lg" style={{ background: C.purple, color: "white" }}>Start free</Link>
            <Link to="/login" className="text-white/70 text-sm">Sign in</Link>
          </div>
        </div>
      )}
    </>
  );
}

/* ──────────────────────────────────────────────────────────────
   HERO
   ────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        minHeight: "100vh",
        background: `linear-gradient(160deg, ${C.heroDark} 0%, ${C.heroMid} 50%, ${C.heroDark} 100%)`,
        padding: "140px 24px 80px",
      }}
    >
      {/* radial glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-[20%] -translate-x-1/2"
        style={{
          width: 600, height: 400,
          background: "radial-gradient(ellipse, rgba(124,58,237,0.25) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto text-center" style={{ maxWidth: 1100 }}>
        {/* announcement */}
        <motion.a href="#features"
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
          className="inline-flex items-center gap-2 rounded-full text-[13px]"
          style={{
            background: "rgba(124,58,237,0.15)",
            border: "1px solid rgba(124,58,237,0.3)",
            padding: "4px 16px",
            color: "rgba(255,255,255,0.8)",
          }}>
          <span>Now in beta — join 1,200+ students preparing smarter</span>
          <ArrowRight size={14} style={{ color: C.purpleLight }} />
        </motion.a>

        {/* headline */}
        <div className="mt-8">
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto"
            style={{
              fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 700, letterSpacing: "-1.5px",
              color: "rgba(255,255,255,0.95)", lineHeight: 1.05, maxWidth: 800,
            }}
          >
            Your placement season,
          </motion.h1>
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25 }}
            className="mx-auto"
            style={{
              fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 700, letterSpacing: "-1.5px",
              color: C.purpleLight, lineHeight: 1.05, maxWidth: 800,
            }}
          >
            finally has a system.
          </motion.h1>
        </div>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}
          className="mx-auto mt-6"
          style={{
            fontSize: 18, lineHeight: 1.6, color: "rgba(255,255,255,0.55)", maxWidth: 560,
          }}
        >
          Stop running on 10 browser tabs, scattered notes, and guesswork. Taiyaar is the
          preparation platform that connects your DSA practice, job applications, mock tests,
          and daily focus — with AI that tells you exactly what to do today.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.65 }}
          className="mt-12 flex items-center justify-center gap-3 flex-wrap"
        >
          <Link to="/login"
            className="inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200"
            style={{
              height: 44, padding: "0 24px", background: C.purple, color: "white", fontSize: 15,
              boxShadow: "0 0 0 0 rgba(124,58,237,0)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = C.purpleLight; e.currentTarget.style.boxShadow = "0 0 32px rgba(124,58,237,0.4)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = C.purple; e.currentTarget.style.boxShadow = "0 0 0 0 rgba(124,58,237,0)"; }}
          >
            Start for free
          </Link>
          <a href="#how"
            className="inline-flex items-center justify-center rounded-lg transition-colors"
            style={{
              height: 44, padding: "0 24px", background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.75)", fontSize: 15,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)"; e.currentTarget.style.color = "rgba(255,255,255,0.95)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}
          >
            See how it works
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-4" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em" }}
        >
          Free forever · No credit card · For students
        </motion.p>

        {/* product mockup */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-16"
          style={{ maxWidth: 1040 }}
        >
          <BrowserFrame>
            <DashboardMockup />
          </BrowserFrame>
        </motion.div>
      </div>
    </section>
  );
}

function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
        overflow: "hidden",
      }}
    >
      <div className="flex items-center gap-2 px-4" style={{ height: 32, background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: "#ff5f57" }} />
        <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: "#febc2e" }} />
        <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: "#28c840" }} />
        <div className="mx-auto rounded text-[11px] text-center" style={{
          background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)",
          padding: "2px 12px", minWidth: 200,
        }}>taiyaar.co.in</div>
      </div>
      {children}
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="flex" style={{ background: "#0a0612", minHeight: 420 }}>
      {/* sidebar */}
      <div className="hidden sm:flex flex-col gap-2 p-3" style={{ width: 180, background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="rounded" style={{ height: 24, background: "rgba(124,58,237,0.25)" }} />
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="rounded" style={{ height: 18, background: "rgba(255,255,255,0.04)" }} />
        ))}
      </div>
      {/* main */}
      <div className="flex-1 p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {[
            { v: "47", l: "DSA solved" },
            { v: "12", l: "Streak" },
            { v: "8", l: "Apps" },
            { v: "82%", l: "Ready" },
          ].map((s, i) => (
            <div key={i} className="rounded-lg p-2 sm:p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderLeft: `2px solid ${C.purple}` }}>
              <div className="text-white font-bold text-sm sm:text-lg">{s.v}</div>
              <div className="text-[10px] sm:text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div className="rounded-lg p-3 sm:p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-white text-[13px] font-medium">Today's Plan</div>
            <div className="text-[10px] px-2 py-[2px] rounded-full" style={{ background: "rgba(124,58,237,0.18)", color: C.purpleLight }}>AI generated</div>
          </div>
          <div className="space-y-2">
            {[
              ["Solve 3 Graph problems", "DSA", true],
              ["SQL: window functions practice", "SQL", false],
              ["Apply to 2 SDE roles", "Jobs", false],
              ["Mock interview review", "Mock", false],
            ].map(([t, tag, done], i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="rounded-sm" style={{ width: 14, height: 14, border: `1.5px solid ${done ? C.purple : "rgba(255,255,255,0.2)"}`, background: done ? C.purple : "transparent" }} />
                <div className="flex-1 text-[12px]" style={{ color: done ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.85)", textDecoration: done ? "line-through" : "none" }}>{t as string}</div>
                <div className="text-[10px] px-2 py-[2px] rounded" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>{tag as string}</div>
                <div className="text-[10px] px-2 py-[2px] rounded-full" style={{ background: "rgba(124,58,237,0.18)", color: C.purpleLight }}>+8 XP</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg p-3 sm:p-4 hidden sm:block" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-white text-[12px] font-medium mb-2">Topic progress</div>
          {[ ["Arrays", 0.85], ["Graphs", 0.45], ["DP", 0.62], ["Trees", 0.78] ].map(([t,w], i) => (
            <div key={i} className="flex items-center gap-2 my-1.5">
              <div className="text-[11px] w-14" style={{ color: "rgba(255,255,255,0.5)" }}>{t}</div>
              <div className="flex-1 rounded-full" style={{ height: 6, background: "rgba(255,255,255,0.06)" }}>
                <div style={{ height: 6, width: `${(w as number) * 100}%`, background: C.purple, borderRadius: 9999 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   SOCIAL PROOF
   ────────────────────────────────────────────────────────────── */
function SocialProof() {
  const stats = [
    { n: 1200, suffix: "+", l: "Active students" },
    { n: 47000, suffix: "+", l: "DSA problems tracked" },
    { n: 8500, suffix: "+", l: "Job applications managed" },
    { n: 94, suffix: "%", l: "Report improved consistency" },
  ];
  return (
    <section style={{ background: "rgba(255,255,255,0.03)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "32px 24px" }}>
      <div className="mx-auto flex items-center justify-around flex-wrap gap-y-6" style={{ maxWidth: 1200 }}>
        {stats.map((s, i) => (
          <div key={i} className="flex flex-col items-center text-center" style={{ minWidth: 120, borderRight: i < stats.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none", padding: "0 24px" }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 28, fontWeight: 700, color: "white" }}>
              <CountUp to={s.n} suffix={s.suffix} />
            </div>
            <div className="mt-1" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────
   FEATURE TABS
   ────────────────────────────────────────────────────────────── */
const FEATURE_TABS = [
  { id: "ai", label: "AI Daily Plan", icon: Sparkles },
  { id: "dsa", label: "DSA Tracker", icon: Code, },
  { id: "jobs", label: "Job Pipeline", icon: Briefcase },
  { id: "arena", label: "Arena", icon: Trophy },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
] as const;

function Code(props: any) { return <Target {...props} />; }

function FeatureTabs() {
  const [tab, setTab] = useState<typeof FEATURE_TABS[number]["id"]>("ai");
  const content = {
    ai: {
      tag: "AI PLANNER",
      title: "AI builds your day. You just execute.",
      body: "Every morning, Taiyaar reads your upcoming interviews, weak topics, streak status, and college schedule — then generates exactly 5 things to do today. Not 50.",
      points: ["Adapts to your college schedule", "Prioritizes based on interview dates", "Cuts the list when you're overloaded"],
      mock: <PlanMock />,
    },
    dsa: {
      tag: "DSA TRACKER",
      title: "Every problem. Every topic. Every gap.",
      body: "Track DSA progress at the problem, topic, and pattern level. Confidence-tagged. Linked to your target companies' question banks.",
      points: ["Blind 75, NeetCode 150, Striver SDE", "Confidence ratings per problem", "Topic-level weakness detection"],
      mock: <DSAMock />,
    },
    jobs: {
      tag: "JOB PIPELINE",
      title: "Your applications, finally organized.",
      body: "Kanban-style pipeline from wishlist to offer. Follow-up reminders. Per-company readiness scores. Never miss a deadline again.",
      points: ["8-stage application pipeline", "Auto follow-up reminders", "Company-specific prep hubs"],
      mock: <JobsMock />,
    },
    arena: {
      tag: "ARENA",
      title: "Earn your dopamine. Don't steal it.",
      body: "Aptitude duels, math sprints, memory games — all locked during study hours. Sharpens you instead of distracting you.",
      points: ["Locked during focus windows", "Live duels with friends", "Weekly leaderboards & XP"],
      mock: <ArenaMock />,
    },
    analytics: {
      tag: "ANALYTICS",
      title: "Know exactly where you stand.",
      body: "Heatmaps, streaks, focus minutes, problem velocity, readiness per company. Real numbers, not feelings.",
      points: ["Daily activity heatmaps", "Per-company readiness scores", "Energy & consistency tracking"],
      mock: <AnalyticsMock />,
    },
  }[tab];

  return (
    <section id="features" style={{ background: C.sectionLight, padding: "96px 24px" }}>
      <div className="mx-auto" style={{ maxWidth: 1200 }}>
        <Reveal>
          <div className="text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: C.purple }}>FEATURES</div>
            <h2 className="mx-auto mt-3" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-1px", color: "#09090b", maxWidth: 700, lineHeight: 1.1 }}>
              Everything you need. Nothing you don't.
            </h2>
            <p className="mx-auto mt-4" style={{ fontSize: 18, color: "#52525b", maxWidth: 520, lineHeight: 1.5 }}>
              Built around how Indian engineering students actually prepare — not how productivity apps think they do.
            </p>
          </div>
        </Reveal>

        {/* tabs */}
        <div className="mt-12 flex justify-center overflow-x-auto" style={{ borderBottom: "1px solid #e4e4e7" }}>
          <div className="flex">
            {FEATURE_TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex items-center gap-2 transition-colors duration-150 whitespace-nowrap"
                  style={{
                    height: 40, padding: "0 16px", fontSize: 14, fontWeight: 500,
                    color: active ? C.purple : "#71717a",
                    borderBottom: active ? `2px solid ${C.purple}` : "2px solid transparent",
                    marginBottom: -1,
                  }}
                >
                  <Icon size={16} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* content */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-14 grid md:grid-cols-2 gap-12 items-center"
        >
          <div>
            <span className="inline-block text-[11px] font-semibold uppercase tracking-wide rounded px-2 py-1" style={{ background: "rgba(124,58,237,0.1)", color: C.purple }}>
              {content.tag}
            </span>
            <h3 className="mt-4" style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.4px", color: "#09090b", lineHeight: 1.2 }}>{content.title}</h3>
            <p className="mt-4" style={{ fontSize: 16, lineHeight: 1.7, color: "#52525b" }}>{content.body}</p>
            <ul className="mt-6 space-y-3">
              {content.points.map((p, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 size={16} style={{ color: C.purple, marginTop: 3 }} />
                  <span style={{ fontSize: 14, color: "#3f3f46" }}>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="rounded-[14px] p-6" style={{ background: "white", border: "1px solid #e4e4e7", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
              {content.mock}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function PlanMock() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[14px] font-semibold text-zinc-900">Today's Plan — Tuesday</div>
        <div className="text-[10px] px-2 py-[2px] rounded-full" style={{ background: "rgba(124,58,237,0.1)", color: C.purple }}>AI generated</div>
      </div>
      {[
        ["Graph BFS — 3 problems", "DSA", "+12 XP", true],
        ["SQL window functions", "SQL", "+8 XP", false],
        ["Apply: Razorpay, Atlassian", "Jobs", "+10 XP", false],
        ["Mock review (45 min)", "Mock", "+6 XP", false],
        ["LinkedIn post on graphs", "Brand", "+4 XP", false],
      ].map(([t, tag, xp, done], i) => (
        <div key={i} className="flex items-center gap-3 py-2 border-t border-zinc-100">
          <div className="rounded-sm" style={{ width: 14, height: 14, border: `1.5px solid ${done ? C.purple : "#d4d4d8"}`, background: done ? C.purple : "transparent" }} />
          <div className="flex-1 text-[13px]" style={{ color: done ? "#a1a1aa" : "#18181b", textDecoration: done ? "line-through" : "none" }}>{t as string}</div>
          <span className="text-[10px] px-2 py-[2px] rounded bg-zinc-100 text-zinc-500">{tag as string}</span>
          <span className="text-[10px] px-2 py-[2px] rounded-full" style={{ background: "rgba(124,58,237,0.1)", color: C.purple }}>{xp as string}</span>
        </div>
      ))}
    </div>
  );
}

function DSAMock() {
  const rows = [
    ["Two Sum", "Easy", "Arrays", 5],
    ["LRU Cache", "Med", "Design", 3],
    ["Median of Two Arrays", "Hard", "Binary Search", 2],
  ];
  const diffColor: Record<string, string> = { Easy: "#10b981", Med: "#f59e0b", Hard: "#ef4444" };
  return (
    <div>
      <div className="grid grid-cols-[1.6fr_0.6fr_1fr_0.7fr] text-[11px] text-zinc-500 mb-2 px-1">
        <div>Problem</div><div>Difficulty</div><div>Topic</div><div>Confidence</div>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1.6fr_0.6fr_1fr_0.7fr] items-center py-2 border-t border-zinc-100 px-1 text-[13px] text-zinc-800">
          <div>{r[0]}</div>
          <div>
            <span className="text-[10px] px-2 py-[2px] rounded-full text-white" style={{ background: diffColor[r[1] as string] }}>{r[1]}</span>
          </div>
          <div className="text-zinc-600">{r[2]}</div>
          <div className="flex gap-[2px]">
            {[1,2,3,4,5].map(s => (
              <div key={s} className="rounded-sm" style={{ width: 8, height: 12, background: s <= (r[3] as number) ? C.purple : "#e4e4e7" }} />
            ))}
          </div>
        </div>
      ))}
      <div className="mt-5">
        <div className="flex justify-between text-[12px] text-zinc-600 mb-1.5"><span>Blind 75</span><span>47 / 75</span></div>
        <div className="rounded-full" style={{ height: 6, background: "#f4f4f5" }}>
          <div className="rounded-full" style={{ height: 6, width: "63%", background: C.purple }} />
        </div>
      </div>
    </div>
  );
}

function JobsMock() {
  const cols = [
    ["Wishlist", 12],
    ["Applied", 8],
    ["OA", 5],
    ["Interview", 3, true],
    ["Offer", 1],
  ];
  return (
    <div className="grid grid-cols-5 gap-2">
      {cols.map(([name, count, hi], i) => (
        <div key={i} className="rounded-lg p-2 text-center" style={{ background: hi ? "rgba(245,158,11,0.08)" : "#f8f8f8", border: hi ? `1px solid ${C.amber}` : "1px solid #ececec" }}>
          <div className="text-[10px] uppercase text-zinc-500">{name as string}</div>
          <div className="text-[18px] font-bold mt-1" style={{ color: hi ? C.amber : "#18181b" }}>{count as number}</div>
          <div className="space-y-1 mt-2">
            {Array.from({ length: Math.min(count as number, 3) }).map((_, j) => (
              <div key={j} className="rounded" style={{ height: 14, background: hi ? "rgba(245,158,11,0.15)" : "#ececec" }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ArenaMock() {
  return (
    <div className="rounded-lg p-5" style={{ background: "#0a0a0f", color: "white" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-semibold">Math Sprint</div>
        <div className="text-[12px] font-bold" style={{ color: C.amber }}>Score 12</div>
      </div>
      <div className="text-center py-6">
        <div className="text-[36px] font-bold" style={{ fontFamily: "JetBrains Mono, monospace" }}>44 + 36 = ?</div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[7,8,9,4,5,6,1,2,3].map(n => (
          <div key={n} className="rounded text-center py-2 text-[14px] font-medium" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>{n}</div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsMock() {
  const cells = Array.from({ length: 70 });
  return (
    <div>
      <div className="grid grid-cols-10 gap-[3px]">
        {cells.map((_, i) => {
          const a = Math.random();
          return <div key={i} className="rounded-sm" style={{ paddingTop: "100%", background: a > 0.7 ? C.purple : a > 0.4 ? "rgba(124,58,237,0.5)" : a > 0.2 ? "rgba(124,58,237,0.2)" : "#f4f4f5" }} />;
        })}
      </div>
      <div className="flex items-center gap-2 mt-4">
        <div className="text-[20px] font-bold" style={{ color: "#09090b" }}>47</div>
        <div className="text-[12px] text-zinc-600">days consistent this semester</div>
      </div>
      <div className="flex items-end gap-1.5 mt-4 h-12">
        {[40, 55, 30, 70, 90].map((h, i) => (
          <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: C.purple }} />
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   PROBLEM SECTION
   ────────────────────────────────────────────────────────────── */
function ProblemSection() {
  const items = [
    { icon: AlertTriangle, t: "Too many goals at once", b: "DSA, SQL, QA, DevOps, aptitude, applications — all at the same priority. Nothing moves forward." },
    { icon: Clock, t: "No daily execution system", b: "Every morning starts with 20 minutes of deciding what to work on. That time never comes back." },
    { icon: Battery, t: "Energy drained by college hours", b: "6 hours of class, then expected to study for 4 more. Nobody teaches you how to structure recovery." },
    { icon: Zap, t: "Scattered across 10 tools", b: "LeetCode. Notion. Excel sheets. WhatsApp notes. Nothing talks to each other." },
    { icon: TrendingDown, t: "No way to measure readiness", b: "You don't know if you're ready for TCS until the OA is in front of you." },
    { icon: Wifi, t: "Motivation dies in isolation", b: "Preparing alone with no accountability, no peers, no feedback loop." },
  ];
  return (
    <section style={{ background: C.sectionDark, padding: "96px 24px" }}>
      <div className="mx-auto" style={{ maxWidth: 1200 }}>
        <Reveal>
          <div className="text-center">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-wider rounded-full px-3 py-1" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>THE REALITY</span>
            <h2 className="mx-auto mt-4" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-1px", color: "white", maxWidth: 720, lineHeight: 1.15 }}>
              You're not behind because you lack ability.
            </h2>
            <p className="mx-auto mt-4" style={{ fontSize: 18, color: "rgba(255,255,255,0.5)", maxWidth: 540, lineHeight: 1.5 }}>
              You're running 10 prep tracks simultaneously with no system, no prioritization, and no way to measure progress.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <Reveal key={i} delay={i * 0.06}>
                <div className="rounded-xl p-6 h-full" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <Icon size={20} style={{ color: "rgba(255,255,255,0.3)" }} />
                  <div className="mt-4" style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>{it.t}</div>
                  <p className="mt-2" style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.55 }}>{it.b}</p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.2}>
          <div className="mt-16 flex flex-col items-center">
            <div style={{ width: 2, height: 48, background: "rgba(124,58,237,0.4)" }} />
            <ChevronDown size={16} style={{ color: C.purple }} />
            <div className="mt-3 text-sm font-medium" style={{ color: C.purple }}>There's a better way.</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────
   SOLUTION ROWS
   ────────────────────────────────────────────────────────────── */
function SolutionRows() {
  const rows = [
    {
      tag: "AI DAILY PLANNER",
      title: "One question. Five tasks. Zero decisions.",
      body: "Every morning, Taiyaar's AI looks at your upcoming interviews, weak areas, streak status, and energy — and generates exactly 5 things to do today. Not a list of everything. The right 5.",
      points: ["Adapts to your college schedule", "Prioritizes based on interview dates", "Detects when you're overloaded and cuts the list"],
      visual: <div className="p-6"><PlanMock /></div>,
      reverse: false,
    },
    {
      tag: "UNIFIED TRACKING",
      title: "DSA, jobs, and prep — in one place.",
      body: "Every problem you solve, every application you submit, every mock test you take feeds into one system. Your readiness score updates in real time.",
      points: ["Automatic company readiness scores", "DSA topics linked to company requirements", "Follow-up reminders that actually work"],
      visual: <div className="p-6"><JobsMock /></div>,
      reverse: true,
    },
    {
      tag: "ARENA",
      title: "Study hard. Play as a reward.",
      body: "The Arena unlocks only after your study windows are complete. Aptitude duels, math sprints, memory games — designed to keep your brain sharp without pulling you away from preparation.",
      points: ["Study window enforcement — games lock during prep hours", "Live aptitude duels with friends", "Weekly leaderboard, XP, and achievements"],
      visual: <ArenaMock />,
      reverse: false,
      darkVisual: true,
    },
  ];
  return (
    <section style={{ background: "white", padding: "96px 24px" }}>
      <div className="mx-auto space-y-24" style={{ maxWidth: 1100 }}>
        {rows.map((r, i) => (
          <Reveal key={i}>
            <div className={`grid md:grid-cols-2 gap-14 items-center ${r.reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
              <div>
                <span className="inline-block text-[11px] font-semibold uppercase tracking-wider rounded px-2 py-1" style={{ background: "rgba(124,58,237,0.1)", color: C.purple }}>{r.tag}</span>
                <h3 className="mt-4" style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.6px", color: "#09090b", lineHeight: 1.15 }}>{r.title}</h3>
                <p className="mt-4" style={{ fontSize: 16, lineHeight: 1.7, color: "#52525b" }}>{r.body}</p>
                <ul className="mt-6 space-y-3">
                  {r.points.map((p, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle2 size={16} style={{ color: C.purple, marginTop: 3 }} />
                      <span style={{ fontSize: 14, color: "#3f3f46" }}>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="rounded-[14px] overflow-hidden" style={{
                  background: r.darkVisual ? "#0a0a0f" : "white",
                  border: "1px solid #e4e4e7",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                }}>
                  {r.visual}
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────
   HOW IT WORKS
   ────────────────────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { n: "01", t: "Tell Taiyaar your targets", b: "Your target companies, target domains, graduation date, and daily available hours." },
    { n: "02", t: "Get your AI-generated roadmap", b: "Taiyaar builds a preparation plan across DSA, aptitude, domain skills, and job applications." },
    { n: "03", t: "Execute daily with your AI plan", b: "Every morning: 5 tasks. Every evening: streak protected. Every week: progress measured." },
    { n: "04", t: "Watch your readiness scores rise", b: "Per-company readiness scores update as you prepare. Know exactly when you're ready." },
  ];
  return (
    <section id="how" style={{ background: C.sectionLight, padding: "96px 24px" }}>
      <div className="mx-auto" style={{ maxWidth: 1200 }}>
        <Reveal>
          <div className="text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: C.purple }}>HOW IT WORKS</div>
            <h2 className="mx-auto mt-3" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-1px", color: "#09090b", maxWidth: 700, lineHeight: 1.15 }}>
              From chaos to clarity in 5 minutes.
            </h2>
            <p className="mx-auto mt-4" style={{ fontSize: 18, color: "#52525b", maxWidth: 520 }}>
              Set it up once. It runs your preparation from that day.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid md:grid-cols-4 gap-8 relative">
          <div className="hidden md:block absolute top-3 left-[12%] right-[12%] h-px" style={{ background: "#e4e4e7" }} />
          {steps.map((s, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <div className="relative">
                <div className="rounded-full mb-4" style={{ width: 28, height: 28, background: C.sectionLight, border: `1.5px solid ${C.purple}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: C.purple, fontWeight: 600 }}>
                  {s.n.slice(-1)}
                </div>
                <div className="text-[11px] font-mono mb-2" style={{ color: C.purple }}>{s.n}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#09090b" }}>{s.t}</div>
                <p className="mt-2" style={{ fontSize: 14, color: "#52525b", lineHeight: 1.6 }}>{s.b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────
   PRICING
   ────────────────────────────────────────────────────────────── */
function Pricing() {
  const [yearly, setYearly] = useState(false);
  return (
    <section id="pricing" style={{ background: "white", padding: "96px 24px" }}>
      <div className="mx-auto" style={{ maxWidth: 1100 }}>
        <Reveal>
          <div className="text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: C.purple }}>PRICING</div>
            <h2 className="mx-auto mt-3" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-1px", color: "#09090b", maxWidth: 700, lineHeight: 1.15 }}>
              Start free. Pay only when you need more.
            </h2>
            <p className="mx-auto mt-4" style={{ fontSize: 18, color: "#52525b", maxWidth: 520 }}>
              Designed for students. No trial periods. No gotchas.
            </p>
            <div className="inline-flex items-center mt-8 rounded-lg p-1" style={{ background: "#f4f4f5" }}>
              {[
                ["Monthly", false],
                ["Yearly · save 37%", true],
              ].map(([l, v]) => (
                <button
                  key={String(l)}
                  onClick={() => setYearly(v as boolean)}
                  className="px-4 h-8 rounded-md text-[13px] font-medium transition-all"
                  style={{
                    background: yearly === v ? "white" : "transparent",
                    color: yearly === v ? "#09090b" : "#71717a",
                    boxShadow: yearly === v ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                  }}
                >{l as string}</button>
              ))}
            </div>
          </div>
        </Reveal>

        <div className="mt-12 grid md:grid-cols-3 gap-5">
          <PricingCard
            name="Explorer" priceM="₹0" priceY="₹0" yearly={yearly} period="forever"
            description="Get started with essential tools."
            features={["30 daily tracker entries/month", "75 DSA problems", "20 job applications", "5 company profiles", "Focus timer", "All Arena games"]}
            cta="Get started free" variant="default"
          />
          <PricingCard
            name="Pro" priceM="₹199" priceY="₹125" yearly={yearly} period="month"
            yearTotal="₹1,499/year — save ₹889" badge="Most popular"
            description="For students who want the full system."
            features={["Everything in Explorer", "Unlimited trackers", "AI Daily Planner", "Overload Detector", "Full analytics + heatmaps", "Sprint planner", "Resource hub", "All company prep hubs", "2 streak freezes/month", "LinkedIn content planner"]}
            cta={`Start Pro — ${yearly ? "₹1,499/yr" : "₹199/mo"}`} variant="primary"
          />
          <PricingCard
            name="Elite" priceM="₹499" priceY="₹333" yearly={yearly} period="month"
            description="1:1 coaching & AI everything."
            features={["Everything in Pro", "AI Career Coach (24/7)", "AI Mock Interview", "AI Resume Analyzer", "Placement Probability Score", "Accountability Pod", "Senior Mentor session (1/mo)", "Early drive alerts"]}
            cta="Start Elite" variant="dark"
          />
        </div>

        <p className="text-center mt-8" style={{ fontSize: 13, color: "#71717a" }}>
          All plans include a 7-day free trial of Pro on signup. No credit card required.
        </p>
      </div>
    </section>
  );
}

function PricingCard({
  name, priceM, priceY, yearly, period, yearTotal, badge, description, features, cta, variant,
}: {
  name: string; priceM: string; priceY: string; yearly: boolean; period: string;
  yearTotal?: string; badge?: string; description: string; features: string[]; cta: string;
  variant: "default" | "primary" | "dark";
}) {
  const dark = variant === "dark";
  const primary = variant === "primary";

  return (
    <div className="relative rounded-2xl p-8" style={{
      background: dark ? "#09090b" : primary ? "linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)" : "white",
      border: primary ? `2px solid ${C.purple}` : "1px solid #e4e4e7",
    }}>
      {badge && (
        <div className="absolute top-4 right-4 rounded-full text-[11px] font-medium" style={{ background: C.purple, color: "white", padding: "3px 10px" }}>
          {badge}
        </div>
      )}
      <div className="text-[12px] uppercase tracking-wide font-semibold" style={{ color: dark ? "#a78bfa" : primary ? C.purple : "#71717a" }}>{name}</div>
      <div className="flex items-baseline gap-2 mt-3">
        <span style={{ fontSize: 36, fontWeight: 700, color: dark ? "white" : "#09090b" }}>{yearly ? priceY : priceM}</span>
        <span style={{ fontSize: 14, color: dark ? "rgba(255,255,255,0.4)" : "#a1a1aa" }}>/ {period}</span>
      </div>
      {primary && yearly && yearTotal && (
        <div className="mt-1 text-[12px]" style={{ color: C.purple }}>{yearTotal}</div>
      )}
      <p className="mt-3" style={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.55)" : "#52525b" }}>{description}</p>

      <div className="my-6 h-px" style={{ background: dark ? "rgba(255,255,255,0.08)" : "#f4f4f5" }} />

      <ul className="space-y-3 mb-8">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-3">
            <Check size={14} style={{ color: primary || dark ? C.purple : "#a1a1aa", marginTop: 3 }} />
            <span style={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.8)" : "#3f3f46" }}>{f}</span>
          </li>
        ))}
      </ul>

      <Link to="/login"
        className="block w-full rounded-lg text-center font-medium transition-colors"
        style={{
          height: 42, lineHeight: "42px", fontSize: 14,
          background: primary ? C.purple : dark ? "rgba(255,255,255,0.08)" : "white",
          color: primary ? "white" : dark ? "white" : "#09090b",
          border: primary ? "none" : dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #e4e4e7",
        }}
      >
        {cta}
      </Link>
      {primary && (
        <p className="text-center mt-3 text-[12px]" style={{ color: "#71717a" }}>No credit card for 7-day trial</p>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   TESTIMONIALS
   ────────────────────────────────────────────────────────────── */
function Testimonials() {
  const items = [
    ["Before Taiyaar, I had 4 Notion pages, 2 Excel sheets, and a WhatsApp group with myself. Now I open one app every morning and it tells me what to do. TCS interview in 3 weeks.", "Rohan M.", "VTU, Bengaluru"],
    ["The Placement Probability Score showed me I was 34% ready for Accenture. That number hurt — but it also told me exactly what to fix. Two months later, I had the offer.", "Priya S.", "BITS Pilani"],
    ["I was preparing for QA, DevOps, and Data Analytics simultaneously. Taiyaar's AI literally told me to stop and pick one. Best advice I never asked for.", "Aditya K.", "Pune University"],
    ["The Arena is the only reason I don't open Instagram during breaks. Beating my friends at aptitude duels is more satisfying than reels.", "Sneha R.", "Anna University"],
    ["I've used Notion, Obsidian, and three different productivity apps. This is the first one built for what I'm actually trying to do.", "Vikram N.", "NIT Trichy"],
    ["The streak system kept me consistent for 47 days straight. I've never prepared for anything that long in my life.", "Anjali T.", "SRM University"],
  ];
  return (
    <section style={{ background: C.sectionDark, padding: "96px 24px" }}>
      <div className="mx-auto" style={{ maxWidth: 1200 }}>
        <Reveal>
          <div className="text-center">
            <h2 className="mx-auto" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-1px", color: "white", maxWidth: 700, lineHeight: 1.15 }}>
              Students who switched to a system.
            </h2>
            <p className="mx-auto mt-4" style={{ fontSize: 18, color: "rgba(255,255,255,0.5)", maxWidth: 520 }}>
              Not marketing copy. Real results from real preparation.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(([q, name, detail], i) => (
            <Reveal key={i} delay={i * 0.06}>
              <div className="rounded-xl p-6 h-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.78)" }}>{q}</p>
                <div className="flex items-center gap-3 mt-5">
                  <div className="rounded-full flex items-center justify-center text-[12px] font-medium" style={{ width: 32, height: 32, background: "rgba(124,58,237,0.18)", color: C.purpleLight }}>
                    {name.split(" ").map(p => p[0]).join("")}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "white" }}>{name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{detail}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────
   FINAL CTA
   ────────────────────────────────────────────────────────────── */
function FinalCTA() {
  return (
    <section className="relative overflow-hidden" style={{
      background: `linear-gradient(160deg, ${C.heroDark} 0%, ${C.heroMid} 100%)`,
      padding: "120px 24px",
    }}>
      <div className="pointer-events-none absolute left-1/2 top-[20%] -translate-x-1/2" style={{
        width: 600, height: 400,
        background: "radial-gradient(ellipse, rgba(124,58,237,0.25) 0%, transparent 70%)",
      }} />
      <div className="relative mx-auto text-center" style={{ maxWidth: 720 }}>
        <Reveal>
          <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 700, letterSpacing: "-1.2px", color: "white", lineHeight: 1.1 }}>
            Your placement season starts now.
          </h2>
          <p className="mx-auto mt-5" style={{ fontSize: 18, color: "rgba(255,255,255,0.5)", maxWidth: 460 }}>
            Join 1,200+ students who stopped winging it and started preparing with a system.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
            <Link to="/login" className="rounded-lg font-medium flex items-center justify-center transition-colors"
              style={{ height: 44, padding: "0 24px", background: C.purple, color: "white", fontSize: 15 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.purpleLight)}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.purple)}
            >Start for free</Link>
            <a href="#pricing" className="rounded-lg flex items-center justify-center transition-colors"
              style={{ height: 44, padding: "0 24px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.75)", fontSize: 15 }}
            >See pricing</a>
          </div>
          <p className="mt-5" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            Free forever plan available · Takes 5 minutes to set up · No credit card
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────
   FOOTER
   ────────────────────────────────────────────────────────────── */
function Footer() {
  const cols = [
    { h: "Product", links: ["Features", "Pricing", "Changelog", "Roadmap"] },
    { h: "Resources", links: ["Blog", "Documentation", "Community", "Status"] },
    { h: "Company", links: ["About", "Privacy", "Terms", "Contact"] },
    { h: "For students", links: ["Resume templates", "Company prep guides", "Student community"] },
  ];
  return (
    <footer style={{ background: C.sectionDark, borderTop: "1px solid rgba(255,255,255,0.06)", padding: "64px 24px 40px" }}>
      <div className="mx-auto grid md:grid-cols-5 gap-10" style={{ maxWidth: 1200 }}>
        <div className="md:col-span-1">
          <Wordmark />
          <p className="mt-4" style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.5, maxWidth: 220 }}>
            The preparation platform for Indian engineering students.
          </p>
          <div className="flex gap-1 mt-4">
            {[Github, Twitter, Linkedin].map((Icon, i) => (
              <a key={i} href="#" className="flex items-center justify-center rounded-md transition-colors"
                style={{ width: 32, height: 32, color: "rgba(255,255,255,0.3)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.h}>
            <div className="text-[11px] uppercase tracking-wider mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>{c.h}</div>
            <ul className="space-y-2.5">
              {c.links.map((l) => (
                <li key={l}>
                  <a href="#" className="transition-colors" style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.85)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}>
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ maxWidth: 1200, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>© 2026 Taiyaar. All rights reserved.</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Made for India's engineering students.</div>
      </div>
    </footer>
  );
}

/* ──────────────────────────────────────────────────────────────
   PAGE
   ────────────────────────────────────────────────────────────── */
function LandingPage() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" />;
  return (
    <div style={{ background: C.heroDark, color: "white", fontFamily: "Inter, system-ui, sans-serif", scrollBehavior: "smooth" as const }}>
      <Nav />
      <Hero />
      <SocialProof />
      <FeatureTabs />
      <ProblemSection />
      <SolutionRows />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </div>
  );
}
