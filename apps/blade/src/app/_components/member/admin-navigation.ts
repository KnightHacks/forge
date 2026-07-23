import {
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  LayoutDashboard,
  ListTodo,
  QrCode,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

export interface AdminNavigationAccess {
  analytics?: boolean;
  eventCheckIn?: boolean;
  events?: boolean;
  forms?: boolean;
  issues?: boolean;
  members: boolean;
  roles: boolean;
}

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
    href: "/member/dashboard",
    icon: LayoutDashboard,
    id: "dashboard",
    label: "Dashboard",
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

export function getVisibleAdminNavigation(access: AdminNavigationAccess) {
  return adminNavigationItems.filter(
    (item) => !("access" in item) || access[item.access],
  );
}

export function isAdminNavigationActive(id: string, pathname: string) {
  if (id === "analytics") return pathname.startsWith("/admin/analytics");
  if (id === "events") return pathname.startsWith("/admin/events");
  if (id === "forms") return pathname.startsWith("/admin/forms");
  if (id === "issues") return pathname.startsWith("/admin/issues");
  if (id === "eventCheckIn") return pathname.startsWith("/admin/check-in");
  if (id === "members") return pathname.startsWith("/admin/members");
  if (id === "roles") return pathname.startsWith("/admin/roles");
  return !pathname.startsWith("/admin/");
}
