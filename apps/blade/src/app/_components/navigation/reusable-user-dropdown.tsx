import {
  CalendarDays,
  ChartPie,
  FormInput,
  Hotel,
  Mail,
  Settings,
  ShieldCheck,
  Swords,
  TicketCheck,
  User,
  Users,
} from "lucide-react";

import type { PERMISSIONS } from "@forge/consts";

import { USER_DROPDOWN_ICON_COLOR, USER_DROPDOWN_ICON_SIZE } from "~/consts";

/*
 * name = the text to be displayed
 * component = the corresponding icon for the name
 * route = the specific route you want the user to enter
 * requiredPermissions = permissions needed to access this item
 *   - or: user needs at least ONE of these permissions
 *   - and: user needs ALL of these permissions
 */
export interface roleItems {
  name: string;
  component: React.JSX.Element;
  route: string;
  requiredPermissions?: {
    or?: PERMISSIONS.PermissionKey[];
    and?: PERMISSIONS.PermissionKey[];
  };
}

// Use these as a reference for creating new items and remember to import them into ./user-dropdown

export const adminItems: roleItems[] = [
  {
    name: "Admin",
    component: (
      <ShieldCheck
        color={USER_DROPDOWN_ICON_COLOR}
        size={USER_DROPDOWN_ICON_SIZE}
      />
    ),
    route: "/admin",
    requiredPermissions: {
      or: ["IS_OFFICER"],
    },
  },
];

export const systemItems: roleItems[] = [
  {
    name: "Forms",
    component: (
      <FormInput
        color={USER_DROPDOWN_ICON_COLOR}
        size={USER_DROPDOWN_ICON_SIZE}
      />
    ),
    route: "/admin/forms",
    requiredPermissions: {
      or: ["READ_FORMS", "EDIT_FORMS", "IS_OFFICER"],
    },
  },
  {
    name: "Email",
    component: (
      <Mail color={USER_DROPDOWN_ICON_COLOR} size={USER_DROPDOWN_ICON_SIZE} />
    ),
    route: "/admin/email",
    requiredPermissions: {
      or: ["EMAIL_PORTAL", "IS_OFFICER"],
    },
  },
  {
    name: "Assign Roles",
    component: (
      <Users color={USER_DROPDOWN_ICON_COLOR} size={USER_DROPDOWN_ICON_SIZE} />
    ),
    route: "/admin/roles/manage",
    requiredPermissions: {
      or: ["ASSIGN_ROLES", "IS_OFFICER"],
    },
  },
  {
    name: "Configure Roles",
    component: (
      <Settings
        color={USER_DROPDOWN_ICON_COLOR}
        size={USER_DROPDOWN_ICON_SIZE}
      />
    ),
    route: "/admin/roles/configure",
    requiredPermissions: {
      or: ["CONFIGURE_ROLES", "IS_OFFICER"],
    },
  },
];

export const clubItems: roleItems[] = [
  {
    name: "Members",
    component: (
      <User color={USER_DROPDOWN_ICON_COLOR} size={USER_DROPDOWN_ICON_SIZE} />
    ),
    route: "/admin/club/members",
    requiredPermissions: {
      or: ["READ_MEMBERS", "EDIT_MEMBERS", "IS_OFFICER"],
    },
  },
  {
    name: "Events",
    component: (
      <CalendarDays
        color={USER_DROPDOWN_ICON_COLOR}
        size={USER_DROPDOWN_ICON_SIZE}
      />
    ),
    route: "/admin/club/events",
    requiredPermissions: {
      or: ["READ_CLUB_EVENT", "EDIT_CLUB_EVENT", "IS_OFFICER"],
    },
  },
  {
    name: "Check-in",
    component: (
      <TicketCheck
        color={USER_DROPDOWN_ICON_COLOR}
        size={USER_DROPDOWN_ICON_SIZE}
      />
    ),
    route: "/admin/club/check-in",
    requiredPermissions: {
      or: ["CHECKIN_CLUB_EVENT", "IS_OFFICER"],
    },
  },
  {
    name: "Data",
    component: (
      <ChartPie
        color={USER_DROPDOWN_ICON_COLOR}
        size={USER_DROPDOWN_ICON_SIZE}
      />
    ),
    route: "/admin/club/data",
    requiredPermissions: {
      or: ["READ_CLUB_DATA", "IS_OFFICER"],
    },
  },
];

export const hackathonItems: roleItems[] = [
  {
    name: "Hackers",
    component: (
      <Swords color={USER_DROPDOWN_ICON_COLOR} size={USER_DROPDOWN_ICON_SIZE} />
    ),
    route: "/admin/hackathon/hackers",
    requiredPermissions: {
      or: ["READ_HACKERS", "EDIT_HACKERS", "IS_OFFICER"],
    },
  },
  {
    name: "Events",
    component: (
      <CalendarDays
        color={USER_DROPDOWN_ICON_COLOR}
        size={USER_DROPDOWN_ICON_SIZE}
      />
    ),
    route: "/admin/hackathon/events",
    requiredPermissions: {
      or: ["READ_HACK_EVENT", "EDIT_HACK_EVENT", "IS_OFFICER"],
    },
  },
  {
    name: "Check-in",
    component: (
      <TicketCheck
        color={USER_DROPDOWN_ICON_COLOR}
        size={USER_DROPDOWN_ICON_SIZE}
      />
    ),
    route: "/admin/hackathon/check-in",
    requiredPermissions: {
      or: ["CHECKIN_HACK_EVENT", "IS_OFFICER"],
    },
  },
  {
    name: "Data",
    component: (
      <ChartPie
        color={USER_DROPDOWN_ICON_COLOR}
        size={USER_DROPDOWN_ICON_SIZE}
      />
    ),
    route: "/admin/hackathon/data",
    requiredPermissions: {
      or: ["READ_HACK_DATA", "IS_OFFICER"],
    },
  },
  {
    name: "Room Assignment",
    component: (
      <Hotel color={USER_DROPDOWN_ICON_COLOR} size={USER_DROPDOWN_ICON_SIZE} />
    ),
    route: "/admin/hackathon/roomAssignment",
    requiredPermissions: {
      or: ["IS_OFFICER"],
    },
  },
  {
    name: "Judge Assignment",
    component: (
      <Users color={USER_DROPDOWN_ICON_COLOR} size={USER_DROPDOWN_ICON_SIZE} />
    ),
    route: "/admin/hackathon/judge-assignment",
    requiredPermissions: {
      or: ["IS_JUDGE", "IS_OFFICER"],
    },
  },
];

export const userItems: roleItems[] = [
  {
    name: "Settings",
    component: (
      <Settings
        color={USER_DROPDOWN_ICON_COLOR}
        size={USER_DROPDOWN_ICON_SIZE}
      />
    ),
    route: "/settings",
  },
];
