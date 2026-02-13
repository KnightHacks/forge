export interface PermissionDataObj {
  idx: number;
  name: string;
  desc: string;
}

export const PERMISSION_DATA: Record<string, PermissionDataObj> = {
  IS_OFFICER: {
    idx: 0,
    name: "Is Officer",
    desc: "Grants access to sensitive club officer pages.",
  },
  IS_JUDGE: {
    idx: 1,
    name: "Is Judge",
    desc: "Grants access to the judging system.",
  },
  READ_MEMBERS: {
    idx: 2,
    name: "Read Members",
    desc: "Grants access to the list of club members.",
  },
  EDIT_MEMBERS: {
    idx: 3,
    name: "Edit Members",
    desc: "Allows editing member data, including deletion.",
  },
  READ_HACKERS: {
    idx: 4,
    name: "Read Hackers",
    desc: "Grants access to the list of hackers, and their hackathons.",
  },
  EDIT_HACKERS: {
    idx: 5,
    name: "Edit Hackers",
    desc: "Allows editing hacker data, including approval, rejection, deletion, etc.",
  },
  READ_CLUB_DATA: {
    idx: 6,
    name: "Read Club Data",
    desc: "Grants access to club statistics, such as demographics.",
  },
  READ_HACK_DATA: {
    idx: 7,
    name: "Read Hackathon Data",
    desc: "Grants access to hackathon statistics, such as demographics.",
  },
  READ_CLUB_EVENT: {
    idx: 8,
    name: "Read Club Events",
    desc: "Grants access to club event data, such as attendance.",
  },
  EDIT_CLUB_EVENT: {
    idx: 9,
    name: "Edit Club Events",
    desc: "Allows creating, editing, or deleting club events.",
  },
  CHECKIN_CLUB_EVENT: {
    idx: 10,
    name: "Club Event Check-in",
    desc: "Allows the user to check members into club events.",
  },
  READ_HACK_EVENT: {
    idx: 11,
    name: "Read Hackathon Events",
    desc: "Grants access to hackathon event data, such as attendance.",
  },
  EDIT_HACK_EVENT: {
    idx: 12,
    name: "Edit Hackathon Events",
    desc: "Allows creating, editing, or deleting hackathon events.",
  },
  CHECKIN_HACK_EVENT: {
    idx: 13,
    name: "Hackathon Event Check-in",
    desc: "Allows the user to check hackers into hackathon events, including the primary check-in.",
  },
  EMAIL_PORTAL: {
    idx: 14,
    name: "Email Portal",
    desc: "Grants access to the email queue portal.",
  },
  READ_FORMS: {
    idx: 15,
    name: "Read Forms",
    desc: "Grants access to created forms, but not their responses.",
  },
  READ_FORM_RESPONSES: {
    idx: 16,
    name: "Read Form Responses",
    desc: "Grants access to form responses.",
  },
  EDIT_FORMS: {
    idx: 17,
    name: "Edit Forms",
    desc: "Allows creating, editing, or deleting forms.",
  },
  ASSIGN_ROLES: {
    idx: 18,
    name: "Assign Roles",
    desc: "Allows assigning or removing roles to Blade users.",
  },
  CONFIGURE_ROLES: {
    idx: 19,
    name: "Configure Roles",
    desc: "Allows creating, editing, or deleting roles.",
  },
} as const satisfies Record<string, PermissionDataObj>;

export const PERMISSIONS = Object.fromEntries(
  Object.entries(PERMISSION_DATA).map(([key, value]) => [key, value.idx]),
) as {
  [K in keyof typeof PERMISSION_DATA]: (typeof PERMISSION_DATA)[K]["idx"];
};

export type PermissionKey = keyof typeof PERMISSION_DATA;
export type PermissionIndex = (typeof PERMISSION_DATA)[PermissionKey]["idx"];
