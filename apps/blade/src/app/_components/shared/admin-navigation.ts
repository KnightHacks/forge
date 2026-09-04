import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CalendarClock,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  DatabaseZap,
  GraduationCap,
  LayoutDashboard,
  ListTodo,
  Mail,
  PanelsTopLeft,
  QrCode,
  ScanLine,
  ScrollText,
  Settings,
  ShieldCheck,
  Swords,
  UserSearch,
  UsersRound,
} from "lucide-react";

import { GUILD_URL } from "~/lib/guild-urls";

export interface NavigationDestination {
  external?: boolean;
  href: string;
  icon: LucideIcon;
  id: string;
  label: string;
}

export interface NavigationGroup {
  items: NavigationDestination[];
  label: string;
}

export interface AdminNavigationAccess {
  alumni?: boolean;
  analytics?: boolean;
  companies?: boolean;
  discordArchive?: boolean;
  email?: boolean;
  eventCheckIn?: boolean;
  events?: boolean;
  forms?: boolean;
  hackathon?: boolean;
  hackathonCheckIn?: boolean;
  hackathonEvents?: boolean;
  hackers?: boolean;
  issues?: boolean;
  logs?: boolean;
  members?: boolean;
  projectAdmin?: boolean;
  judging?: boolean;
  judgeProjects?: boolean;
  roles?: boolean;
}

export const memberNavigationItems = [
  {
    href: "/member/dashboard",
    icon: LayoutDashboard,
    id: "dashboard",
    label: "Dashboard",
  },
] as const;

export const externalNavigationItems = [
  {
    external: true,
    href: GUILD_URL,
    icon: UsersRound,
    id: "guild",
    label: "Guild",
  },
] as const;

// Declaration order is the approved grouping map; the rail renders it as-is.
export const adminNavigationItems = [
  {
    access: "analytics",
    group: "Club",
    href: "/admin/analytics",
    icon: ChartNoAxesCombined,
    id: "analytics",
    label: "Analytics",
  },
  {
    access: "members",
    group: "Club",
    href: "/admin/members",
    icon: UsersRound,
    id: "members",
    label: "Members",
  },
  {
    access: "alumni",
    group: "Club",
    href: "/admin/alumni",
    icon: GraduationCap,
    id: "alumni",
    label: "Alumni",
  },
  {
    access: "companies",
    group: "Club",
    href: "/admin/companies",
    icon: Building2,
    id: "companies",
    label: "Companies",
  },
  {
    access: "events",
    group: "Club",
    href: "/admin/events",
    icon: CalendarDays,
    id: "events",
    label: "Events",
  },
  {
    access: "eventCheckIn",
    group: "Club",
    href: "/admin/check-in",
    icon: QrCode,
    id: "eventCheckIn",
    label: "Event Check-in",
  },
  {
    access: "issues",
    group: "Team",
    href: "/admin/issues/calendar",
    icon: ListTodo,
    id: "issues",
    label: "Issues",
  },
  {
    access: "forms",
    group: "Team",
    href: "/admin/forms",
    icon: ClipboardList,
    id: "forms",
    label: "Forms",
  },
  {
    access: "email",
    group: "Team",
    href: "/admin/email",
    icon: Mail,
    id: "email",
    label: "Email",
  },
  {
    access: "roles",
    group: "Team",
    href: "/admin/roles",
    icon: ShieldCheck,
    id: "roles",
    label: "Roles",
  },
  {
    access: "discordArchive",
    group: "Team",
    href: "/admin/discord-archive",
    icon: DatabaseZap,
    id: "discordArchive",
    label: "Discord archive",
  },
  {
    access: "logs",
    group: "Team",
    href: "/admin/logs",
    icon: ScrollText,
    id: "logs",
    label: "Admin logs",
  },
  {
    access: "hackathon",
    group: "Hackathon",
    href: "/admin/hackathon",
    icon: Swords,
    id: "hackathon",
    label: "Hackathons",
  },
  {
    access: "hackers",
    group: "Hackathon",
    href: "/admin/hackers",
    icon: UserSearch,
    id: "hackers",
    label: "Hackers",
  },
  {
    access: "hackathonEvents",
    group: "Hackathon",
    href: "/admin/hackathon-events",
    icon: CalendarClock,
    id: "hackathonEvents",
    label: "Hackathon Events",
  },
  {
    access: "hackathonCheckIn",
    group: "Hackathon",
    href: "/admin/hackathon-check-in",
    icon: ScanLine,
    id: "hackathonCheckIn",
    label: "Hackathon Check-in",
  },
  {
    access: "judgeProjects",
    group: "Hackathon",
    href: "/judge/projects",
    icon: PanelsTopLeft,
    id: "judgeProjects",
    label: "Projects",
  },
  {
    access: "projectAdmin",
    group: "Hackathon",
    href: "/admin/projects",
    icon: ClipboardList,
    id: "projectAdmin",
    label: "Project import",
  },
  {
    access: "judging",
    group: "Hackathon",
    href: "/admin/judging",
    icon: Swords,
    id: "judging",
    label: "Judging rooms",
  },
] as const;

