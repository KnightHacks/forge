import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import { Card, CardContent } from "@forge/ui/card";

import { DiscordSignInLink } from "~/app/_components/auth/discord-sign-in-link";
import { GUILD_URL } from "~/lib/guild-urls";

const CLUB_URL = "https://club.knighthacks.org";
const DISCORD_URL = "https://discord.gg/knighthacks";
const CODE_OF_CONDUCT_URL = "https://knight-hacks.notion.site/code-of-conduct";

export const landingPanelClassName =
  "overflow-hidden border-white/10 bg-card/95 shadow-2xl shadow-black/25";
export const landingInsetClassName =
  "rounded-md border border-white/10 bg-background/60";

export function EditorialCopy({
  action,
  description,
  eyebrow,
  icon: Icon,
  title,
}: {
  action?: ReactNode;
  description: string;
  eyebrow: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        <span>{eyebrow}</span>
      </div>
      <h2 className="mt-2 text-balance text-2xl font-semibold tracking-normal sm:text-3xl">
        {title}
      </h2>
      <p className="mt-3 text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ClosingCallToAction() {
  return (
    <section className="container px-4 pb-10 pt-6 sm:px-8 sm:pb-14 sm:pt-8">
      <Card className={landingPanelClassName}>
        <CardContent className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary">Discord sign-in</p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              Sign in to Blade
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
              Blade uses Discord for authentication. Returning members go to
              their dashboard. New members continue to the signup form.
            </p>
          </div>
          <DiscordSignInLink className="h-12 w-full shrink-0 px-6 text-base md:w-auto">
            Continue with Discord
          </DiscordSignInLink>
        </CardContent>
      </Card>
    </section>
  );
}

export function LandingFooter() {
  const links = [
    { href: CLUB_URL, label: "Knight Hacks" },
    { href: GUILD_URL, label: "Guild" },
    { href: DISCORD_URL, label: "Discord" },
    { href: "/sponsor", label: "Sponsor us" },
    { href: CODE_OF_CONDUCT_URL, label: "Code of Conduct" },
  ] as const;

  return (
    <footer className="container px-4 pb-8 pt-2 sm:px-8">
      <div className="flex flex-col gap-5 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/blade-logo.svg"
            alt="Blade by Knight Hacks"
            width={1880}
            height={375}
            className="h-auto w-32"
          />
          <span className="text-sm text-muted-foreground">
            The Knight Hacks member portal
          </span>
        </div>
        <nav
          aria-label="Blade footer"
          className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium text-muted-foreground"
        >
          {links.map((link) =>
            link.href.startsWith("/") ? (
              <Link
                key={link.href}
                href={link.href}
                className="transition hover:text-foreground"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-foreground"
              >
                {link.label}
              </a>
            ),
          )}
        </nav>
      </div>
    </footer>
  );
}
