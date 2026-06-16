import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Button } from "@forge/ui/button";

interface ContentLink {
  href: string;
  label: string;
  variant?: "gold" | "dark";
}

interface ContentStat {
  value: string;
  label: string;
}

interface ContentSection {
  eyebrow: string;
  title: string;
  body: string;
  bullets?: string[];
}

export interface ClubContentPageProps {
  eyebrow: string;
  title: string;
  headlineReveal?:
    | "headline"
    | "headline-wipe"
    | "headline-punch"
    | "headline-ladder"
    | "headline-flicker";
  description: string;
  image: {
    src: string;
    alt: string;
  };
  primaryAction: ContentLink;
  secondaryAction?: ContentLink;
  stats?: ContentStat[];
  sections: ContentSection[];
  finalCta: {
    eyebrow: string;
    title: string;
    body: string;
    actions: ContentLink[];
  };
}

function ContentButton({ href, label, variant = "gold" }: ContentLink) {
  const isExternal = href.startsWith("http") || href.startsWith("mailto:");
  const className =
    variant === "gold"
      ? "club-button bg-[var(--club-gold)] text-black shadow-[4px_4px_0_#ffffff]"
      : "club-button bg-[#170d1c] text-white shadow-[4px_4px_0_rgba(255,255,255,0.35)]";

  const content = (
    <>
      {label}
      <ArrowUpRight aria-hidden="true" className="ml-2 size-4" />
    </>
  );

  return (
    <Button asChild size="lg" className={className}>
      {isExternal ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      ) : (
        <Link href={href}>{content}</Link>
      )}
    </Button>
  );
}

export default function ClubContentPage({
  eyebrow,
  title,
  headlineReveal = "headline-ladder",
  description,
  image,
  primaryAction,
  secondaryAction,
  stats,
  sections,
  finalCta,
}: ClubContentPageProps) {
  return (
    <main className="relative overflow-hidden text-white">
      <section
        className="club-page-hero club-hero-logo-aligned-section relative isolate min-h-[38rem] overflow-hidden px-6 pb-16 md:px-10 md:pb-20 lg:px-24"
        data-hero
      >
        <Image
          src={image.src}
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 z-0 object-cover object-center brightness-[0.62] saturate-[0.9]"
          data-hero-media
        />
        <div
          className="absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(10,1,13,0.94)_0%,rgba(20,3,22,0.72)_42%,rgba(20,3,22,0.22)_100%)]"
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
            {eyebrow}
          </p>
          <h1
            className="mt-5 max-w-[46rem] text-4xl font-black uppercase leading-[0.96] tracking-normal text-white [text-shadow:5px_5px_0_rgba(0,0,0,0.46)] md:text-6xl lg:text-7xl"
            data-reveal={headlineReveal}
          >
            <span className="club-line">
              <span>{title}</span>
            </span>
          </h1>
          <p className="text-white/82 mt-6 max-w-[42rem] text-base font-semibold leading-8 md:text-lg">
            {description}
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <ContentButton {...primaryAction} />
            {secondaryAction ? <ContentButton {...secondaryAction} /> : null}
          </div>
          <p className="sr-only">{image.alt}</p>
        </div>
      </section>

      <div className="club-hero-transition-layer" aria-hidden="true" />

      {stats && stats.length > 0 ? (
        <section className="border-y border-white/10 px-6 py-8 md:px-10 lg:px-24">
          <div className="mx-auto grid max-w-[1120px] gap-6 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} data-reveal>
                <p className="text-3xl font-black text-[var(--club-gold)] md:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-2 max-w-[16rem] text-xs font-black uppercase leading-5 text-[var(--club-muted)]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="px-6 py-24 md:px-10 md:py-28 lg:px-24">
        <div className="mx-auto max-w-[1120px] divide-y divide-white/10 border-y border-white/10">
          {sections.map((section, index) => (
            <article
              key={section.title}
              className="grid gap-8 py-12 lg:grid-cols-[0.55fr_1.45fr] lg:gap-14"
              data-motion-scope
            >
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--club-gold)]">
                  {String(index + 1).padStart(2, "0")} / {section.eyebrow}
                </p>
              </div>
              <div>
                <h2
                  className="max-w-[44rem] text-3xl font-black uppercase leading-none tracking-normal text-white md:text-5xl"
                  data-reveal="headline"
                >
                  <span className="club-line">
                    <span>{section.title}</span>
                  </span>
                </h2>
                <p className="mt-5 max-w-[48rem] text-base font-semibold leading-8 text-[var(--club-muted)] md:text-lg">
                  {section.body}
                </p>
                {section.bullets ? (
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
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 pb-28 text-center md:px-10 md:pb-36 lg:px-24">
        <div className="mx-auto max-w-[760px] border-y border-white/10 py-16">
          <p className="text-sm font-black uppercase tracking-normal text-[var(--club-gold)]">
            {finalCta.eyebrow}
          </p>
          <h2
            className="mt-4 text-4xl font-black uppercase leading-none tracking-normal text-white [text-shadow:4px_4px_0_rgba(0,0,0,0.42)] md:text-6xl"
            data-reveal="headline"
          >
            <span className="club-line">
              <span>{finalCta.title}</span>
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-[36rem] text-base font-semibold leading-8 text-[var(--club-muted)]">
            {finalCta.body}
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            {finalCta.actions.map((action) => (
              <ContentButton key={action.href} {...action} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