export const ADMIN_NAVIGATION_GROUPS = ["Club", "Team", "Hackathon"] as const;

export const settingsNavigationItem = {
  href: "/member/settings",
  icon: Settings,
  id: "settings",
  label: "Settings",
} as const;

export function getVisibleAdminNavigation(access: AdminNavigationAccess) {
  return adminNavigationItems.filter((item) => access[item.access]);
}

/** Authorized destinations by domain, with empty groups omitted. */
export function getAdminNavigationGroups(
  access: AdminNavigationAccess,
): NavigationGroup[] {
  const visible = getVisibleAdminNavigation(access);

  const domainGroups = ADMIN_NAVIGATION_GROUPS.map((label) => ({
    items: visible
      .filter((item) => item.group === label)
      .map((item) => ({ ...item })),
    label: label as string,
  })).filter((group) => group.items.length > 0);

  return [
    ...domainGroups,
    {
      items: externalNavigationItems.map((item) => ({ ...item })),
      label: "External",
    },
  ];
}

export function isAdminNavigationActive(id: string, pathname: string) {
  if (id === "judgeProjects") return pathname.startsWith("/judge/projects");
  if (id === "projectAdmin") return pathname.startsWith("/admin/projects");
  if (id === "judging") return pathname.startsWith("/admin/judging");
  if (id === "alumni") return pathname.startsWith("/admin/alumni");
  if (id === "analytics") return pathname.startsWith("/admin/analytics");
  if (id === "discordArchive")
    return pathname.startsWith("/admin/discord-archive");
  if (id === "events") return pathname.startsWith("/admin/events");
  if (id === "email") return pathname.startsWith("/admin/email");
  if (id === "forms") return pathname.startsWith("/admin/forms");
  if (id === "hackathonCheckIn")
    return pathname.startsWith("/admin/hackathon-check-in");
  if (id === "hackathonEvents")
    return pathname.startsWith("/admin/hackathon-events");
  if (id === "hackathon")
    return (
      pathname === "/admin/hackathon" ||
      pathname.startsWith("/admin/hackathon/")
    );
  if (id === "hackers") return pathname.startsWith("/admin/hackers");
  if (id === "issues") return pathname.startsWith("/admin/issues");
  if (id === "eventCheckIn") return pathname.startsWith("/admin/check-in");
  if (id === "companies") return pathname.startsWith("/admin/companies");
  if (id === "members") return pathname.startsWith("/admin/members");
  if (id === "roles") return pathname.startsWith("/admin/roles");
  if (id === "logs") return pathname.startsWith("/admin/logs");
  if (id === "settings") return pathname.startsWith("/member/settings");
  if (id === "dashboard") {
    return (
      !pathname.startsWith("/admin/") &&
      !pathname.startsWith("/member/settings")
    );
  }
  return false;
}
