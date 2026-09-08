import { TooltipProvider } from "@forge/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";

import Navbar from "../_components/adrian-garced/navbar";

enum Visual {
  None,
  Image,
  Video,
}

const PROJECTS = [
  {
    title: "Minecraft Clone",
    description: "Minecraft C++ edition",
    content: "Written C++ and OpenGL. I hope to experiment with other rendering APIs (primarily Vulkan and DX12) in the future. I am going to work on chunking and terrain generation next.",
    visualType: Visual.Video,
    videoUrl: "https://github.com/user-attachments/assets/565d9330-d81a-404d-9639-d2b12d7ff514",
  },
  {
    title: "Soundboard",
    description: "Desktop audio application",
    content:
      "A desktop soundboard where I am exploring Rust, Tauri (forever over electron), audio firmware, and slight multithreading. I currently am working on adding sounds, removing sounds, and adjusting the audio levels.",
    visualType: Visual.None,
    visualUrl: "",
  },
  {
    title: "Frobby Blog",
    description: "A culmination of what I learn",
    content:
      "Usually when I learn something new, I learn something else new and I tend to lose sight of the first thing I learned until I see it again. This project is meant to stop this recursive cycle and maybe help out someone else learn something new too!",
    visualUrl: "https://github.com/user-attachments/assets/6436f662-21c8-4c24-beb6-f807a4d78736",
    visualType: Visual.Image,
  },
];

export default async function AdrianG() {
  return (
    <main className="min-h-screen scroll-smooth">
      <Navbar />
      {/* main content */}
      <div className="mx-auto flex max-w-6xl gap-12 px-6 py-24">

        <div className="min-w-0 flex-1">
          {/* hobby projects header */}
          <div
            id="projects"
            className="scroll-mt-24 opacity-0 animate-fade-in-up"
          >
            <p className="text-sm font-medium text-primary">
              CURRENTLY BUILDING {"(slowly...)"}
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Hobby projects I'm working on
            </h2>

            <p className="mt-4 max-w-2xl text-muted-foreground">
              These projects are in very early stages and are primarily
              worked on in my spare time.
            </p>
          </div>

          {/* project cards */}
          <div id="projects" className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {PROJECTS.map((project, index) => (
              <div
                id={`project-${index}`}
                key={project.title}
                className="scroll-mt-24 opacity-0 animate-fade-in-up"
                style={{
                  animationDelay: `${(index + 1) * 150}ms`,
                }}
              >
                <Card className="flex h-full flex-col overflow-hidden">
                  <CardHeader>
                    <CardTitle>{project.title}</CardTitle>
                    <CardDescription>
                      {project.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col gap-4">
                    {project.visualType !== Visual.None && (
                      <div className="overflow-hidden rounded-md border bg-muted">
                        {project.visualType === Visual.Video ? (
                          <video
                            src={project.videoUrl}
                            className="aspect-video w-full object-cover"
                            muted
                            loop
                            autoPlay
                            playsInline
                            controls
                          />
                        ) : (
                          <img
                            src={project.visualUrl}
                            alt={`${project.title} screenshot`}
                            className="aspect-video w-full object-cover"
                          />
                        )}
                      </div>
                    )}

                    <p className="text-sm leading-6 text-muted-foreground">
                      {project.content}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
        {/* table of contents / on this page navigation */}
        <aside className="right hidden w-48 shrink-0 lg:block">
          <div className="sticky top-24">
            <p className="mb-4 text-sm font-semibold">
              On this page
            </p>

            <nav className="border-r pl-4">
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#projects"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Projects
                  </a>
                </li>

                {PROJECTS.map((project, index) => (
                  <li key={project.title}>
                    <a
                      href={`#project-${index}`}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {project.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>
      </div>
    </main>
  );
}