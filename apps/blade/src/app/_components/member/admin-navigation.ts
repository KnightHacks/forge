import { LayoutDashboard, ShieldCheck, UsersRound } from "lucide-react";

export interface AdminNavigationAccess {
  members: boolean;
  roles: boolean;
}

export const adminNavigationItems = [
  {
    href: "/member/dashboard",
    icon: LayoutDashboard,
    id: "dashboard",
    label: "Dashboard",
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
  if (id === "members") return pathname.startsWith("/admin/members");
  if (id === "roles") return pathname.startsWith("/admin/roles");
  return !pathname.startsWith("/admin/");
}
