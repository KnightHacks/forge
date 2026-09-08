"use server"

export default async function Intro() {
  return (
  <section id="intro" className="scroll-mt-24">
    <div className="max-w-3xl">
      <p className="text-sm font-medium tracking-wider text-emerald-400">
        COMPUTER SCIENCE MAJOR
      </p>

      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">
        Hi, I'm Adrian!
      </h1>

      <p className="mt-2 px-1 py-2 text-medium font-medium text-neutral-300">My contact info is on my resume.</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href="#about-me"
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-black! transition-colors hover:bg-emerald-400"
        >
          About me
        </a>

        <a
          href="/public/resume.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white"
        >
          Resume
        </a>
      </div>
    </div>
  </section>
  )
}