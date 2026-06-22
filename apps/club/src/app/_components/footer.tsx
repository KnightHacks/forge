import Image from "next/image";
import Link from "next/link";
import {
  FaDiscord,
  FaGithub,
  FaInstagram,
  FaLink,
  FaLinkedin,
} from "react-icons/fa";

import {
  FOOTER_QUICK_LINKS,
  FOOTER_RESOURCE_LINKS,
  PUBLIC_LINKS,
} from "../_lib/site-config";

const SOCIAL_LINKS = [
  {
    label: "Knight Hacks Discord",
    href: PUBLIC_LINKS.discord,
    icon: FaDiscord,
  },
  {
    label: "Knight Hacks on Instagram",
    href: PUBLIC_LINKS.instagram,
    icon: FaInstagram,
  },
  {
    label: "Knight Hacks on LinkedIn",
    href: PUBLIC_LINKS.linkedin,
    icon: FaLinkedin,
  },
  {
    label: "Knight Hacks on GitHub",
    href: PUBLIC_LINKS.github,
    icon: FaGithub,
  },
  {
    label: "Knight Hacks Linktree",
    href: PUBLIC_LINKS.linktree,
    icon: FaLink,
  },
] as const;

const UX_CREDIT_LINKS = [
  {
    label: "Tory",
    href: "https://www.linkedin.com/in/tory-deutsch-967021200/",
  },
  {
    label: "Thashin",
    href: "https://www.linkedin.com/in/thashin04/",
  },
] as const;

function FooterAnchor({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const isExternal = href.startsWith("http");

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  return <Link href={href}>{children}</Link>;
}

function FooterSocialLinks({
  className,
  iconClassName,
}: {
  className: string;
  iconClassName: string;
}) {
  return (
    <div className={className} aria-label="Social links">
      {SOCIAL_LINKS.map((social) => {
        const Icon = social.icon;

        return (
          <a
            key={social.href}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.label}
            className="club-social-link text-[var(--club-subtle)] transition-colors hover:text-white"
          >
            <Icon aria-hidden="true" className={iconClassName} />
          </a>
        );
      })}
    </div>
  );
}

export default function Footer({ bladeUrl }: { bladeUrl: string }) {
  const resourceLinks = [
    { label: "Blade", href: bladeUrl },
    ...FOOTER_RESOURCE_LINKS,
  ];

  return (
    <footer className="relative bg-[linear-gradient(180deg,rgba(20,3,22,0.92)_0%,var(--club-plum-deep)_34%)] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-16 h-16 bg-gradient-to-b from-transparent via-[#140316]/70 to-[var(--club-plum-deep)] md:-top-24 md:h-24"
      />
      <div className="container relative py-8 md:py-20">
        <div
          className="grid grid-cols-2 gap-x-8 gap-y-8 md:grid-cols-[1fr_auto_auto] md:gap-20 lg:gap-32"
          data-stagger
        >
          <div className="col-span-2 max-w-[28rem] md:col-span-1">
            <div className="flex items-center justify-between gap-5 md:block">
              <Image
                src="/knighthacks.svg"
                alt="Knight Hacks"
                width={1867}
                height={504}
                className="h-auto w-28 brightness-0 invert md:w-36"
              />
              <FooterSocialLinks
                className="flex items-center gap-4 md:hidden"
                iconClassName="size-5"
              />
            </div>
            <p className="mt-6 hidden max-w-[28rem] text-base leading-7 text-[var(--club-subtle)] md:block">
              Empowering students to grow as developers and leaders in tech
              through hands-on creation.
            </p>
            <FooterSocialLinks
              className="mt-8 hidden items-center gap-5 md:flex"
              iconClassName="size-6"
            />
          </div>

          <nav aria-label="Footer quick links" className="min-w-0 md:min-w-36">
            <h2 className="text-sm font-black uppercase tracking-[0.12em] md:text-lg md:font-semibold md:normal-case md:tracking-normal">
              Quick Links
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5 text-sm leading-5 text-[var(--club-muted)] md:mt-7 md:gap-5 md:text-base md:leading-6">
              {FOOTER_QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Footer resources" className="min-w-0 md:min-w-36">
            <h2 className="text-sm font-black uppercase tracking-[0.12em] md:text-lg md:font-semibold md:normal-case md:tracking-normal">
              Resources
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5 text-sm leading-5 text-[var(--club-muted)] md:mt-7 md:gap-5 md:text-base md:leading-6">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <FooterAnchor href={link.href}>
                    <span className="transition-colors hover:text-white">
                      {link.label}
                    </span>
                  </FooterAnchor>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div
          className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 md:mt-14 md:flex-row md:items-center md:justify-between md:gap-8 md:pt-8"
          data-reveal
        >
          <p className="text-xs leading-5 text-[var(--club-subtle)] md:text-sm">
            <span className="md:hidden">© 2026 Knight Hacks.</span>
            <span className="hidden md:inline">
              © Copyright 2026, All Rights Reserved by Knight Hacks
            </span>
          </p>
          <p className="club-footer-credit whitespace-nowrap text-[0.5rem] leading-4 text-[var(--club-subtle)] min-[375px]:text-[0.625rem] sm:text-xs sm:leading-5 md:text-right md:text-sm">
            Made with love by the{" "}
            <span className="club-footer-dev-team">Dev Team</span>. UX by{" "}
            {UX_CREDIT_LINKS.map((credit, index) => (
              <span key={credit.href}>
                {index > 0 ? " and " : ""}
                <a
                  href={credit.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[var(--club-muted)] transition-colors hover:text-white"
                >
                  {credit.label}
                </a>
              </span>
            ))}
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
