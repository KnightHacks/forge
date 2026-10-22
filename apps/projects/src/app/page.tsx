import Link from "next/link";
import { ArrowDownRight, ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@forge/ui/button";

import { featuredProjects } from "~/content/projects";
import { ProjectArtwork } from "./_components/project-artwork";
import { ProjectCard } from "./_components/project-card";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";

export default function HomePage() {
  const featured = featuredProjects[0];
  const stories = featuredProjects.slice(0, 3);

  return (
    <div className="site-shell">
      <SiteHeader active="home" />
      <main id="main-content">
        <section className="hero-section">
          <div className="hero-grid container">
            <div className="hero-copy">
              <p className="eyebrow">An archive for the curious</p>
              <h1 className="display-serif hero-title">
                Make something worth <em>taking apart.</em>
              </h1>
              <p className="hero-lede">
                Good projects have a story beneath the demo. Follow the
                decisions, constraints, and small details that made an idea
                work.
              </p>
              <div className="hero-actions">
                <Button asChild className="button-primary" size="md">
                  <Link href="/archive">
                    Explore the archive{" "}
                    <ArrowRight aria-hidden="true" size={16} />
                  </Link>
                </Button>
                <a className="button-secondary" href="#approach">
                  What makes a strong project?
                  <ArrowDownRight aria-hidden="true" size={15} />
                </a>
              </div>
            </div>

            {featured ? (
              <div className="hero-art-frame">
                <div className="hero-art-card">
                  <div className="hero-art-label">
                    <span>Field note / 001</span>
                    <span>Fixture</span>
                  </div>
                  <ProjectArtwork kind={featured.artwork} />
                  <div className="hero-art-caption">
                    <span>{featured.category}</span>
                    <span>{featured.title}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="section-dark" aria-labelledby="featured-title">
          <div className="container">
            <div className="section-intro">
              <div>
                <p className="eyebrow">Start with a story</p>
                <h2
                  className="display-serif section-heading"
                  id="featured-title"
                >
                  Built to be studied.
                </h2>
              </div>
              <div>
                <p className="section-deck">
                  Project pages pair the idea with the engineering behind it:
                  architecture, tradeoffs, rough edges, and what the next
                  version might change.
                </p>
                <Link className="text-link" href="/archive">
                  View every project <ArrowRight aria-hidden="true" size={16} />
                </Link>
              </div>
            </div>
            <div className="story-grid">
              {stories.map((project) => (
                <ProjectCard key={project.slug} project={project} />
              ))}
            </div>
          </div>
        </section>

        <section className="principles-band" id="approach">
          <div className="principles-inner container">
            <p className="eyebrow">A useful project leaves a trail</p>
            <h2 className="display-serif principles-heading">
              The best part is often how it came together.
            </h2>
            <div className="principle-list">
              <article className="principle">
                <span className="principle-number">01 / Begin with a need</span>
                <h3>Name the real constraint.</h3>
                <p>
                  What was difficult for someone before the project existed? The
                  answer gives every technical choice a reason to be there.
                </p>
              </article>
              <article className="principle">
                <span className="principle-number">02 / Show the system</span>
                <h3>Explain the important seams.</h3>
                <p>
                  A useful architecture story shows how data moves, where
                  failure can happen, and what the team chose to keep simple.
                </p>
              </article>
              <article className="principle">
                <span className="principle-number">
                  03 / Leave room for truth
                </span>
                <h3>Include the tradeoff.</h3>
                <p>
                  Honest limits make a project more useful to the next builder
                  than a polished list of features ever could.
                </p>
              </article>
            </div>
            <div className="home-archive-cta">
              <p>
                This preview uses fictional fixtures to show how a public
                case-study archive can read. No real team, submission, or award
                is represented.
              </p>
              <Link className="paper-link text-link" href="/archive">
                Find a project to explore{" "}
                <Sparkles aria-hidden="true" size={15} />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
