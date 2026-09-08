import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";

type SelectedProject = {
  title: string;
  description: string;
  content: string;
  technologies: string[];
  liveUrl?: string;
};

export const SELECTED_PROJECTS: SelectedProject[] = [
  {
    title: "Image Upscaler",
    description: "Image processing API",
    content:
      "A FastAPI backend using OpenCV for image upscaling and processing. Built to explore Python APIs, and the practical side of deploying service. Although, there is no live link due to bandwidth and high hardware costs of running an image processing API",
    technologies: ["Python", "FastAPI", "OpenCV", "UV"],
  },
  {
    title: "Pastebox",
    description: "Simple paste sharing service",
    content:
      "A lightweight pastebin alternative. Users can submit text and receive a unique URL. Built as an to start learning about databases, persistence, and deploying a small web service. I plan on adding auth, syntax highlighting, and different viewing times",
    technologies: ["TypeScript", "Hono", "SQLite", "Tailwind"],
    liveUrl: "https://pastebox.koyeb.app/"
  },
  {
    title: "Frobby Blog",
    description: "A culmination of what I learn",
    content:
      "A place to document what I'm learning about programming, computers, and the projects I build. The goal is to turn things I learn into something I can revisit, and hopefully share with other people too!",
    technologies: ["Astro", "TypeScript", "Tailwind CSS", "Vercel"],
    liveUrl: "https://frobby-blog.vercel.app/"
  },
  {
    title: "Word Counter",
    description: "Text analysis tool",
    content:
      "A small web tool for analyzing text, including word, sentence, and character counts. One of my earlier projects focused on building and shipping a useful tool without adding uneeded complexity.",
    technologies: ["TypeScript", "Solid.js", "Web"],
    liveUrl: "https://wordcounty.vercel.app/",
  },
];

export default function SelectedProjects({ id }: {id: string}) {
  return (
  <section id={id} className="mt-32 scroll-mt-24">
    <div className="max-w-3xl">
      <p className="text-sm font-medium tracking-wider text-emerald-400">
        SELECTED PROJECTS
      </p>

      <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        Things I've built
      </h2>

      <p className="mt-4 max-w-2xl text-neutral-400">
        A few projects that relate to web development
      </p>
    </div>

    <div className="mt-10 grid gap-6 md:grid-cols-2">
      {SELECTED_PROJECTS.map((project, index) => (
        <div
            key={project.title}
            className="scroll-mt-24 opacity-0 transition-transform duration-500 hover:-translate-y-1 animate-fade-in-up"
            style={{
              animationDelay: `${Math.floor(index / 2) * 300}ms`,
            }}
          >
        <Card
          className="flex h-full flex-col border-neutral-800 bg-neutral-900/40 transition-colors hover:border-neutral-700"
        >
          <CardHeader>
            <CardTitle className="text-xl text-neutral-100">
              {project.title}
            </CardTitle>

            <CardDescription className="text-neutral-400">
              {project.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col">
            <p className="text-sm leading-6 text-neutral-400">
              {project.content}
            </p>

            <div className="mt-6 flex flex-wrap gap-1.5">
              {project.technologies.map((technology) => (
                <span
                  key={technology}
                  className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-medium text-neutral-400"
                >
                  {technology}
                </span>
              ))}
            </div>

            <div className="mt-6 flex gap-4">
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-neutral-300 transition-colors hover:text-emerald-400!"
                >
                  Live site →
                </a>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      ))}
    </div>
  </section>
  )
}