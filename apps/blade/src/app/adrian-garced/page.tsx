/*
* TODO:
    - [ ] abstract the page into seperate components
    - [ ] add selected projects section
    - [ ] add more concrete sections
*/

"use client";

import { useEffect, useState, useRef } from "react";
import { LanguageBadge } from "../_components/adrian-garced/language-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
import Navbar from "../_components/adrian-garced/navbar";
import Footer from "../_components/adrian-garced/footer";

type BaseProject = {
  title: string;
  description: string;
  content: string;
  repoUrl: string;
  tags: string[];
};

type VideoProject = BaseProject & {
  visualType: "video";
  videoUrl: string;
};

type ImageProject = BaseProject & {
  visualType: "image";
  visualUrl: string;
};

type NoVisualProject = BaseProject & {
  visualType: "none";
};

type Project = VideoProject | ImageProject | NoVisualProject;

const PROJECTS: Project[] = [
  {
    title: "Minecraft Clone",
    description: "Minecraft C++ edition",
    content: "Written C++ and OpenGL. I hope to experiment with other rendering APIs (primarily Vulkan and DX12) in the future. I am going to work on chunking and terrain generation next.",
    visualType: "video",
    videoUrl: "https://github.com/user-attachments/assets/565d9330-d81a-404d-9639-d2b12d7ff514",
    repoUrl: "https://github.com/pinkytoefoo/minecraft-plusplus",
    tags: ["C++", "OpenGL", "GLFW", "GLM", "Dear ImGui"] // Added project tags
  },
  {
    title: "Soundboard",
    description: "Desktop audio application",
    content: "A desktop soundboard exploring Rust, Tauri, audio playback, and virtual audio devices. I currently am working on adding sounds, removing sounds, and adjusting the audio levels.",
    visualType: "none",
    repoUrl: "https://codeberg.org/pinkytoefoo/cuebox",
    tags: ["Rust", "Tauri", "Audio Playback", "Desktop Apps"]
  },
  {
    title: "Frobby Blog",
    description: "A culmination of what I learn",
    content: "Usually when I learn something new, I learn something else new and I tend to lose sight of the first thing I learned until I see it again. This project is meant to stop this recursive cycle and maybe help out someone else learn something new too!",
    visualType: "image",
    visualUrl: "https://github.com/user-attachments/assets/6436f662-21c8-4c24-beb6-f807a4d78736",
    repoUrl: "https://github.com/pinkytoefoo/frobby-blog",
    tags: ["Astro", "TypeScript", "Tailwind CSS", "Vercel"]
  },
];

function ProjectMedia({ project }: { project: VideoProject | ImageProject }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleMouseEnter = () => {
    if (project.visualType === "video" && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (project.visualType === "video" && videoRef.current) {
      videoRef.current.pause();
    }
  };

  return (
    <div 
      className="relative overflow-hidden rounded-md border bg-black aspect-video flex items-center justify-center group cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* loading skeleton wrapper */}
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-neutral-900 flex items-center justify-center text-xs text-muted-foreground">
          Loading visual...
        </div>
      )}

      {project.visualType === "video" ? (
        <video
          ref={videoRef}
          src={project.videoUrl}
          className={`h-full w-full object-contain transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
          muted
          loop
          playsInline
          onLoadedData={() => setIsLoaded(true)}
        />
      ) : (
        <img
          src={project.visualUrl}
          alt={`${project.title} screenshot`}
          className={`h-full w-full object-contain transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setIsLoaded(true)}
        />
      )}
    </div>
  );
}

export default function AdrianG() {
  const [activeId, setActiveId] = useState<string>("projects");

  useEffect(() => {
    const ids = ["projects", ...PROJECTS.map((_, i) => `project-${i}`)];
    const elements = ids.map((id) => document.getElementById(id)).filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((entry) => entry.isIntersecting);
        if (visibleEntry) {
          setActiveId(visibleEntry.target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );

    elements.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-neutral-100 scroll-smooth">
    <Navbar />

    <div className="mx-auto flex max-w-6xl gap-12 px-6 py-24">
      <div className="min-w-0 flex-1">
          <section id="intro" className="scroll-mt-24">
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-wider text-emerald-400">
                COMPUTER SCIENCE MAJOR
              </p>

              <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">
                Hi, I'm Adrian!
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-400">
                I'm interested in systems programming, graphics, game development,
                and fullstack web development. Most of my learning happens by building experimental
                projects.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#projects"
                  className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-black! transition-colors hover:bg-emerald-400"
                >
                  See my projects
                </a>

                <a
                  href="#contact"
                  className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white"
                >
                  Contacts
                </a>
              </div>
            </div>
          </section>
          {/* hobby header section */}
          <section id="projects" className="mt-32 scroll-mt-24">
            <div className="scroll-mt-24 transition-opacity duration-700">
              <p className="text-sm font-medium text-emerald-400 tracking-wider">
                CURRENTLY BUILDING {"(slowly...)"}
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Hobby projects I'm working on
              </h2>
              <p className="mt-4 max-w-2xl text-neutral-400">
                These projects are in very early stages and are primarily worked on in my spare time.
              </p>
              <p className="mt-1 max-w-2xl text-neutral-400">
                Hover over the cards and click on them to go to repo!
              </p>
            </div>

            {/* project cards */}
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-2">
              {PROJECTS.map((project, index) => (
                <div
                  id={`project-${index}`}
                  key={project.title}
                  className="scroll-mt-24 opacity-0 transition-transform duration-500 hover:-translate-y-1 animate-fade-in-up"
                  style={{
                    animationDelay: `${Math.floor(index / 2) * 300}ms`,
                  }}
                >
                  <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">
                    <Card className="flex h-full flex-col overflow-hidden bg-neutral-900/40 border-neutral-800 transition-colors hover:border-neutral-700">
                      <CardHeader>
                        <CardTitle className="text-xl text-neutral-100">{project.title}</CardTitle>
                        <CardDescription className="text-neutral-400">{project.description}</CardDescription>
                      </CardHeader>

                      <CardContent className="flex flex-1 flex-col gap-4">
                        {project.visualType !== "none" && (
                          <ProjectMedia project={project} />
                        )}
                        
                        <p className="text-sm leading-6 text-secondary-foreground opacity-80 flex-1">
                          {project.content}
                        </p>

                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {project.tags.map((tag) => (
                            <span 
                            key={tag}
                            className=" rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-medium text-neutral-400 hover:border-neutral-700 hover:text-neutral-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside className="right hidden w-48 shrink-0 lg:block">
          <div className="sticky top-24">
            <p className="mb-4 text-xs font-semibold tracking-wider text-neutral-500 uppercase">On this page</p>
            <nav className="border-l border-neutral-800">
              <ul className="space-y-2 text-sm pl-4">
                <li>
                  <a
                    href="#projects"
                    className={`block transition-colors duration-200 ${
                      activeId === "projects" ? "text-emerald-400 font-medium" : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    Overview
                  </a>
                </li>
                {PROJECTS.map((project, index) => {
                  const currentId = `project-${index}`;
                  return (
                    <li key={project.title}>
                      <a
                        href={`#${currentId}`}
                        className={`block transition-colors duration-200 truncate ${
                          activeId === currentId ? "text-emerald-400 font-medium" : "text-neutral-500 hover:text-neutral-300"
                        }`}
                      >
                        {project.title}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </aside>
      </div>
      <Footer />
    </main>
  );
}
