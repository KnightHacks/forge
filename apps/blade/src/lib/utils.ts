import type { AnyTRPCProcedure, AnyTRPCRouter } from "@trpc/server";
import type { z } from "zod";

import type { HackerClass } from "@forge/db/schemas/knight-hacks";
import { type EventTagsColor } from "@forge/consts/knight-hacks";

export const formatDateTime = (date: Date) => {
  // Create a new Date object 5 hours behind the original
  const adjustedDate = new Date(date.getTime());
  adjustedDate.setDate(adjustedDate.getDate() + 1);

  return adjustedDate.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const getFormattedDate = (start_datetime: string | Date) => {
  const date = new Date(start_datetime);
  date.setDate(date.getDate() + 1);
  return date.toLocaleDateString();
};

export const formatDateRange = (startDate: Date, endDate: Date) => {
  const start = new Date(startDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const end = new Date(endDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${start} - ${end}`;
};

export const getTagColor = (tag: EventTagsColor) => {
  const colors: Record<EventTagsColor, string> = {
    GBM: "bg-blue-100 text-blue-800",
    Social: "bg-pink-100 text-pink-800",
    Kickstart: "bg-green-100 text-green-800",
    "Project Launch": "bg-purple-100 text-purple-800",
    "Hello World": "bg-yellow-100 text-yellow-800",
    Sponsorship: "bg-orange-100 text-orange-800",
    "Tech Exploration": "bg-cyan-100 text-cyan-800",
    "Class Support": "bg-indigo-100 text-indigo-800",
    Workshop: "bg-teal-100 text-teal-800",
    OPS: "bg-purple-100 text-purple-800",
    Hackathon: "bg-violet-100 text-violet-800",
    Collabs: "bg-red-100 text-red-800",
    "Check-in": "bg-gray-100 text-gray-800",
    Ceremony: "bg-amber-100 text-amber-800",
    Merch: "bg-lime-100 text-lime-800",
    Food: "bg-rose-100 text-rose-800",
    "CAREER-FAIR": "bg-lime-100 text-lime-800", // change later
    "RSO-FAIR": "bg-lime-100 text-lime-800", // change later
  };
  return colors[tag];
};

export const getClassTeam = (tag: HackerClass) => {
  if (["Harbinger", "Alchemist", "Monstologist"].includes(tag)) {
    return {
      team: "Monstrosity",
      teamColor: "#e03131",
      imgUrl: "/khviii/lenneth.jpg",
    };
  }
  return {
    team: "Humanity",
    teamColor: "#228be6",
    imgUrl: "/khviii/tkhero.jpg",
  };
};

export interface ProcedureMeta {
  inputSchema: string[];
  route: string;
}

interface ProcedureMetaOriginal {
  id: string;
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  inputSchema: z.ZodObject<any>;
}

function hasSchemaMeta(meta: unknown): meta is ProcedureMetaOriginal {
  return (
    typeof meta === "object" &&
    meta !== null &&
    "id" in meta &&
    "inputSchema" in meta
  );
}

export function extractProcedures(router: AnyTRPCRouter) {
  const procedures: Record<string, ProcedureMeta> = {};

  /* eslint-disable  @typescript-eslint/no-unsafe-argument */
  for (const [procKey, proc] of Object.entries(router._def.procedures)) {
    const procTyped = proc as AnyTRPCProcedure;

    const meta = procTyped._def.meta;
    if (!hasSchemaMeta(meta)) continue;

    procedures[meta.id] = {
      inputSchema: Object.keys(meta.inputSchema.shape),
      route: procKey,
    };
  }

  return procedures;
}

export const PERMISSIONS = {
  IS_OFFICER: 0,
  IS_JUDGE: 1,
  READ_MEMBERS: 2,
  EDIT_MEMBERS: 3,
  READ_HACKERS: 4,
  EDIT_HACKERS: 5,
  READ_CLUB_DATA: 6,
  READ_HACK_DATA: 7,
  READ_CLUB_EVENT: 8,
  EDIT_CLUB_EVENT: 9,
  CHECKIN_CLUB_EVENT: 10,
  READ_HACK_EVENT: 11,
  EDIT_HACK_EVENT: 12,
  CHECKIN_HACK_EVENT: 13,
  EMAIL_PORTAL: 14,
  READ_FORMS: 15,
  READ_FORM_RESPONSES: 16,
  EDIT_FORMS: 17,
} as const;

export const PERMISSION_DATA = {
  IS_OFFICER: {
    name: "Is Officer",
    desc: "Grants access to sensitive club officer pages.",
  },
  IS_JUDGE: {
    name: "Is Judge",
    desc: "Grants access to the judging system.",
  },
  READ_MEMBERS: {
    name: "Read Members",
    desc: "Grants access to the list of club members.",
  },
  EDIT_MEMBERS: {
    name: "Edit Members",
    desc: "Allows editing member data, including deletion.",
  },
  READ_HACKERS: {
    name: "Read Hackers",
    desc: "Grants access to the list of hackers, and their hackathons.",
  },
  EDIT_HACKERS: {
    name: "Edit Hackers",
    desc: "Allows editing hacker data, including approval, rejection, deletion, etc.",
  },
  READ_CLUB_DATA: {
    name: "Read Club Data",
    desc: "Grants access to club statistics, such as demographics.",
  },
  READ_HACK_DATA: {
    name: "Read Hackathon Data",
    desc: "Grants access to hackathon statistics, such as demographics.",
  },
  READ_CLUB_EVENT: {
    name: "Read Club Events",
    desc: "Grants access to club event data, such as attendance.",
  },
  EDIT_CLUB_EVENT: {
    name: "Edit Club Events",
    desc: "Allows creating, editing, or deleting club events.",
  },
  CHECKIN_CLUB_EVENT: {
    name: "Club Event Check-in",
    desc: "Allows the user to check members into club events.",
  },
  READ_HACK_EVENT: {
    name: "Read Club Events",
    desc: "Grants access to hackathon event data, such as attendance.",
  },
  EDIT_HACK_EVENT: {
    name: "Edit Club Events",
    desc: "Allows creating, editing, or deleting hackathon events.",
  },
  CHECKIN_HACK_EVENT: {
    name: "Club Event Check-in",
    desc: "Allows the user to check hackers into hackathon events, including the primary check-in.",
  },
  EMAIL_PORTAL: {
    name: "Email Portal",
    desc: "Grants access to the email queue portal.",
  },
  READ_FORMS: {
    name: "Read Forms",
    desc: "Grants access to created forms, but not their responses.",
  },
  READ_FORM_RESPONSES: {
    name: "Read Form Responses",
    desc: "Grants access to form responses.",
  },
  EDIT_FORMS: {
    name: "Edit Forms",
    desc: "Allows creating, editing, or deleting forms.",
  },
} as const;

type PermissionKey = keyof typeof PERMISSIONS;
export function getPermsAsList(perms: string) {
  const list = [];
  const permKeys = Object.keys(PERMISSIONS) as PermissionKey[];
  for (let i = 0; i < perms.length; i++) {
    const permKey = permKeys.at(i);
    if (perms[i] == "1" && permKey) list.push(PERMISSION_DATA[permKey].name);
  }

  return list;
}
