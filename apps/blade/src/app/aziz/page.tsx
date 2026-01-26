"use client";

import type { MouseEvent } from "react";

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

  const project = {
    name: "MacroMatch",
    stack: [
      "TypeScript",
      "Next.js",
      "Tailwind",
      "PostgreSQL",
      "Prisma",
      "NextAuth",
      "OpenAI API",
    ],
    time: "Nov 2025 – Present",
    what: "Personalized macro planning for 200+ restaurant/fast-food items and custom targets.",
    how: "Macro Fit Score algorithm + AI assistant returns top 3 optimized meal suggestions per query; Chart.js daily macro visualization.",
    impact:
      "Reduced manual food selection time by ~70% and kept users within 5–10% of targets.",
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
                href="#projects"
                onClick={handleNavClick}
              >
                Projects
              </a>
              <a
                className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                href="#research"
                onClick={handleNavClick}
              >
                Experience
              </a>
              <a
                className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                href="#signal"
                onClick={handleNavClick}
              >
                Signal
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
          <section className="grid gap-12 md:grid-cols-[1.15fr_0.85fr]">
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
                I enjoy building clean systems with care and ship outcomes that
                matter. I want to work in collaborative teams like Forge to grow
                as a developer.
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

          <section id="projects" className="mt-16 scroll-mt-24">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-3xl font-semibold">
                  Projects
                </h2>
                <p className="muted mt-2 max-w-prose text-base leading-relaxed">
                  Case studies tuned for real-world impact and iteration speed.
                </p>
              </div>
            </div>

            <div className="mt-8 max-w-3xl">
              <article className="card group rounded-2xl border border-white/10 bg-white/5 p-7 transition duration-300 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_18px_45px_rgba(15,23,42,0.35)]">
                <div className="h-36 rounded-xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent" />
                <div className="mt-6 flex items-center justify-between">
                  <h3 className="font-heading text-xl font-semibold">
                    {project.name}
                  </h3>
                  <span className="muted text-sm">{project.time}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {project.stack.map((item) => (
                    <span
                      key={item}
                      className="chip rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <div className="mt-5 space-y-5 text-base leading-relaxed text-slate-200">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">
                      What
                    </p>
                    <p className="mt-2">{project.what}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">
                      How
                    </p>
                    <p className="mt-2">{project.how}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">
                      Impact
                    </p>
                    <p className="mt-2">{project.impact}</p>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section id="research" className="mt-16 scroll-mt-24">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-heading text-3xl font-semibold">
                Experience
              </h2>
              <span className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">
                ISUE Lab
              </span>
            </div>
            <div className="mt-8 max-w-3xl">
              <div className="card rounded-2xl border border-white/10 bg-white/5 p-7 transition duration-300 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_18px_45px_rgba(15,23,42,0.35)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-heading text-xl font-semibold">
                    Undergraduate Research Assistant
                  </p>
                  <span className="muted text-sm">Oct 2025 – Present</span>
                </div>
                <ul className="mt-5 space-y-4 text-base leading-relaxed text-slate-200">
                  <li>
                    Built a custom speech-error dataset by comparing 15,000+
                    samples of control and dysarthric recordings; labeled error
                    types and therapy advice using Pandas/NumPy.
                  </li>
                  <li>
                    Developed a therapist-oriented model in PyTorch to generate
                    personalized speech feedback; ~80% consistency with verified
                    therapy strategies.
                  </li>
                  <li>
                    Conducted pilot evaluations with dysarthric speakers to
                    validate usability and refine feedback quality with
                    clinician input.
                  </li>
                  <li>
                    Co-authored a research paper; contributed to dataset
                    construction and evaluation sections.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mt-16">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-slate-400">
              <div className="h-px w-10 bg-cyan-300/60" />
              Commit Log
            </div>
            <div className="mt-6 space-y-6 border-l border-white/10 pl-6 text-sm text-slate-200">
              <div>
                <p className="muted text-xs">Baseline</p>
                <p className="mt-1">
                  Map the smallest reliable scope, define the metrics that prove
                  impact.
                </p>
              </div>
              <div>
                <p className="muted text-xs">Iteration</p>
                <p className="mt-1">
                  Compare two approaches, quantify the better path, and ship the
                  cleaner interface.
                </p>
              </div>
              <div>
                <p className="muted text-xs">Impact</p>
                <p className="mt-1">
                  Close the loop with users, translate their feedback into
                  focused refinements.
                </p>
              </div>
            </div>
          </section>

          <section id="learning" className="mt-16 scroll-mt-24">
            <h2 className="font-heading text-2xl font-semibold">
              Learning Loop
            </h2>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "Ask Why Repeatedly",
                  body: "Pressure test every requirement until the real problem is clear.",
                },
                {
                  title: "Compare Approaches",
                  body: "Prototype two solutions, measure impact, and ship the stronger one.",
                },
                {
                  title: "Fundamentals Compound",
                  body: "Data structures, systems thinking, and clarity in UI decisions compound over time.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="card rounded-2xl border border-white/10 bg-white/5 p-6 transition duration-300 motion-safe:hover:-translate-y-1"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">
                    {item.title}
                  </p>
                  <p className="mt-3 text-sm text-slate-200">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="signal" className="mt-16 scroll-mt-24">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-heading text-2xl font-semibold">Signal</h2>
            </div>
            <div className="mt-6 grid gap-6">
              <div className="card rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm text-slate-200">
                  In the first month, I would focus on understanding Forge's
                  architecture, auditing key flows, and shipping targeted
                  improvements that remove friction for teammates and users.
                </p>
                <ul className="mt-4 space-y-3 text-sm text-slate-200">
                  <li>
                    Pair with a maintainer to map core workflows, identify the
                    top 3 bottlenecks, and propose fixes with measurable impact.
                  </li>
                  <li>
                    Build a small internal dashboard or health checklist for
                    tracking deployment and data integrity signals.
                  </li>
                  <li>
                    Ship one focused UI polish pass: clarity in forms,
                    consistent error states, and stronger onboarding cues.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <footer
            id="contact"
            className="mt-16 border-t border-white/10 pt-8 text-sm text-slate-300"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p>Built for the KnightHacks Forge Dev Team</p>
              <div className="flex-wrap1 flex-3 gap-30">
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
