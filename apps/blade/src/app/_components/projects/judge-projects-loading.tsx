"use client";

import { useSearchParams } from "next/navigation";

import { ProjectWorkspaceSkeleton } from "./project-workspace-skeleton";

export function JudgeProjectsStaticLoading() {
  return <ProjectWorkspaceSkeleton judge variant="projects" />;
}

export function JudgeProjectsLoading() {
  const tab = useSearchParams().get("tab");
  const variant =
    tab === "submissions" || tab === "deliberation" ? tab : "projects";

  return <ProjectWorkspaceSkeleton judge variant={variant} />;
}
