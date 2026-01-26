"use client";

import type { MouseEvent } from "react";
import { useState } from "react";

export default function Page() {
  const handleNavClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const targetId = event.currentTarget.getAttribute("href");
    if (!targetId?.startsWith("#")) return;
    const target = document.querySelector(targetId);
    if (!target) return;
    event.preventDefault();
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    target.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  const timeline = [
    {
      id: "finbridge",
      title: "FinBridge",
      date: "Oct 2025",
      hash: "a1b2c3d",
      stack: [
        "TypeScript",
        "React",
        "Express",
        "Node.js",
        "Tailwind",
        "Firebase",
        "Gemini",
        "Plaid API",
      ],
      bullets: [
        {
          label: "What",
          text: "Real-time transaction ingestion and spending insights with LLM-guided advice.",
        },
        {
          label: "How",
          text: "Prompt pipeline injects balances, categorized transactions, and monthly summaries into Gemini; Chart.js dashboards for live data in a secure multi-user Firebase model.",
        },
        {
          label: "Impact",
          text: "Turned raw bank data into context-aware guidance with actionable budgeting views.",
        },
      ],
    },
    {
      id: "flipscript",
      title: "FlipScript",
      date: "Sep 2025",
      hash: "b4c5d6e",
      stack: [
        "JavaScript",
        "React",
        "Express",
        "Node.js",
        "Tailwind",
        "OpenAI Whisper",
      ],
      bullets: [
        {
          label: "What",
          text: "Speech-to-study pipeline that turns lectures into learning assets.",
        },
        {
          label: "How",
          text: "Whisper creates punctuated, timestamped transcripts; AI structures notes and highlights key concepts; flashcards optimized for active recall and spaced repetition.",
        },
        {
          label: "Impact",
          text: "Accelerated study prep by converting raw audio into structured learning artifacts.",
        },
      ],
    },
    {
      id: "isue-lab",
      title: "ISUE Lab",
      role: "Undergraduate Research Assistant",
      date: "Oct 2025 – Present",
      hash: "c7d8e9f",
      bullets: [
        "Built a custom speech-error dataset by comparing 15,000+ samples of control and dysarthric recordings; labeled error types and therapy advice using Pandas/NumPy.",
        "Developed a therapist-oriented model in PyTorch to generate personalized speech feedback; ~80% consistency with verified therapy strategies.",
        "Conducted pilot evaluations with dysarthric speakers to validate usability and refine feedback quality with clinician input.",
        "Co-authored a research paper; contributed to dataset construction and evaluation sections.",
      ],
    },
    {
      id: "macromatch",
      title: "MacroMatch",
      date: "Nov 2025 – Jan 2026",
      hash: "d0e1f2a",
      stack: [
        "TypeScript",
        "Next.js",
        "Tailwind",
        "PostgreSQL",
        "Prisma",
        "NextAuth",
        "OpenAI API",
      ],
      bullets: [
        {
          label: "What",
          text: "Personalized macro planning for 200+ restaurant/fast-food items and custom targets.",
        },
        {
          label: "How",
          text: "Macro Fit Score algorithm + AI assistant returns top 3 optimized meal suggestions per query; Chart.js daily macro visualization.",
        },
        {
          label: "Impact",
          text: "Reduced manual food selection time by ~70% and kept users within 5–10% of targets.",
        },
      ],
    },
  ];

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleEntry = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyLink = async (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.location.hash = id;
    }
  };

  return (
    <div className="relative">
      <div className="min-h-screen bg-[#0b0f14] text-white [scroll-behavior:smooth]">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_55%)] bg-top opacity-60 transition-opacity duration-500" />
          <div className="bg-mid absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(125,211,252,0.12),transparent_40%)] opacity-50 transition-opacity duration-500" />
          <div className="bg-low absolute inset-0 bg-[linear-gradient(120deg,rgba(148,163,184,0.08),transparent_40%,rgba(148,163,184,0.06))] opacity-30 transition-opacity duration-500" />
        </div>

        <a
          href="#top"
          className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
        >
          Skip to content
        </a>

        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0f14]/80 backdrop-blur">
          <nav
            aria-label="Primary"
            className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4"
          >
            <a
              href="#top"
              className="text-sm font-semibold tracking-[0.2em] text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
              onClick={handleNavClick}
            >
              AU
            </a>
            <div className="hidden flex-wrap items-center gap-4 text-sm text-slate-300 md:flex">
              <a
                className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                href="#about"
                onClick={handleNavClick}
              >
                About
              </a>
              <a
                className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                href="#commit-log"
                onClick={handleNavClick}
              >
                Commit Log
              </a>
              <a
                className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                href="#contact"
                onClick={handleNavClick}
              >
                Contact
              </a>
            </div>
          </nav>
          <div className="header-line h-[2px] w-full bg-gradient-to-r from-cyan-400/0 via-cyan-300/60 to-cyan-400/0" />
        </header>

        <main
          id="top"
          className="mx-auto w-full max-w-6xl px-6 pb-24 pt-14 sm:pb-28"
        >
          <section
            id="about"
            className="grid gap-12 md:grid-cols-[1.15fr_0.85fr]"
          >
            <div className="space-y-8">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/80">
                KnightHacks Forge Dev Team Application
              </p>
              <div>
                <h1 className="font-heading text-5xl font-semibold leading-tight sm:text-6xl">
                  Abduaziz Umarov
                </h1>
              </div>
              <p className="muted max-w-prose text-base leading-relaxed sm:text-lg">
                I njoy building clean systems with care and ship outcomes that
                matter. I want to work in a collaborative team like Forge to
                grow as a developer.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  className="btn-secondary inline-flex h-11 items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 text-sm font-semibold text-slate-100 transition hover:-translate-y-1 hover:border-cyan-200/60 hover:text-white hover:shadow-[0_10px_25px_rgba(34,211,238,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                  href="/aziz/Resume2026.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  Resume
                </a>
                <a
                  className="btn-secondary inline-flex h-11 items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 text-sm font-semibold text-slate-100 transition hover:-translate-y-1 hover:border-cyan-200/60 hover:text-white hover:shadow-[0_10px_25px_rgba(34,211,238,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                  href="https://github.com/azizu06"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub
                </a>
                <a
                  className="btn-secondary inline-flex h-11 items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 text-sm font-semibold text-slate-100 transition hover:-translate-y-1 hover:border-cyan-200/60 hover:text-white hover:shadow-[0_10px_25px_rgba(34,211,238,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                  href="https://www.linkedin.com/in/abduaziz-umarov/"
                  target="_blank"
                  rel="noreferrer"
                >
                  LinkedIn
                </a>
              </div>
            </div>

            <div className="card rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_0_60px_rgba(34,211,238,0.12)]">
              <h2 className="font-heading text-xl uppercase tracking-[0.25em] text-cyan-200/80">
                About Me
              </h2>
              <p className="mt-3 text-lg leading-relaxed text-slate-200">
                I’m a CS student interested in full-stack development,
                data-driven apps, and AI-powered tools. I enjoy working in
                existing codebases, writing readable code, and learning from
                code reviews.
              </p>
            </div>
          </section>

          <div className="mt-16 h-px w-full bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />

          <section id="commit-log" className="mt-16 scroll-mt-24">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-heading text-3xl font-semibold">
                My Commit Log
              </h2>
            </div>

            <div className="relative mt-10">
              <div className="absolute left-4 top-0 h-full w-px bg-white/10" />
              <div className="space-y-10">
                {timeline.map((entry) => {
                  const isExpanded = expanded[entry.id];
                  const bullets = Array.isArray(entry.bullets)
                    ? entry.bullets.slice(
                        0,
                        isExpanded ? entry.bullets.length : 3,
                      )
                    : [];
                  const hasMore = entry.bullets.length > 3;
                  return (
                    <article
                      key={entry.id}
                      id={entry.id}
                      className="relative pl-12"
                    >
                      <span className="absolute left-[9px] top-6 h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_0_6px_rgba(11,15,20,0.9)]" />
                      <div className="card rounded-2xl border border-white/10 bg-white/5 p-7 transition duration-300 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_18px_45px_rgba(15,23,42,0.35)]">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <h3 className="font-heading text-xl font-semibold">
                              {entry.title}
                            </h3>
                            {"role" in entry && entry.role ? (
                              <p className="muted mt-1 text-base">
                                {entry.role}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                            <span className="font-mono uppercase tracking-[0.2em]">
                              {entry.hash}
                            </span>
                            <span className="font-mono">{entry.date}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyLink(entry.id)}
                              className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-300 transition hover:border-cyan-200/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                              aria-label={`Copy link to ${entry.title}`}
                            >
                              Copy link
                            </button>
                          </div>
                        </div>

                        {"stack" in entry && entry.stack ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {entry.stack.map((item) => (
                              <span
                                key={item}
                                className="chip rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <ul className="mt-5 space-y-4 text-base leading-relaxed text-slate-200">
                          {bullets.map((bullet, index) => (
                            <li key={index}>
                              {typeof bullet === "string" ? (
                                bullet
                              ) : (
                                <>
                                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-200/70">
                                    {bullet.label}
                                  </span>
                                  <p className="mt-2">{bullet.text}</p>
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                        {hasMore ? (
                          <button
                            type="button"
                            onClick={() => toggleEntry(entry.id)}
                            className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-200/80 transition hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                          >
                            {isExpanded ? "Show less" : "Show more"}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <footer
            id="contact"
            className="mt-16 border-t border-white/10 pt-8 text-sm text-slate-300"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p>Built for the KnightHacks Forge Dev Team</p>
              <div className="flex flex-wrap gap-3">
                <a
                  className="btn-secondary inline-flex h-10 items-center justify-center rounded-full border border-white/20 bg-white/5 px-5 text-xs font-semibold text-slate-100 transition hover:-translate-y-1 hover:border-cyan-200/60 hover:text-white hover:shadow-[0_10px_25px_rgba(34,211,238,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                  href="/aziz/Resume2026.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  Resume
                </a>
                <a
                  className="btn-secondary inline-flex h-10 items-center justify-center rounded-full border border-white/20 bg-white/5 px-5 text-xs font-semibold text-slate-100 transition hover:-translate-y-1 hover:border-cyan-200/60 hover:text-white hover:shadow-[0_10px_25px_rgba(34,211,238,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                  href="https://github.com/azizu06"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub
                </a>
                <a
                  className="btn-secondary inline-flex h-10 items-center justify-center rounded-full border border-white/20 bg-white/5 px-5 text-xs font-semibold text-slate-100 transition hover:-translate-y-1 hover:border-cyan-200/60 hover:text-white hover:shadow-[0_10px_25px_rgba(34,211,238,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                  href="https://www.linkedin.com/in/abduaziz-umarov/"
                  target="_blank"
                  rel="noreferrer"
                >
                  LinkedIn
                </a>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
