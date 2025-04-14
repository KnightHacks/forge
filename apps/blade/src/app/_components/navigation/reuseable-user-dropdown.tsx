import {
  CalendarDays,
  ChartPie,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";

import { USER_DROPDOWN_ICON_COLOR, USER_DROPDOWN_ICON_SIZE } from "~/consts";

/*
 * name = the text to be displayed
 * component = the corresponding icon for the name
 * route = the specific route you want the user to enter
 */
export interface roleItems {
  name: string;
  component: React.JSX.Element;
  route: string;
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
  },
  {
    name: "Members",
    component: (
      <User color={USER_DROPDOWN_ICON_COLOR} size={USER_DROPDOWN_ICON_SIZE} />
    ),
    route: "/admin/members",
  },
  {
    name: "Events",
    component: (
      <CalendarDays
        color={USER_DROPDOWN_ICON_COLOR}
        size={USER_DROPDOWN_ICON_SIZE}
      />
    ),
    route: "/admin/events",
  },
  {
    name: "Data",
    component: (
      <ChartPie
        color={USER_DROPDOWN_ICON_COLOR}
        size={USER_DROPDOWN_ICON_SIZE}
      />
    ),
    route: "/admin/data",
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
