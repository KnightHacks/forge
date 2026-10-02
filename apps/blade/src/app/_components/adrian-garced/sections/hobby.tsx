"use client";

import { useRef, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";

import type { ImageProject, VideoProject } from "./hobby-data";
import { PROJECTS, VisualType } from "./hobby-data";

const slugify = (s: string) => s.toLowerCase().replace(/\s+/g, "-");

function ProjectMedia({ project }: { project: VideoProject | ImageProject }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // const handleMouseEnter = () => {
  //   if (project.visualType === VisualType.Video && videoRef.current) {
  //     videoRef.current.play().catch(() => {});
  //   }
  // };

  // const handleMouseLeave = () => {
  //   if (project.visualType === VisualType.Video && videoRef.current) {
  //     videoRef.current.pause();
  //   }
  // };

  return (
    <div
      className="group relative flex aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-black"
      // onMouseEnter={handleMouseEnter}
      // onMouseLeave={handleMouseLeave}
    >
      {/* loading skeleton wrapper */}
      {!isLoaded && (
        <div className="absolute inset-0 flex animate-pulse items-center justify-center bg-neutral-900 text-xs text-muted-foreground">
          Loading visual...
        </div>
      )}

      {project.visualType === VisualType.Video ? (
        <video
          ref={videoRef}
          src={project.videoUrl}
          className={`h-full w-full object-contain transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
          muted
          loop
          playsInline
          autoPlay
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

export default function HobbyProjects({ id }: { id: string }) {
  return (
    <section id={id} className="mt-32 scroll-mt-24">
      <div className="scroll-mt-24 transition-opacity duration-700">
        <p className="text-sm font-medium tracking-wider text-emerald-400">
          CURRENTLY BUILDING {"(slowly...)"}
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Hobby projects I'm working on
        </h2>
        <p className="mt-4 max-w-2xl text-neutral-400">
          These projects are in very early stages and are primarily worked on in
          my spare time.
        </p>
        <p className="mt-1 max-w-2xl text-neutral-400">
          Hover over the cards and click on them to go to repo!
        </p>
      </div>

      {/* project cards */}
      <div className="mt-10 gap-6">
        {PROJECTS.map((project, index) => (
          <div
            key={project.title}
            id={slugify(project.title)}
            className="animate-fade-in-up scroll-mt-24 opacity-0 transition-transform duration-500 hover:-translate-y-1"
            style={{
              animationDelay: `${Math.floor(index / 2) * 300}ms`,
            }}
          >
            <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">
              <Card className="flex h-full flex-col overflow-hidden border-neutral-800 bg-neutral-900/40 transition-colors hover:border-neutral-700">
                <CardHeader>
                  <CardTitle className="text-xl text-neutral-100">
                    {project.title}
                  </CardTitle>
                  <CardDescription className="text-neutral-400">
                    {project.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4">
                  {project.visualType !== VisualType.None && (
                    <ProjectMedia project={project} />
                  )}

                  <p className="flex-1 text-sm leading-6 text-secondary-foreground opacity-80">
                    {project.content}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-medium text-neutral-400 hover:border-neutral-700 hover:text-neutral-300"
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
  );
}
