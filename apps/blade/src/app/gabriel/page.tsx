const links = [
  {
    label: "Resume (PDF)",
    href: "/Gabriel-Barreto-Otero-Resume.pdf",
  },
  {
    label: "GitHub",
    href: "https://github.com/Luxx12",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/gabriel-b-otero/",
  },
  {
    label: "Portfolio",
    href: "https://portfolio-website-weld-tau-91.vercel.app/",
  },
];

const projects = [
  {
    name: "Kinexis (Best App – KnightHacks)",
    description:
      "Full-stack computer-vision web app that helps physical therapists assess patient range of motion using only a webcam.",
    tech: ["Python", "Flask", "OpenCV", "MediaPipe", "SQLite"],
    href: "https://github.com/Luxx12",
  },
  {
    name: "InfoScope (ShellHacks)",
    description:
      "Chrome extension that extracts article content and provides AI-powered summaries and Q&A using Gemini.",
    tech: ["JavaScript", "Chrome APIs", "Gemini API"],
    href: "https://github.com/Luxx12",
  },
  {
    name: "Ping",
    description:
      "Chat box application created in Qt using C++, using a TCP server allows two users to text one another.",
    tech: ["C++", "Qt", "Asio"],
    href: "https://github.com/Luxx12",
  },
];

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
      {children}
    </span>
  );
}

export default function GabrielPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 to-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-14">
        {/* Header */}
        <header className="space-y-6">
          <p className="text-sm text-white/60">
            Forge Knight Hacks • Developer Application
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Gabriel Barreto Otero
          </h1>

          <p className="max-w-2xl text-base text-white/75">
            Computer Science student • Hackathon builder • Full-stack & systems-oriented.
            I enjoy shipping real features, debugging hard problems, and working
            in collaborative dev teams.
          </p>

          {/* Links */}
          <div className="flex flex-wrap gap-3">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target={l.href.startsWith("/") ? undefined : "_blank"}
                rel={l.href.startsWith("/") ? undefined : "noreferrer"}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:bg-white/10"
              >
                {l.label} ↗
              </a>
            ))}
          </div>
        </header>

        {/* Body */}
        <section className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Why Dev */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Why I want to join Dev</h2>
            <p className="mt-3 text-sm text-white/75">
              I’m looking to contribute to real club infrastructure and projects
              that students actually use. I enjoy jumping into large codebases,
              learning patterns quickly, and collaborating to ship improvements.
            </p>
            <p className="mt-3 text-sm text-white/75">
              Hackathons and teaching roles have taught me how to communicate,
              iterate fast, and balance clean code with real deadlines.
            </p>
          </div>

          {/* What I bring */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">What I bring</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/75">
              <li>Strong fundamentals in C/C++, JavaScript, and Python</li>
              <li>Experience with full-stack and UI-driven applications</li>
              <li>Comfortable debugging, reading unfamiliar code, and asking questions</li>
              <li>Consistent contributor who communicates early and clearly</li>
            </ul>

            <div className="mt-4 flex flex-wrap gap-2">
              <Chip>C</Chip>
              <Chip>C++</Chip>
              <Chip>Qt</Chip>
              <Chip>React</Chip>
              <Chip>Next.js</Chip>
              <Chip>Git</Chip>
            </div>
          </div>

          {/* Projects */}
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Projects</h2>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              {projects.map((p) => (
                <a
                  key={p.name}
                  href={p.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-white/10 bg-black/30 p-5 transition hover:bg-white/5"
                >
                  <h3 className="text-sm font-semibold">{p.name}</h3>
                  <p className="mt-2 text-sm text-white/70">{p.description}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.tech.map((t) => (
                      <Chip key={t}>{t}</Chip>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Contact</h2>
            <p className="mt-3 text-sm text-white/75">
              Email: <span className="text-white">barretgaby12@gmail.com</span>
            </p>
            <p className="mt-2 text-sm text-white/60">
              Available to contribute consistently during the semester.
            </p>
          </div>
        </section>

        <footer className="mt-12 border-t border-white/10 pt-6 text-sm text-white/50">
          Route: <span className="text-white/70">/gabriel</span>
        </footer>
      </div>
    </main>
  );
}
