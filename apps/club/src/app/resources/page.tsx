import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import JsonLd from "../_components/json-ld";
import { CLUB_ASSETS } from "../_lib/assets";
import {
  createBreadcrumbJsonLd,
  createPageMetadata,
  createWebPageJsonLd,
} from "../seo";
import { RESOURCE_ARTICLES } from "./resource-data";

export const metadata: Metadata = createPageMetadata({
  title: "Student Tech Resources",
  description:
    "Knight Hacks resources for first-time hackers, UCF student builders, workshop hosts, project teams, and students starting a computer science club.",
  path: "/resources",
});

const jsonLd = [
  createWebPageJsonLd({
    path: "/resources",
    name: "Knight Hacks Resources",
    description:
      "Evergreen guides for hackathons, project building, Git, Devpost, workshops, and student computer science club leadership.",
  }),
  createBreadcrumbJsonLd([
    { name: "Knight Hacks", path: "/" },
    { name: "Resources", path: "/resources" },
  ]),
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Knight Hacks resource library",
    itemListElement: RESOURCE_ARTICLES.map((article, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: article.title,
      url: `https://club.knighthacks.org/resources/${article.slug}`,
    })),
  },
];

export default function ResourcesPage() {
  return (
    <>
      <main className="relative overflow-hidden text-white">
        <section
          className="club-page-hero relative isolate overflow-hidden px-6 pb-24 pt-32 md:px-10 md:pb-28 md:pt-40 lg:px-24"
          data-hero
        >
          <Image
            src={CLUB_ASSETS.projectCollaboration}
            alt=""
            fill
            priority
            sizes="100vw"
            className="absolute inset-0 z-0 object-cover object-center brightness-[0.52] saturate-[0.85]"
            data-hero-media
          />
          <div
            className="absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(10,1,13,0.96)_0%,rgba(20,3,22,0.78)_42%,rgba(20,3,22,0.24)_100%)]"
            data-hero-overlay
          />
          <div
            className="absolute inset-x-0 bottom-0 z-[1] h-36 bg-gradient-to-t from-[var(--club-plum)] to-transparent"
            data-hero-overlay
          />
          <div
            className="relative z-10 mx-auto max-w-[1120px]"
            data-hero-content
            data-stagger
          >
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--club-gold)] md:text-sm">
              Resource Library
            </p>
            <h1
              className="mt-5 max-w-[48rem] text-4xl font-black uppercase leading-[0.96] tracking-normal text-white [text-shadow:5px_5px_0_rgba(0,0,0,0.46)] md:text-6xl lg:text-7xl"
              data-reveal="headline-flicker"
            >
              <span className="club-line">
                <span>Guides for students who build.</span>
              </span>
            </h1>
            <p className="text-white/82 mt-6 max-w-[42rem] text-base font-semibold leading-8 md:text-lg">
              Practical Knight Hacks guides for first hackathons, team projects,
              Git workflow, Devpost demos, workshops, and student organization
              leadership.
            </p>
          </div>
        </section>

        <section className="px-6 py-24 md:px-10 md:py-28 lg:px-24">
          <div className="mx-auto max-w-[1120px] divide-y divide-white/10 border-y border-white/10">
            {RESOURCE_ARTICLES.map((article, index) => (
              <article
                key={article.slug}
                className="grid gap-8 py-10 lg:grid-cols-[0.5fr_1.5fr] lg:gap-14"
                data-motion-scope
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--club-gold)]">
                    {String(index + 1).padStart(2, "0")} / {article.eyebrow}
                  </p>
                  <p className="mt-3 text-xs font-bold uppercase text-white/55">
                    {article.audience} | {article.readTime}
                  </p>
                </div>
                <div>
                  <h2 className="max-w-[46rem] text-3xl font-black uppercase leading-none tracking-normal text-white md:text-5xl">
                    {article.title}
                  </h2>
                  <p className="mt-5 max-w-[48rem] text-base font-semibold leading-8 text-[var(--club-muted)] md:text-lg">
                    {article.description}
                  </p>
                  <Link
                    href={`/resources/${article.slug}`}
                    className="mt-7 inline-flex items-center text-sm font-black uppercase tracking-normal text-[var(--club-gold)] transition-colors hover:text-white"
                  >
                    Read Guide
                    <ArrowUpRight aria-hidden="true" className="ml-2 size-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <JsonLd data={jsonLd} />
    </>
  );
}
