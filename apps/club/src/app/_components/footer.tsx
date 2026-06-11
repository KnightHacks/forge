import Image from "next/image";
import Link from "next/link";
import { Instagram, Linkedin, Mail, Twitter } from "lucide-react";

const QUICK_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Join", href: "/join" },
  { label: "Events", href: "/events" },
  { label: "Hackathons", href: "/hackathons" },
  { label: "Teams", href: "/teams" },
  { label: "Sponsors", href: "/sponsors" },
] as const;

const RESOURCE_LINKS = [
  { label: "Resources", href: "/resources" },
  { label: "Kickstart", href: "/kickstart" },
  { label: "Project Launch", href: "/project-launch" },
  { label: "Code of Conduct", href: "/code-of-conduct" },
  { label: "Discord", href: "https://discord.gg/knighthacks" },
  { label: "GitHub", href: "https://github.com/KnightHacks" },
] as const;

const SOCIAL_LINKS = [
  {
    label: "Knight Hacks on X",
    href: "https://twitter.com/knighthacks",
    icon: Twitter,
  },
  {
    label: "Email Knight Hacks",
    href: "mailto:team@knighthacks.org",
    icon: Mail,
  },
  {
    label: "Knight Hacks on Instagram",
    href: "https://instagram.com/knighthacks",
    icon: Instagram,
  },
  {
    label: "Knight Hacks on LinkedIn",
    href: "https://linkedin.com/company/knight-hacks",
    icon: Linkedin,
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
            target={social.href.startsWith("mailto:") ? undefined : "_blank"}
            rel={
              social.href.startsWith("mailto:")
                ? undefined
                : "noopener noreferrer"
            }
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
  const resourceLinks = [{ label: "Blade", href: bladeUrl }, ...RESOURCE_LINKS];

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
              {QUICK_LINKS.map((link) => (
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
          className="mt-8 border-t border-white/10 pt-5 md:mt-14 md:pt-8"
          data-reveal
        >
          <p className="text-xs leading-5 text-[var(--club-subtle)] md:text-sm">
            <span className="md:hidden">© 2026 Knight Hacks.</span>
            <span className="hidden md:inline">
              © Copyright 2026, All Rights Reserved by Knight Hacks
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
