import type { NavbarLink, NavbarSocialLink } from "./Navbar";

export const KHIX_HOME_NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Tracks", href: "#tracks" },
  { label: "Speakers", href: "#speakers" },
  { label: "Sponsors", href: "#sponsors" },
  { label: "Team", href: "#team" },
  { label: "FAQ", href: "#faq" },
] satisfies NavbarLink[];

export const KHIX_SITE_NAV_LINKS = KHIX_HOME_NAV_LINKS.map((link) => ({
  ...link,
  href: link.href === "#home" ? "/" : `/${link.href}`,
})) satisfies NavbarLink[];

export const KHIX_SOCIAL_LINKS = [
  {
    label: "Join Knight Hacks on Discord",
    href: "https://discord.knighthacks.org/",
    icon: "discord",
  },
  {
    label: "Knight Hacks on Instagram",
    href: "https://www.instagram.com/knighthacks/",
    icon: "instagram",
  },
] satisfies NavbarSocialLink[];
