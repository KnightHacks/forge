export default function Page() {
  const stats = [
    { value: "~70%", label: "Reduced selection time" },
    { value: "5–10%", label: "Macro target band" },
    { value: "15,000+", label: "Speech samples" },
    { value: "~80%", label: "Therapy consistency" },
  ];

  const featuredProject = {
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
    time: "Nov 2025 – Jan 2026",
    what:
      "Personalized macro planning for 200+ restaurant/fast-food items and custom targets.",
    how: "Macro Fit Score algorithm + AI assistant returns top 3 optimized meal suggestions per query; Chart.js daily macro visualization.",
    impact:
      "Reduced manual food selection time by ~70% and kept users within 5–10% of targets.",
  };

  const projects = [
    {
      name: "FinBridge",
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
      time: "Oct 2025",
      what:
        "Real-time transaction ingestion and spending insights with LLM-guided advice.",
      how: "Prompt pipeline injects balances, categorized transactions, and monthly summaries into Gemini; Chart.js dashboards for live data in a secure multi-user Firebase model.",
      impact:
        "Turned raw bank data into context-aware guidance with actionable budgeting views.",
    },
    {
      name: "FlipScript",
      stack: [
        "JavaScript",
        "React",
        "Express",
        "Node.js",
        "Tailwind",
        "OpenAI Whisper",
      ],
      time: "Sep 2025",
      what: "Speech-to-study pipeline that turns lectures into learning assets.",
      how: "Whisper creates punctuated, timestamped transcripts; AI structures notes and highlights key concepts; flashcards optimized for active recall and spaced repetition.",
      impact:
        "Accelerated study prep by converting raw audio into structured learning artifacts.",
    },
  ];

  return (
    <div className="relative">
      <input id="theme-toggle" type="checkbox" className="peer sr-only" />
      <div className="min-h-screen bg-[#0b0f14] text-white transition-colors duration-500 [scroll-behavior:smooth] peer-checked:bg-[#f8fafc] peer-checked:text-slate-900 peer-checked:[&_p]:text-slate-700 peer-checked:[&_li]:text-slate-700 peer-checked:[&_span]:text-slate-600 peer-checked:[&_h1]:text-slate-900 peer-checked:[&_h2]:text-slate-900 peer-checked:[&_h3]:text-slate-900 peer-checked:[&_header]:border-slate-200/70 peer-checked:[&_header]:bg-white/80 peer-checked:[&_.header-line]:via-slate-400/60 peer-checked:[&_.muted]:text-slate-600 peer-checked:[&_.card]:border-slate-200/70 peer-checked:[&_.card]:bg-white peer-checked:[&_.chip]:bg-slate-900/5 peer-checked:[&_.chip]:text-slate-700 peer-checked:[&_.chip]:border-slate-900/10 peer-checked:[&_.btn-primary]:bg-slate-900 peer-checked:[&_.btn-primary]:text-white peer-checked:[&_.btn-secondary]:border-slate-200 peer-checked:[&_.btn-secondary]:text-slate-700 peer-checked:[&_.btn-secondary]:hover:text-slate-900 peer-checked:[&_.btn-disabled]:border-slate-200 peer-checked:[&_.btn-disabled]:text-slate-400 peer-checked:[&_.theme-toggle]:border-slate-200 peer-checked:[&_.theme-toggle]:bg-white peer-checked:[&_.theme-label]:text-slate-700 peer-checked:[&_.toggle-track]:bg-slate-900/10 peer-checked:[&_.toggle-dot]:translate-x-5 peer-checked:[&_.toggle-dot]:bg-slate-900 peer-checked:[&_.bg-top]:opacity-40 peer-checked:[&_.bg-mid]:opacity-30 peer-checked:[&_.bg-low]:opacity-20">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="bg-top absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_55%)] opacity-70 transition-opacity duration-500" />
          <div className="bg-mid absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(125,211,252,0.12),transparent_40%)] opacity-60 transition-opacity duration-500" />
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
            >
              AU
            </a>
            <div className="hidden flex-wrap items-center gap-4 text-sm text-slate-300 md:flex">
              <a
                className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                href="#projects"
              >
                Projects
              </a>
              <a
                className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                href="#research"
              >
                Research
              </a>
              <a
                className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                href="#signal"
              >
                Signal
              </a>
              <a
                className="transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                href="#contact"
              >
                Contact
              </a>
            </div>
            <label
              htmlFor="theme-toggle"
              className="theme-toggle flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-cyan-200/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
            >
              <span className="sr-only">Toggle theme</span>
              <span className="theme-label">Theme</span>
              <span className="toggle-track relative h-5 w-10 rounded-full bg-white/10 transition">
                <span className="toggle-dot absolute left-1 top-1 h-3 w-3 rounded-full bg-cyan-200 transition" />
              </span>
            </label>
          </nav>
          <div className="header-line h-[2px] w-full bg-gradient-to-r from-cyan-400/0 via-cyan-300/60 to-cyan-400/0" />
        </header>

        <main
          id="top"
          className="mx-auto w-full max-w-6xl px-6 pb-20 pt-12 sm:pb-24"
        >
          <section className="grid gap-10 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-7">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
                KnightHacks Forge Dev Team Application
              </p>
              <div>
                <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                  Abduaziz Umarov
                </h1>
                <p className="muted mt-3 text-sm uppercase tracking-[0.4em]">
                  Craft → Mastery → Impact
                </p>
              </div>
              <p className="muted text-base leading-relaxed sm:text-lg">
                I build systems with care: forge the model, iterate the
                interface, and ship outcomes that matter. I want to help Forge
                deliver tools that feel crafted, not cobbled.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  className="btn-primary rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:translate-y-[-1px] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                  href="./public/Resume2026.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  Resume
                </a>
                <a
                  className="btn-secondary rounded-full border border-white/20 px-5 py-2 text-sm text-slate-100 transition hover:border-cyan-200/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                  href="https://github.com/azizu06"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub
                </a>
                <a
                  className="btn-secondary rounded-full border border-white/20 px-5 py-2 text-sm text-slate-100 transition hover:border-cyan-200/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                  href="https://www.linkedin.com/in/abduaziz-umarov/"
                  target="_blank"
                  rel="noreferrer"
                >
                  LinkedIn
                </a>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {stats.map((stat) => (
                  <div
                    key={stat.value}
                    className="card rounded-2xl border border-white/10 bg-white/5 p-4 transition duration-300 motion-safe:hover:-translate-y-1"
                  >
                    <p className="text-2xl font-semibold">{stat.value}</p>
                    <p className="muted mt-1 text-xs uppercase tracking-[0.2em] font-mono">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 to-white/0 p-6 shadow-[0_0_60px_rgba(34,211,238,0.12)]">
              <h2 className="text-sm uppercase tracking-[0.2em] text-slate-300">
                Craft → Mastery → Impact
              </h2>
              <div className="mt-6 space-y-5 text-sm text-slate-200">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
                    Craft
                  </p>
                  <p className="mt-2">
                    Start with fundamentals, build the smallest reliable core,
                    and make it feel intentional.
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
                    Mastery
                  </p>
                  <p className="mt-2">
                    Iterate with data and feedback loops until the experience is
                    trustworthy.
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
                    Impact
                  </p>
                  <p className="mt-2">
                    Ship features that save time, build confidence, and unlock
                    real outcomes.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-12 h-px w-full bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />

          <section className="mt-14 grid gap-8 md:grid-cols-[1.1fr_0.9fr]">
            <div className="card rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-sm uppercase tracking-[0.2em] text-slate-300">
                Education
              </h2>
              <div className="mt-4 space-y-2">
                <p className="text-lg font-semibold">
                  University of Central Florida — B.S. Computer Science
                </p>
                <p className="muted text-sm">May 2028 • GPA 4.00</p>
                <p className="muted text-sm">
                  Coursework: Data Structures &amp; Algorithms, Computer Hardware
                  &amp; Logic, OOP, Discrete Structures
                </p>
              </div>
            </div>
            <div className="card rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-sm uppercase tracking-[0.2em] text-slate-300">
                Organization
              </h2>
              <p className="mt-4 text-lg font-semibold">KnightHacks</p>
              <p className="muted mt-2 text-sm">
                Building with the Forge team to ship developer-facing tools that
                feel intentional and reliable.
              </p>
            </div>
          </section>

          <section id="projects" className="mt-16 scroll-mt-24">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold">Projects</h2>
                <p className="muted mt-2 text-sm">
                  Case studies tuned for real-world impact and iteration speed.
                </p>
              </div>
              <span className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">
                Case Studies
              </span>
            </div>

            <article className="card mt-8 grid gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/6 to-transparent p-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <span className="text-xs uppercase tracking-[0.3em] text-cyan-200/70 font-mono">
                  Featured Project
                </span>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xl font-semibold">
                    {featuredProject.name}
                  </h3>
                  <span className="muted text-xs">{featuredProject.time}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {featuredProject.stack.map((item) => (
                    <span
                      key={item}
                      className="chip rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200 font-mono"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <div className="space-y-4 text-sm text-slate-200">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">
                      What
                    </p>
                    <p className="mt-1">{featuredProject.what}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">
                      How
                    </p>
                    <p className="mt-1">{featuredProject.how}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">
                      Impact
                    </p>
                    <p className="mt-1">{featuredProject.impact}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    title="Coming soon"
                    disabled
                    className="btn-disabled cursor-not-allowed rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 opacity-70"
                  >
                    Demo
                  </button>
                  <button
                    type="button"
                    title="Coming soon"
                    disabled
                    className="btn-disabled cursor-not-allowed rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 opacity-70"
                  >
                    Repo
                  </button>
                </div>
              </div>
              <div className="flex h-full items-center">
                <div className="h-56 w-full rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/20 via-white/5 to-transparent" />
              </div>
            </article>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {projects.map((project) => (
                <article
                  key={project.name}
                  className="card group rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/0 p-6 transition duration-300 motion-safe:hover:-translate-y-1"
                >
                  <div className="h-32 rounded-xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent" />
                  <div className="mt-5 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{project.name}</h3>
                    <span className="muted text-xs">{project.time}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {project.stack.map((item) => (
                      <span
                        key={item}
                        className="chip rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200 font-mono"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 space-y-4 text-sm text-slate-200">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">
                        What
                      </p>
                      <p className="mt-1">{project.what}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">
                        How
                      </p>
                      <p className="mt-1">{project.how}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">
                        Impact
                      </p>
                      <p className="mt-1">{project.impact}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center gap-3">
                    <button
                      type="button"
                      title="Coming soon"
                      disabled
                      className="btn-disabled cursor-not-allowed rounded-full border border-white/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 opacity-70"
                    >
                      Demo
                    </button>
                    <button
                      type="button"
                      title="Coming soon"
                      disabled
                      className="btn-disabled cursor-not-allowed rounded-full border border-white/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 opacity-70"
                    >
                      Repo
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section id="research" className="mt-16 scroll-mt-24">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">Research</h2>
              <span className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">
                ISUE Lab
              </span>
            </div>
            <div className="card mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-semibold">
                  Undergraduate Research Assistant
                </p>
                <span className="muted text-xs">Oct 2025 – Present</span>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-200">
                <li>
                  Built a custom speech-error dataset by comparing 15,000+ samples
                  of control and dysarthric recordings; labeled error types and
                  therapy advice using Pandas/NumPy.
                </li>
                <li>
                  Developed a therapist-oriented model in PyTorch to generate
                  personalized speech feedback; ~80% consistency with verified
                  therapy strategies.
                </li>
                <li>
                  Conducted pilot evaluations with dysarthric speakers to validate
                  usability and refine feedback quality with clinician input.
                </li>
                <li>
                  Co-authored a research paper; contributed to dataset
                  construction and evaluation sections.
                </li>
              </ul>
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
            <h2 className="text-2xl font-semibold">Learning Loop</h2>
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
              <h2 className="text-2xl font-semibold">Signal</h2>
              <span className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">
                First 2–4 Weeks
              </span>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
              <div className="card rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm text-slate-200">
                  In the first month, I would focus on understanding Forge's
                  architecture, auditing key flows, and shipping targeted
                  improvements that remove friction for teammates and users.
                </p>
                <ul className="mt-4 space-y-3 text-sm text-slate-200">
                  <li>
                    Pair with a maintainer to map core workflows, identify the top
                    3 bottlenecks, and propose fixes with measurable impact.
                  </li>
                  <li>
                    Build a small internal dashboard or health checklist for
                    tracking deployment and data integrity signals.
                  </li>
                  <li>
                    Ship one focused UI polish pass: clarity in forms, consistent
                    error states, and stronger onboarding cues.
                  </li>
                </ul>
              </div>
              <div className="card rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                  Availability
                </p>
                <p className="mt-3 text-sm text-slate-200">
                  Ready to contribute weekly and take ownership of a scoped
                  feature from design to delivery.
                </p>
                <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-300">
                  Contact
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <a
                    className="btn-secondary rounded-full border border-white/20 px-4 py-2 text-xs text-slate-100 transition hover:border-cyan-200/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                    href="https://github.com/azizu06"
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub
                  </a>
                  <a
                    className="btn-secondary rounded-full border border-white/20 px-4 py-2 text-xs text-slate-100 transition hover:border-cyan-200/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                    href="https://www.linkedin.com/in/abduaziz-umarov/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    LinkedIn
                  </a>
                </div>
              </div>
            </div>
          </section>

          <footer
            id="contact"
            className="mt-16 border-t border-white/10 pt-8 text-sm text-slate-300"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p>
                Built for the KnightHacks Forge Dev Team — craft, mastery,
                impact.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  className="btn-secondary rounded-full border border-white/20 px-4 py-2 text-xs text-slate-100 transition hover:border-cyan-200/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                  href="/aziz/Resume2026.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  Resume
                </a>
                <a
                  className="btn-secondary rounded-full border border-white/20 px-4 py-2 text-xs text-slate-100 transition hover:border-cyan-200/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                  href="https://github.com/azizu06"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub
                </a>
                <a
                  className="btn-secondary rounded-full border border-white/20 px-4 py-2 text-xs text-slate-100 transition hover:border-cyan-200/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
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
