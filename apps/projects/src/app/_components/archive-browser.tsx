"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

import type { ProjectFixture } from "~/content/projects";
import { ProjectCard } from "./project-card";

export function ArchiveBrowser({
  projects,
  technologies,
  initialTechnology,
}: {
  projects: ProjectFixture[];
  technologies: string[];
  initialTechnology?: string;
}) {
  const [query, setQuery] = useState("");
  const [technology, setTechnology] = useState(() =>
    initialTechnology && technologies.includes(initialTechnology)
      ? initialTechnology
      : "",
  );
  const filteredProjects = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return projects.filter((project) => {
      const matchesTechnology =
        !technology || project.technologies.includes(technology);
      const searchable = [
        project.title,
        project.category,
        project.summary,
        project.dek,
        ...project.technologies,
      ]
        .join(" ")
        .toLocaleLowerCase();
      return matchesTechnology && (!search || searchable.includes(search));
    });
  }, [projects, query, technology]);
  const hasFilters = Boolean(query.trim() || technology);

  function clearFilters() {
    setQuery("");
    setTechnology("");
  }

  return (
    <div>
      <section className="archive-toolbar" aria-label="Project filters">
        <div>
          <label className="search-label" htmlFor="project-search">
            Search projects
          </label>
          <div className="search-wrap">
            <Search className="search-icon" aria-hidden="true" size={18} />
            <input
              className="archive-search"
              id="project-search"
              type="search"
              placeholder="Try “offline”, “Rust”, or “learning”"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </div>
        </div>
        <div>
          <p className="filter-heading" id="technology-filter-label">
            <SlidersHorizontal
              aria-hidden="true"
              className="inline-block align-[-3px]"
              size={14}
            />{" "}
            Filter by technology
          </p>
          <div
            aria-labelledby="technology-filter-label"
            className="filter-row"
            role="group"
          >
            <button
              aria-pressed={!technology}
              className="tech-chip"
              onClick={() => setTechnology("")}
              type="button"
            >
              All technologies
            </button>
            {technologies.map((item) => (
              <button
                key={item}
                aria-pressed={technology === item}
                className="tech-chip"
                onClick={() => setTechnology(technology === item ? "" : item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="archive-status">
        <p aria-live="polite" aria-atomic="true">
          Showing {filteredProjects.length} of {projects.length} illustrative{" "}
          {projects.length === 1 ? "project" : "projects"}
          {technology ? ` · ${technology}` : ""}
        </p>
        {hasFilters ? (
          <button className="clear-button" onClick={clearFilters} type="button">
            Clear filters
          </button>
        ) : null}
      </div>

      {filteredProjects.length > 0 ? (
        <div className="archive-grid">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      ) : (
        <div className="empty-state" role="status">
          <Search aria-hidden="true" size={24} />
          <h2>No projects match those filters</h2>
          <p>Try another phrase or clear the filters to see every fixture.</p>
          <button
            className="button-secondary"
            onClick={clearFilters}
            type="button"
          >
            Clear search and filters
          </button>
        </div>
      )}
    </div>
  );
}
