export default function Page() {
  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_55%)]" />
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0f14]/80 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <a
            href="#top"
            className="text-sm font-semibold tracking-[0.2em] text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
          >
            AU
          </a>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
            <a className="hover:text-white" href="#projects">
              Projects
            </a>
            <a className="hover:text-white" href="#research">
              Research
            </a>
            <a className="hover:text-white" href="#learning">
              Learning Loop
            </a>
            <a className="hover:text-white" href="#signal">
              Signal
            </a>
          </div>
        </nav>
        <div className="h-[2px] w-full bg-gradient-to-r from-cyan-400/0 via-cyan-300/60 to-cyan-400/0" />
      </header>

      <main id="top" className="mx-auto w-full max-w-6xl px-6 pb-20 pt-12">
        <section className="grid gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
              KnightHacks Forge Dev Team Application
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Abduaziz Umarov
            </h1>
            <p className="text-base leading-relaxed text-slate-300 sm:text-lg">
              I build systems with care: forge the model, iterate the interface,
              and ship outcomes that matter. I want to help Forge deliver tools
              that feel crafted, not cobbled.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:translate-y-[-1px] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                href="/aziz/Resume2026.pdf"
                target="_blank"
                rel="noreferrer"
              >
                Resume
              </a>
              <a
                className="rounded-full border border-white/20 px-4 py-2 text-sm text-slate-100 transition hover:border-cyan-200/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                href="https://github.com/azizu06"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
              <a
                className="rounded-full border border-white/20 px-4 py-2 text-sm text-slate-100 transition hover:border-cyan-200/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                href="https://www.linkedin.com/in/abduaziz-umarov/"
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 shadow-[0_0_60px_rgba(34,211,238,0.12)]">
            <h2 className="text-sm uppercase tracking-[0.2em] text-slate-300">
              Craft → Mastery → Impact
            </h2>
            <div className="mt-6 space-y-5 text-sm text-slate-200">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
                  Craft
                </p>
                <p className="mt-2">
                  Start with fundamentals, build the smallest reliable core, and
                  make it feel intentional.
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

        <section id="projects" className="mt-16">
          <h2 className="text-2xl font-semibold">Projects</h2>
        </section>

        <section id="research" className="mt-16">
          <h2 className="text-2xl font-semibold">Research</h2>
        </section>

        <section id="learning" className="mt-16">
          <h2 className="text-2xl font-semibold">Learning Loop</h2>
        </section>

        <section id="signal" className="mt-16">
          <h2 className="text-2xl font-semibold">Signal</h2>
        </section>
      </main>
    </div>
  );
}
