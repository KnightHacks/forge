import {
  CalendarDays,
  ChartPie,
  FormInput,
  Hotel,
  Settings,
  ShieldCheck,
  Swords,
  TicketCheck,
  User,
  Users,
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
    name: "Forms",
    component: (
      <FormInput
        color={USER_DROPDOWN_ICON_COLOR}
        size={USER_DROPDOWN_ICON_SIZE}
      />
    ),
    route: "/admin/forms",
  },
];

export const adminClubItems: roleItems[] = [
  {
    name: "Members",
    component: (
      <User color={USER_DROPDOWN_ICON_COLOR} size={USER_DROPDOWN_ICON_SIZE} />
    ),
    route: "/admin/club/members",
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
  },
];

export const adminHackathonItems: roleItems[] = [
  {
    name: "Hackers",
    component: (
      <Swords color={USER_DROPDOWN_ICON_COLOR} size={USER_DROPDOWN_ICON_SIZE} />
    ),
    route: "/admin/hackathon/hackers",
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
  },
  {
    name: "Room Assignment",
    component: (
      <Hotel color={USER_DROPDOWN_ICON_COLOR} size={USER_DROPDOWN_ICON_SIZE} />
    ),
    route: "/admin/hackathon/roomAssignment",
  },
  {
    name: "Judge Assignment",
    component: (
      <Users color={USER_DROPDOWN_ICON_COLOR} size={USER_DROPDOWN_ICON_SIZE} />
    ),
    route: "/admin/hackathon/judge-assignment",
  },
];

export const checkInOnlyItems: roleItems[] = [
  {
    name: "Events",
    component: (
      <CalendarDays
        color={USER_DROPDOWN_ICON_COLOR}
        size={USER_DROPDOWN_ICON_SIZE}
      />
    ),
    route: "/admin/club/events",
  },
];

export const scannerOnlyClubItems: roleItems[] = [
  {
    name: "Check-in",
    component: (
      <TicketCheck
        color={USER_DROPDOWN_ICON_COLOR}
        size={USER_DROPDOWN_ICON_SIZE}
      />
    ),
    route: "/admin/club/check-in",
  },
];

export const scannerOnlyHackathonItems: roleItems[] = [
  {
    name: "Check-in",
    component: (
      <TicketCheck
        color={USER_DROPDOWN_ICON_COLOR}
        size={USER_DROPDOWN_ICON_SIZE}
      />
    ),
    route: "/admin/hackathon/check-in",
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
