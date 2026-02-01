export default function DanielSchevisPortfolio() {
  return (
    <div className="space-y-8">
      {/* About Me Section */}
      <section className="rounded-lg border border-yellow-500/20 bg-gray-900/50 dark:bg-gray-900/50 bg-white/70 p-8 backdrop-blur-sm">
        <h2 className="mb-4 flex items-center gap-3 font-bold text-2xl text-yellow-400 dark:text-yellow-400 text-yellow-600">
          <span className="text-3xl">▸</span>
          About Me
        </h2>
        <div className="space-y-4 text-gray-300 dark:text-gray-300 text-gray-800">
          <p className="leading-relaxed">
            Systems Running...
          </p>
          <p className="leading-relaxed">
            Hello User
          </p>
          <p className="leading-relaxed">
            Welcome to Daniel Schevis's Developer Application. Here you will find everything you need to know about Daniel in the context of Web Development. I hope you find what you are looking for while you are here :)
          </p>
        </div>

        {/* Social Links */}
        <div className="mt-10 flex gap-4">
          <a
            href="https://github.com/Spyderma9"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-lg border border-yellow-500/30 bg-black/40 dark:bg-black/40 bg-white/60 p-3 transition-all hover:border-yellow-500 hover:bg-yellow-500/10"
            aria-label="GitHub Profile"
          >
            <svg
              className="h-8 w-8 text-yellow-400 dark:text-yellow-400 text-yellow-600 transition-transform group-hover:scale-110"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent transition-transform group-hover:translate-x-full" />
          </a>
          <a
            href="/Daniel_s_Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-lg border border-yellow-500/30 bg-black/40 dark:bg-black/40 bg-white/60 p-3 transition-all hover:border-yellow-500 hover:bg-yellow-500/10"
            aria-label="Resume"
          >
            <svg
              className="h-8 w-8 text-yellow-400 dark:text-yellow-400 text-yellow-600 transition-transform group-hover:scale-110"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 12h8v2H8v-2zm0 4h8v2H8v-2zm0-8h5v2H8V8z" />
            </svg>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent transition-transform group-hover:translate-x-full" />
          </a>
          <a
            href="https://www.linkedin.com/in/daniel-schevis-8434662b3/"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-lg border border-yellow-500/30 bg-black/40 dark:bg-black/40 bg-white/60 p-3 transition-all hover:border-yellow-500 hover:bg-yellow-500/10"
            aria-label="LinkedIn Profile"
          >
            <svg
              className="h-8 w-8 text-yellow-400 dark:text-yellow-400 text-yellow-600 transition-transform group-hover:scale-110"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent transition-transform group-hover:translate-x-full" />
          </a>
        </div>
      </section>

      {/* Skills/Tech Stack */}
      <section className="rounded-lg border border-yellow-500/20 bg-gray-900/50 dark:bg-gray-900/50 bg-white/70 p-8 backdrop-blur-sm">
        <h2 className="mb-4 flex items-center gap-3 font-bold text-2xl text-yellow-400 dark:text-yellow-400 text-yellow-600">
          <span className="text-3xl">▸</span>
          Arsenal
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {[
            { name: "StateFarm Game", url: "https://github.com/elizabethprettosotelo/shellhacks25" },
            { name: "Pallit", url: "https://github.com/elizabethprettosotelo/pallit" },
            { name: "HeisenLearn", url: "https://github.com/AntonioHollerman/WarEagles" },
            { name: "Last Meal Protocol Club", url: "https://github.com/powdermilkjuno/habit-tracker" },
            { name: "WizzOff", url: "https://github.com/KahlenHernani/WizzOff" },
          ].map((project) => (
            <a
              key={project.name}
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block overflow-hidden rounded border border-yellow-500/30 bg-black/40 dark:bg-black/40 bg-white/60 px-4 py-3 text-center transition-all hover:border-yellow-500 hover:bg-yellow-500/10 cursor-pointer"
            >
              <span className="relative z-10 block font-mono text-sm text-gray-300 dark:text-gray-300 text-gray-800 group-hover:text-yellow-400 dark:group-hover:text-yellow-400 group-hover:text-yellow-600 pointer-events-none">
                {project.name}
              </span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-yellow-500/10 to-transparent transition-transform group-hover:translate-x-full pointer-events-none" />
            </a>
          ))}
        </div>
      </section>

      {/* Mission Statement */}
      <section className="rounded-lg border border-yellow-500/20 bg-gradient-to-br from-gray-900/70 to-black/70 dark:from-gray-900/70 dark:to-black/70 from-gray-100/90 to-white/90 p-8 backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="text-4xl text-yellow-400 dark:text-yellow-400 text-yellow-600">⚡</div>
          <div>
            <h2 className="mb-2 font-bold text-xl text-yellow-400 dark:text-yellow-400 text-yellow-600">
              The Mission
            </h2>
            <p className="font-mono text-sm italic leading-relaxed text-gray-400 dark:text-gray-400 text-gray-700">
              "Get into the Development Team on KnightHacks at University of Central Florida"
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}