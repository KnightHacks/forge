import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";

import { SELECTED_PROJECTS } from "./selected-data";

export default function SelectedProjects({ id }: { id: string }) {
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
            <Card className="flex h-full flex-col border-neutral-800 bg-neutral-900/40 transition-colors hover:border-neutral-700">
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
                  <a
                    href={project.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-neutral-300! transition-colors hover:text-emerald-400!"
                  >
                    Repo →
                  </a>

                  {project.liveUrl && (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-neutral-300! transition-colors hover:text-emerald-400!"
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
  );
}