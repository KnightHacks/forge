import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { ProjectFixture } from "~/content/projects";
import { ProjectArtwork } from "./project-artwork";

export function ProjectCard({ project }: { project: ProjectFixture }) {
  return (
    <article>
      <Link className="story-card" href={`/archive/${project.slug}`}>
        <ProjectArtwork kind={project.artwork} />
        <div className="story-card-body">
          <div className="story-meta">
            <span className="fixture-tag">Fixture</span>
            <span>{project.category}</span>
          </div>
          <h3>{project.title}</h3>
          <p className="story-card-summary">{project.summary}</p>
          <div className="tag-list" aria-label="Technologies">
            {project.technologies.slice(0, 3).map((technology) => (
              <span key={technology}>{technology}</span>
            ))}
          </div>
          <span className="text-link">
            Read the case study <ArrowUpRight aria-hidden="true" size={16} />
          </span>
        </div>
      </Link>
    </article>
  );
}
