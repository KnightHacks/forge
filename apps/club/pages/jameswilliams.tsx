export default function JamesWilliams() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <header className="mx-auto w-full max-w-3xl px-6 pt-12">
        <h1 className="text-5xl font-extrabold tracking-tight">James Williams</h1>
        <p className="mt-3 text-lg text-zinc-600">
          CS @ UCF • Aspiring SWE → Big Tech / FinTech / Quant
        </p>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <section className="rounded-2xl border bg-white/70 p-6 shadow-sm backdrop-blur">
          <h2 className="sr-only">About</h2>
          <p className="text-zinc-700 leading-7">
            Hi, I’m James Williams, a Computer Science student at the University of Central Florida.
            I’m an aspiring software engineer aiming for Big Tech, FinTech, or Quant. I love tackling
            complex problems in creative ways and building solutions that have a real, positive impact.
          </p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            <li>
              <a
                href="/James_Williams_Updated_Resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
              >
                {/* resume icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-90">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                View Resume (PDF)
              </a>
            </li>

            <li>
              <a
                href="https://www.linkedin.com/in/james-williamsiv"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
              >
                {/* linkedin icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="opacity-90">
                  <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0 8.98h5v14H0v-14zM8 8.98h4.78v1.9h.07c.67-1.2 2.31-2.46 4.76-2.46 5.1 0 6.04 3.36 6.04 7.72v8.84h-5v-7.84c0-1.87-.03-4.28-2.61-4.28-2.6 0-3 2.03-3 4.13v8h-5v-14z"/>
                </svg>
                linkedin.com/in/james-williamsiv
              </a>
            </li>

            <li>
              <a
                href="https://github.com/jamesw7863"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
              >
                {/* github icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="opacity-90">
                  <path d="M12 .5A12 12 0 0 0 0 12.7c0 5.38 3.44 9.94 8.2 11.55.6.1.82-.26.82-.58v-2.2c-3.34.74-4.04-1.6-4.04-1.6-.56-1.46-1.38-1.85-1.38-1.85-1.13-.8.08-.78.08-.78 1.25.1 1.9 1.3 1.9 1.3 1.1 1.97 2.88 1.4 3.58 1.07.1-.82.43-1.4.78-1.72-2.66-.31-5.46-1.4-5.46-6.2 0-1.37.46-2.48 1.22-3.36-.12-.3-.53-1.54.12-3.2 0 0 1-.33 3.3 1.28a11.4 11.4 0 0 1 6 0c2.3-1.6 3.3-1.28 3.3-1.28.66 1.66.24 2.9.12 3.2.76.88 1.22 1.99 1.22 3.36 0 4.82-2.8 5.88-5.48 6.2.44.37.82 1.1.82 2.22v3.29c0 .32.22.68.82.58A12 12 0 0 0 24 12.7 12 12 0 0 0 12 .5z"/>
                </svg>
                github.com/jamesw7863
              </a>
            </li>

            <li>
              <a
                href="mailto:ja159241@ucf.edu"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
              >
                {/* mail icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-90">
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M5 7l7 6 7-6" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                ja159241@ucf.edu
              </a>
            </li>
          </ul>
        </section>

        <footer className="mt-10 text-center text-xs text-zinc-500">
          Built for KnightHacks Dev Team — /jameswilliams
        </footer>
      </main>
    </div>
  );
}
