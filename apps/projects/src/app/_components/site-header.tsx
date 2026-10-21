import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function SiteHeader({ active }: { active?: "home" | "archive" }) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner container">
          <Link
            className="brand-lockup"
            href="/"
            aria-label="Knight Hacks Projects home"
          >
            <Image
              className="brand-wordmark"
              src="/knighthacks.svg"
              alt="Knight Hacks"
              width={180}
              height={49}
              priority
            />
            <span className="brand-projects">
              <span aria-hidden="true" />
              Projects
            </span>
          </Link>
          <nav className="primary-nav" aria-label="Primary navigation">
            <Link
              href="/"
              aria-current={active === "home" ? "page" : undefined}
            >
              About
            </Link>
            <Link
              href="/archive"
              aria-current={active === "archive" ? "page" : undefined}
            >
              Archive
            </Link>
            <a className="nav-cta" href="https://knighthacks.org">
              Knight Hacks <ArrowUpRight aria-hidden="true" size={14} />
            </a>
          </nav>
        </div>
      </header>
      <div
        className="fixture-notice"
        role="note"
        aria-label="Fixture content notice"
      >
        <strong>Illustrative preview</strong>
        <span>
          Every project and team shown here is a fictional fixture, not a real
          submission or award.
        </span>
      </div>
    </>
  );
}
