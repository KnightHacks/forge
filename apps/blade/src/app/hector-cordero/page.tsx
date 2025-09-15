import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Hector Cordero | KnightHacks Dev Application",
  description: "Calm luh Application, nun too crazy",
};

export default function Page() {
  return (
    <main className="relative min-h-dvh bg-neutral-950 text-neutral-100 selection:bg-amber-300/20">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-20 right-[-10%] h-72 w-72 rounded-full bg-[radial-gradient(closest-side,_rgba(255,200,0,0.14),_transparent_70%)] blur-2xl" />
        <div className="absolute -bottom-24 left-[-12%] h-96 w-96 rounded-full bg-[radial-gradient(closest-side,_rgba(244,114,182,0.12),_transparent_70%)] blur-2xl" />
      </div>
      <section className="relative mx-auto max-w-3xl px-6 py-16">
        <input id="avatar-modal" type="checkbox" className="peer sr-only" />
        {/* -------------------------------------------------------Header----------------------------------------------------------------- */}
        <div className="flex items-center gap-6">
          <label
            htmlFor="avatar-modal"
            className="group relative h-[130px] w-[130px] shrink-0 cursor-pointer overflow-hidden rounded-full shadow-xl shadow-black/40 ring-2 ring-amber-300/30"
            title="Click to view"
          >
            <Image
              src="/hector.jpg"
              alt="Hector Cordero"
              fill
              sizes="130px"
              className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
              priority
            />
            <span className="pointer-events-none absolute inset-0 hidden place-items-center bg-black/20 text-xs text-white group-hover:grid"></span>
          </label>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 bg-clip-text text-transparent">
                Hector Cordero
              </span>
            </h1>

            <p className="text-sm text-neutral-400/90">
              Rising sophomore | Building with TypeScript &amp; Next.js
            </p>
          </div>
        </div>

        {/*-------------------------------------------------------------------------------------------------------------*/}

        {/*-------------------------------------------------------Actions-----------------------------------------------------------------*/}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/Resume2025.pdf"
            target="_blank"
            className="inline-flex items-center rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 active:translate-y-[1px]"
          >
            Resume
          </Link>

          <Link
            href="https://www.linkedin.com/in/hectorhcordero"
            target="_blank"
            className="inline-flex items-center rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 active:translate-y-[1px]"
          >
            LinkedIn
          </Link>
        </div>
        {/*-------------------------------------------------------------------------------------------------------------*/}

        {/*-------------------------------------------------------Body-----------------------------------------------------------------*/}

        <div className="mt-10 space-y-4 leading-relaxed text-neutral-300">
          <p>
            Wassup! I'm Hector and I'm a rising sophomore. I'm on the come up!
          </p>

          <p>These are the tools/concepts I'm learning:</p>
          <ul className="list-disc space-y-1 pl-6 marker:text-amber-300/70">
            <li>Next.js and NextAuth.js</li>
            <li>SEO Optimization</li>
            <li>Postgres</li>
            <li>Tailwind CSS and UI/UX Design</li>
            <li>TypeScript</li>
          </ul>

          <p>
            Since running cross country in high school, I loved being part of a
            team. It makes what you do more fun and you get to make friends
            along the way. This is why I want to join the dev team. I know I’ll
            be surrounded by like-minded people, and together we’ll contribute
            to a great organization whose focus is to help people like me.
          </p>

          <p>
            Programming aside, I’m a hooper and I dabble in other sports. My
            favorite anime is Hunter x Hunter. I’m also always down for eats
            LOL. Hope I get to meet y’all soon!
          </p>
        </div>

        {/* ------------------------------------------------------------------------------------------------------------- */}

        {/* -------------------------------------------------Cover at Full Size----------------------------------------------------- */}

        <label
          htmlFor="avatar-modal"
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-black/80 opacity-0 transition-opacity duration-200 ease-out peer-checked:pointer-events-auto peer-checked:opacity-100"
        >
          <Image
            src="/hector.jpg"
            alt="Hector Cordero"
            width={1200}
            height={1200}
            className="max-h-[85vh] w-auto rounded-xl shadow-2xl"
            priority
          />
        </label>

        {/* ------------------------------------------------------------------------------------------------------------- */}
      </section>
    </main>
  );
}
