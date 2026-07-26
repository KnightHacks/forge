import {
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  LayoutDashboard,
  ListTodo,
  QrCode,
  ScrollText,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { GUILD_URL } from "~/lib/guild-urls";

export interface AdminNavigationAccess {
  analytics?: boolean;
  eventCheckIn?: boolean;
  events?: boolean;
  forms?: boolean;
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
    access: "analytics",
    href: "/admin/analytics",
    icon: ChartNoAxesCombined,
    id: "analytics",
    label: "Analytics",
  },
  {
    access: "forms",
    href: "/admin/forms",
    icon: ClipboardList,
    id: "forms",
    label: "Forms",
  },
  {
    access: "events",
    href: "/admin/events",
    icon: CalendarDays,
    id: "events",
    label: "Events",
  },
  {
    access: "issues",
    href: "/admin/issues/calendar",
    icon: ListTodo,
    id: "issues",
    label: "Issues",
  },
  {
    access: "eventCheckIn",
    href: "/admin/check-in",
    icon: QrCode,
    id: "eventCheckIn",
    label: "Event Check-in",
  },
  {
    access: "members",
    href: "/admin/companies",
    icon: Building2,
    id: "companies",
    label: "Companies",
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
  {
    access: "logs",
    href: "/admin/logs",
    icon: ScrollText,
    id: "logs",
    label: "Admin logs",
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
  if (id === "analytics") return pathname.startsWith("/admin/analytics");
  if (id === "events") return pathname.startsWith("/admin/events");
  if (id === "forms") return pathname.startsWith("/admin/forms");
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
