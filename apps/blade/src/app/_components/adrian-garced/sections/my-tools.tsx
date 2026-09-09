import Playground from "$/adrian-garced/playground";

const CATEGORIES = [
  {
    title: "Systems & Low-Level",
    technologies: ["C", "C++", "Rust", "Linux"],
  },
  {
    title: "Web Development",
    technologies: ["TypeScript", "Next.js", "Hono", "Solid.js"],
  },
  {
    title: "Graphics & Game Development",
    technologies: ["C++", "OpenGL", "GLFW", "GLM", "Godot", "C#"],
  },
  {
    title: "Currently Learning",
    technologies: ["Computer Architecture", "Operating Systems"],
  },
];

export default function MyTools({ id }: { id: string }) {
  return (
    <section id={id} className="mt-32 scroll-mt-24">
      <div className="max-w-3xl">
        <p className="text-sm font-medium tracking-wider text-emerald-400">
          WHAT I WORK WITH
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Tech Stack & Tools I use
        </h2>
      </div>

      <div className="mt-2 grid gap-8 sm:grid-cols-2">
        {CATEGORIES.map((category) => (
          <div key={category.title}>
            <h3 className="text-sm font-medium text-neutral-200">
              {category.title}
            </h3>

            <div className="mt-3 flex flex-wrap gap-2">
              {category.technologies.map((technology) => (
                <span
                  key={technology}
                  className="rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-400"
                >
                  {technology}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex w-full justify-center">
        <div id="playground" className="mt-10 w-full max-w-2xl scroll-mt-24">
          <p className="text-sm font-medium tracking-wider text-emerald-600">
            PLAYGROUND
          </p>

          <h3 className="mt-2 text-2xl tracking-tight text-neutral-300 *:font-bold sm:text-xl">
            {/* Sandbox */}
          </h3>

          <p className="mt-2 max-w-2xl tracking-tight text-neutral-200 *:font-bold sm:text-base">
            DVD Animation but for my Technologies
          </p>
          <Playground />
          <p className="text-neutral-500! mt-2">
            Inspiration:{" "}
            <a
              href="https://www.dvidal.dev/skills"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              dvidal
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
