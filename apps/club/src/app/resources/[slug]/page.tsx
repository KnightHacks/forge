import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { Button } from "@forge/ui/button";

import JsonLd from "../../_components/json-ld";
import {
  createArticleJsonLd,
  createBreadcrumbJsonLd,
  createPageMetadata,
} from "../../seo";
import { getResourceArticle, RESOURCE_ARTICLES } from "../resource-data";

interface ResourcePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export function generateStaticParams() {
  return RESOURCE_ARTICLES.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({
  params,
}: ResourcePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getResourceArticle(slug);

  if (!article) {
    return {};
  }

  return createPageMetadata({
    title: article.title,
    description: article.description,
    path: `/resources/${article.slug}`,
  });
}

export default async function ResourceArticlePage({
  params,
}: ResourcePageProps) {
  const { slug } = await params;
  const article = getResourceArticle(slug);

  if (!article) {
    notFound();
  }

  const jsonLd = [
    createArticleJsonLd({
      path: `/resources/${article.slug}`,
      title: article.title,
      description: article.description,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
    }),
    createBreadcrumbJsonLd([
      { name: "Knight Hacks", path: "/" },
      { name: "Resources", path: "/resources" },
      { name: article.title, path: `/resources/${article.slug}` },
    ]),
  ];

  return (
    <>
      <main className="relative overflow-hidden text-white">
        <section
          className="club-page-hero club-hero-logo-aligned-section relative isolate min-h-[34rem] overflow-hidden px-6 pb-16 md:px-10 md:pb-20 lg:px-24"
          data-hero
        >
          <Image
            src={article.image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="absolute inset-0 z-0 object-cover object-center brightness-[0.56] saturate-[0.86]"
            data-hero-media
          />
          <div
            className="absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(10,1,13,0.96)_0%,rgba(20,3,22,0.76)_44%,rgba(20,3,22,0.18)_100%)]"
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
            <Link
              href="/resources"
              className="inline-flex items-center text-xs font-black uppercase tracking-normal text-[var(--club-gold)] transition-colors hover:text-white"
            >
              <ArrowLeft aria-hidden="true" className="mr-2 size-4" />
              Resources
            </Link>
            <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-[var(--club-gold)] md:text-sm">
              {article.eyebrow}
            </p>
            <h1
              className="mt-5 max-w-[52rem] text-4xl font-black uppercase leading-[0.96] tracking-normal text-white [text-shadow:5px_5px_0_rgba(0,0,0,0.46)] md:text-6xl"
              data-reveal="headline"
            >
              {article.title}
            </h1>
            <p className="text-white/82 mt-6 max-w-[44rem] text-base font-semibold leading-8 md:text-lg">
              {article.description}
            </p>
            <p className="text-white/58 mt-5 text-xs font-bold uppercase">
              {article.audience} | {article.readTime}
            </p>
          </div>
        </section>

        <div className="club-hero-transition-layer" aria-hidden="true" />

        <section className="px-6 py-24 md:px-10 md:py-28 lg:px-24">
          <div className="mx-auto max-w-[980px] divide-y divide-white/10 border-y border-white/10">
            {article.sections.map((section, index) => (
              <article key={section.title} className="py-12" data-motion-scope>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--club-gold)]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h2
                  className="mt-4 max-w-[48rem] text-3xl font-black uppercase leading-none tracking-normal text-white md:text-5xl"
                  data-reveal="headline"
                >
                  {section.title}
                </h2>
                <p className="mt-5 max-w-[50rem] text-base font-semibold leading-8 text-[var(--club-muted)] md:text-lg">
                  {section.body}
                </p>
                {section.bullets?.length ? (
                  <ul className="text-white/82 mt-8 grid gap-4 text-sm font-bold leading-6 md:grid-cols-2">
                    {section.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="border-l-2 border-[var(--club-gold)] pl-4"
                      >
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="px-6 pb-28 text-center md:px-10 md:pb-36 lg:px-24">
          <div className="mx-auto max-w-[760px] border-y border-white/10 py-16">
            <p className="text-sm font-black uppercase tracking-normal text-[var(--club-gold)]">
              Keep going
            </p>
            <h2 className="mt-4 text-4xl font-black uppercase leading-none tracking-normal text-white [text-shadow:4px_4px_0_rgba(0,0,0,0.42)] md:text-6xl">
              Build with Knight Hacks.
            </h2>
            <p className="mx-auto mt-6 max-w-[36rem] text-base font-semibold leading-8 text-[var(--club-muted)]">
              Use this guide at your next workshop, project night, or hackathon.
              The fastest path is still showing up and building with other
              students.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="club-button bg-[var(--club-gold)] text-black shadow-[4px_4px_0_#ffffff]"
              >
                <Link href="/events">
                  View Events
                  <ArrowUpRight aria-hidden="true" className="ml-2 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="club-button bg-[#170d1c] text-white shadow-[4px_4px_0_rgba(255,255,255,0.35)]"
              >
                <Link href="/join">
                  Join Knight Hacks
                  <ArrowUpRight aria-hidden="true" className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <JsonLd data={jsonLd} />
    </>
  );
}
