export const SIGN_IN_PATH = "/";

export const DASHBOARD_ICON_SIZE = 15;

export const SIDEBAR_NAV_ITEMS = [
  {
    title: "Member Profile",
    href: "/settings",
  },
  {
    title: "Hacker Profile",
    href: "/settings/hacker-profile",
  },
];

export const USER_DROPDOWN_ICON_COLOR = "hsl(263.4 70% 50.4%)"; //lucide only works with HSL values
export const USER_DROPDOWN_ICON_SIZE = 20;

export const HACKER_STATUS_MAP = {
  withdrawn: { name: "Withdrawn", color: "text-[#FF6B6B]" },
  pending: { name: "Pending", color: "text-[#FFD93D]" },
  accepted: { name: "Accepted", color: "text-[#6BCB77]" },
  waitlisted: { name: "Waitlisted", color: "text-[#4D96FF]" },
  checkedin: { name: "Checked-in", color: "text-[#845EC2]" },
  confirmed: { name: "Confirmed", color: "text-[#00C9A7]" },
  denied: { name: "Denied", color: "text-[#FF5E5E]" },
};
