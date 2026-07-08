import type { NavbarLink, NavbarSocialLink } from "./Navbar";

export const KHIX_HOME_NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "About Us", href: "#about" },
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
    label: "Knight Hacks on Instagram",
    href: "https://www.instagram.com/knighthacks/",
    shortLabel: "ig",
  },
] satisfies NavbarSocialLink[];
