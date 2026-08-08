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
  roles?: boolean;
}

export const memberNavigationItems = [
  {
    href: "/member/dashboard",
    icon: LayoutDashboard,
    id: "dashboard",
    label: "Dashboard",
  },
  {
    external: true,
    href: GUILD_URL,
    icon: UsersRound,
    id: "guild",
    label: "Guild",
  },
] as const;

export const adminNavigationItems = [
  {
    access: "logs",
    href: "/admin/logs",
    icon: ScrollText,
    id: "logs",
    label: "Admin logs",
  },
  {
    access: "alumni",
    href: "/admin/alumni",
    icon: GraduationCap,
    id: "alumni",
    label: "Alumni",
  },
  {
    access: "analytics",
    href: "/admin/analytics",
    icon: ChartNoAxesCombined,
    id: "analytics",
    label: "Analytics",
  },
  {
    access: "companies",
    href: "/admin/companies",
    icon: Building2,
    id: "companies",
    label: "Companies",
  },
  {
    access: "discordArchive",
    href: "/admin/discord-archive",
    icon: DatabaseZap,
    id: "discordArchive",
    label: "Discord archive",
  },
  {
    access: "email",
    href: "/admin/email",
    icon: Mail,
    id: "email",
    label: "Email",
  },
  {
    access: "eventCheckIn",
    href: "/admin/check-in",
    icon: QrCode,
    id: "eventCheckIn",
    label: "Event Check-in",
  },
  {
    access: "events",
    href: "/admin/events",
    icon: CalendarDays,
    id: "events",
    label: "Events",
  },
  {
    access: "forms",
    href: "/admin/forms",
    icon: ClipboardList,
    id: "forms",
    label: "Forms",
  },
  {
    access: "hackathonCheckIn",
    href: "/admin/hackathon-check-in",
    icon: ScanLine,
    id: "hackathonCheckIn",
    label: "Hackathon Check-in",
  },
  {
    access: "hackathonEvents",
    href: "/admin/hackathon-events",
    icon: CalendarClock,
    id: "hackathonEvents",
    label: "Hackathon Events",
  },
  {
    access: "hackathon",
    href: "/admin/hackathon",
    icon: Swords,
    id: "hackathon",
    label: "Hackathons",
  },
  {
    access: "hackers",
    href: "/admin/hackers",
    icon: UserSearch,
    id: "hackers",
    label: "Hackers",
  },
  {
    access: "issues",
    href: "/admin/issues/calendar",
    icon: ListTodo,
    id: "issues",
    label: "Issues",
  },
  {
    access: "members",
    href: "/admin/members",
    icon: UsersRound,
    id: "members",
    label: "Members",
  },
  {
    access: "roles",
    href: "/admin/roles",
    icon: ShieldCheck,
    id: "roles",
    label: "Roles",
  },
] as const;

export const settingsNavigationItem = {
  href: "/member/settings",
  icon: Settings,
  id: "settings",
  label: "Settings",
} as const;

export function getVisibleAdminNavigation(access: AdminNavigationAccess) {
  return adminNavigationItems.filter((item) => access[item.access]);
}

export function isAdminNavigationActive(id: string, pathname: string) {
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
