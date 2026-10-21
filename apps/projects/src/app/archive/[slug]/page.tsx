import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Clock3 } from "lucide-react";

import { ProjectArtwork } from "~/app/_components/project-artwork";
import { ProjectCard } from "~/app/_components/project-card";
import { SiteFooter } from "~/app/_components/site-footer";
import { SiteHeader } from "~/app/_components/site-header";
import {
  findProject,
  getRelatedProjects,
  projectFixtures,
} from "~/content/projects";

export function generateStaticParams() {
  return projectFixtures.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = findProject(slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.dek,
    openGraph: { title: project.title, description: project.dek },
  };
}

function ExternalFixtureLink({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <a
      className="fixture-link"
      href={href}
      rel="noreferrer nofollow"
      target="_blank"
    >
      {children}
      <span>
        fixture link{" "}
        <ArrowUpRight aria-hidden="true" className="inline" size={13} />
      </span>
    </a>
  );
}

export default async function ProjectCaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = findProject(slug);
  if (!project) notFound();
  const related = getRelatedProjects(project);

  return (
    <div className="site-shell">
      <SiteHeader />
      <main id="main-content">
        <header className="article-top container">
          <nav aria-label="Breadcrumb" className="breadcrumbs">
            <Link href="/">Projects</Link>
            <span aria-hidden="true">/</span>
            <Link href="/archive">Archive</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{project.title}</span>
          </nav>
          <div className="article-category">
            <p className="eyebrow">{project.category}</p>
          </div>
          <h1 className="display-serif article-title">{project.title}</h1>
          <p className="article-deck">{project.dek}</p>
          <div className="article-byline">
            <span className="fixture-tag">Illustrative case study</span>
            <span>{project.teamLabel}</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 aria-hidden="true" size={14} /> {project.readMinutes} min
              read
            </span>
          </div>
        </header>

        <figure className="article-cover container">
          <ProjectArtwork kind={project.artwork} />
          <figcaption className="cover-caption">
            Original vector illustration for this fictional fixture.
          </figcaption>
        </figure>

        <div className="article-layout container">
          <article className="article-body">
            <p className="article-intro">{project.introduction}</p>
            {project.sections.map((section) => (
              <section id={section.id} key={section.id}>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.quote ? (
                  <blockquote className="article-quote">
                    {section.quote}
                  </blockquote>
                ) : null}
                {section.architecture ? (
                  <figure className="architecture-figure">
                    <figcaption className="architecture-title">
                      Architecture at a glance
                    </figcaption>
                    <ol aria-label="System flow" className="architecture-flow">
                      {section.architecture.map((node) => (
                        <li className="architecture-step" key={node.label}>
                          <strong>{node.label}</strong>
                          <span>{node.detail}</span>
                        </li>
                      ))}
                    </ol>
                  </figure>
                ) : null}
                {section.bullets ? (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {section.code ? (
                  <pre className="code-sample" tabIndex={0}>
                    <code>{section.code.source}</code>
                  </pre>
                ) : null}
              </section>
            ))}
          </article>

          <aside className="article-aside" aria-label="Project details">
            <section className="aside-panel">
              <h2 className="aside-heading">Fixture provenance</h2>
              <p className="aside-body">{project.provenance}</p>
            </section>
            <section className="aside-panel">
              <h2 className="aside-heading">Technologies</h2>
              <div className="tag-list">
                {project.technologies.map((technology) => (
                  <span key={technology}>{technology}</span>
                ))}
              </div>
            </section>
            <section className="aside-panel">
              <h2 className="aside-heading">Explore the fixture</h2>
              <div className="aside-links">
                <ExternalFixtureLink href={project.demoUrl}>
                  Demo
                </ExternalFixtureLink>
                <ExternalFixtureLink href={project.repositoryUrl}>
                  Repository
                </ExternalFixtureLink>
              </div>
            </section>
            <section className="aside-panel">
              <h2 className="aside-heading">Team</h2>
              <p className="aside-body">{project.teamLabel}</p>
              <p className="aside-body">
                No real contributors or attribution are represented.
              </p>
            </section>
          </aside>
        </div>

        <section
          className="related-section container"
          aria-labelledby="related-title"
        >
          <div className="section-intro">
            <div>
              <p className="eyebrow">Keep exploring</p>
              <h2 className="display-serif section-heading" id="related-title">
                Related projects.
              </h2>
            </div>
            <Link className="text-link" href="/archive">
              <ArrowLeft aria-hidden="true" size={15} /> Back to archive
            </Link>
          </div>
          <div className="story-grid">
            {related.map((item) => (
              <ProjectCard key={item.slug} project={item} />
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
