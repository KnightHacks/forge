import type { APIGuildMember } from "discord-api-types/v10";
import type { JSONSchema7 } from "json-schema";
import { cookies } from "next/headers";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { and, eq, gt, inArray } from "drizzle-orm";
import { Resend } from "resend";
import Stripe from "stripe";

import type { Session } from "@forge/auth/server";
import type {
  FormType,
  PermissionIndex,
  ValidatorOptions,
} from "@forge/consts/knight-hacks";
import {
  DEV_DISCORD_ADMIN_ROLE_ID,
  DEV_KNIGHTHACKS_GUILD_ID,
  DEV_KNIGHTHACKS_LOG_CHANNEL,
  FORM_ASSETS_BUCKET,
  IS_PROD,
  OFFICER_ROLE_ID,
  PRESIGNED_URL_EXPIRY,
  PROD_DISCORD_ADMIN_ROLE_ID,
  PROD_KNIGHTHACKS_GUILD_ID,
  PROD_KNIGHTHACKS_LOG_CHANNEL,
  ROLE_PERMISSIONS,
} from "@forge/consts/knight-hacks";
import { db } from "@forge/db/client";
import { JudgeSession } from "@forge/db/schemas/auth";

import { env } from "./env";
import { minioClient } from "./minio/minio-client";
import { TRPCError } from "@trpc/server";
import { Roles } from "@forge/db/schemas/knight-hacks";

const DISCORD_ADMIN_ROLE_ID = IS_PROD
  ? (PROD_DISCORD_ADMIN_ROLE_ID as string)
  : (DEV_DISCORD_ADMIN_ROLE_ID as string);

export const KNIGHTHACKS_GUILD_ID = IS_PROD
  ? (PROD_KNIGHTHACKS_GUILD_ID as string)
  : (DEV_KNIGHTHACKS_GUILD_ID as string);

const PROD_VIP_ID = "1423358570203844689";
const DEV_VIP_ID = "1423366084874080327";
const VIP_ID = IS_PROD ? (PROD_VIP_ID as string) : (DEV_VIP_ID as string);
export const discord = new REST({ version: "10" }).setToken(
  env.DISCORD_BOT_TOKEN,
);
const GUILD_ID = IS_PROD ? PROD_KNIGHTHACKS_GUILD_ID : DEV_KNIGHTHACKS_GUILD_ID;

export async function addRoleToMember(discordUserId: string, roleId: string) {
  await discord.put(Routes.guildMemberRole(GUILD_ID, discordUserId, roleId), {
    body: {},
  });
}

export async function removeRoleFromMember(
  discordUserId: string,
  roleId: string,
) {
  await discord.delete(Routes.guildMemberRole(GUILD_ID, discordUserId, roleId));
}

export async function resolveDiscordUserId(
  username: string,
): Promise<string | null> {
  const q = username.trim().toLowerCase();
  const members = (await discord.get(
    `${Routes.guildMembersSearch(GUILD_ID)}?query=${encodeURIComponent(q)}&limit=1`,
  )) as APIGuildMember[];
  return members[0]?.user.id ?? null;
}

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, { typescript: true });

// Initialize Resend
export const resend = new Resend(env.RESEND_API_KEY);

export const isDiscordAdmin = async (user: Session["user"]) => {
  try {
    const guildMember = (await discord.get(
      Routes.guildMember(KNIGHTHACKS_GUILD_ID, user.discordUserId),
    )) as APIGuildMember;
    return guildMember.roles.includes(DISCORD_ADMIN_ROLE_ID);
  } catch (err) {
    console.error("Error: ", err);
    return false;
  }
};

export const userIsOfficer = async (user: Session["user"]) => {
  try {
    const guildMember = (await discord.get(
      Routes.guildMember(KNIGHTHACKS_GUILD_ID, user.discordUserId),
    )) as APIGuildMember;
    return guildMember.roles.includes(OFFICER_ROLE_ID);
  } catch (err) {
    console.error("Error: ", err);
    return false;
  }
};

export const hasPermission = (
  userPermissions: string,
  permission: PermissionIndex,
): boolean => {
  const permissionBit = userPermissions[permission];
  return permissionBit === "1";
};

export const getUserPermissions = async (
  user: Session["user"],
): Promise<string> => {
  try {
    const guildMember = (await discord.get(
      Routes.guildMember(KNIGHTHACKS_GUILD_ID, user.discordUserId),
    )) as APIGuildMember;

    const userPermissionArray = new Array(Object.keys(PERMISSIONS).length).fill(
      "0",
    );

    for (const roleId of guildMember.roles) {
      if (roleId in ROLE_PERMISSIONS) {
        const permissionIndex = ROLE_PERMISSIONS[roleId];
        if (permissionIndex !== undefined) {
          userPermissionArray[permissionIndex] = "1";
        }
      }
    }

    return userPermissionArray.join("");
  } catch (err) {
    console.error("Error getting user permissions: ", err);
    return "0".repeat(Object.keys(PERMISSIONS).length);
  }
};


export const parsePermissions = async (discordUserId: string) => {
    const guildMember = (await discord.get(
      Routes.guildMember(KNIGHTHACKS_GUILD_ID, discordUserId),
    )) as APIGuildMember;

    const permissionsLength = Object.keys(PERMISSIONS).length;

    // array of booleans. the boolean value at the index indicates if the user has that permission.
    // true means the user has the permission, false means the user doesn't have the permission.
    const permissionsBits = new Array(permissionsLength).fill(false) as boolean[];

    if (guildMember.roles.length > 0) {
      // get only roles the user has
      const userDbRoles = await db
        .select()
        .from(Roles)
        .where(inArray(Roles.discordRoleId, guildMember.roles));

      for (const role of userDbRoles) {
        if (role.permissions === null) continue;

        for (let i = 0; i < role.permissions.length && i < permissionsLength; ++i) {
          if (role.permissions[i] === "1") {
            permissionsBits[i] = true;
          }
        }
      }
    }

    // creates the map of permissions to their boolean values
    const permissionsMap = Object.keys(PERMISSIONS).reduce((accumulator, key) => {  
      const index = PERMISSIONS[key as PermissionKey];

      accumulator[key as PermissionKey] = permissionsBits[index] ?? false;

      return accumulator;
    }, {} as Record<PermissionKey, boolean>);

    return permissionsMap;
  }

export const controlPerms = async (perms: PermissionKey[], discordUserId: string) => {
  const userPerms = await parsePermissions(discordUserId)

  perms.forEach((v) => {
    if(!userPerms[v]) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
  })

  return true
}


export const userHasPermission = async (
  user: Session["user"],
  permission: PermissionIndex,
): Promise<boolean> => {
  const userPermissions = await getUserPermissions(user);

  if (hasPermission(userPermissions, PERMISSIONS.IS_OFFICER)) {
    return true;
  }

  return hasPermission(userPermissions, permission);
};

export const userHasFullAdmin = async (
  user: Session["user"],
): Promise<boolean> => {
  return userHasPermission(user, PERMISSIONS.IS_OFFICER);
};

export const userHasCheckIn = async (
  user: Session["user"],
): Promise<boolean> => {
  return userHasPermission(user, PERMISSIONS.CHECK_IN);
};

export const isDiscordMember = async (user: Session["user"]) => {
  try {
    await discord.get(
      Routes.guildMember(KNIGHTHACKS_GUILD_ID, user.discordUserId),
    );
    return true;
  } catch {
    return false;
  }
};

export async function isDiscordVIP(discordUserId: string) {
  const guildMember = (await discord.get(
    Routes.guildMember(GUILD_ID, discordUserId),
  )) as APIGuildMember;
  return guildMember.roles.includes(VIP_ID);
}

// Email sending utility function using Resend
export const sendEmail = async ({
  to,
  subject,
  html,
  from,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<{ success: true; messageId: string }> => {
  try {
    const { data, error } = await resend.emails.send({
      from: from ?? env.RESEND_FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    if (!data) {
      throw new Error("Failed to send email: No data returned from Resend");
    }

    return { success: true, messageId: data.id };
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error(
      `Failed to send email: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
};

const KNIGHTHACKS_LOG_CHANNEL =
  env.NODE_ENV === "production"
    ? (PROD_KNIGHTHACKS_LOG_CHANNEL as string)
    : (DEV_KNIGHTHACKS_LOG_CHANNEL as string);

export async function log({
  title,
  message,
  color,
  userId,
}: {
  title: string;
  message: string;
  color: "tk_blue" | "blade_purple" | "uhoh_red" | "success_green";
  userId: string;
}) {
  await discord.post(Routes.channelMessages(KNIGHTHACKS_LOG_CHANNEL), {
    body: {
      embeds: [
        {
          title: title,
          description: message + `\n\nUser: <@${userId}>`.toString(),
          color: {
            tk_blue: 0x1a73e8,
            blade_purple: 0xcca4f4,
            uhoh_red: 0xff0000,
            success_green: 0x00ff00,
          }[color],
          footer: {
            text: new Date().toLocaleString(),
          },
        },
      ],
    },
  });
}

export const isJudgeAdmin = async () => {
  try {
    const token = cookies().get("sessionToken")?.value;
    if (!token) return false;

    const now = new Date();
    const rows = await db
      .select({ sessionToken: JudgeSession.sessionToken })
      .from(JudgeSession)
      .where(
        and(
          eq(JudgeSession.sessionToken, token),
          gt(JudgeSession.expires, now),
        ),
      )
      .limit(1);

    return rows.length > 0;
  } catch (err) {
    console.error("isJudgeAdmin DB check error:", err);
    return false;
  }
};

export const getJudgeSessionFromCookie = async () => {
  const token = cookies().get("sessionToken")?.value;
  if (!token) return null;

  const now = new Date();
  const rows = await db
    .select({
      sessionToken: JudgeSession.sessionToken,
      roomName: JudgeSession.roomName,
      expires: JudgeSession.expires,
    })
    .from(JudgeSession)
    .where(
      and(eq(JudgeSession.sessionToken, token), gt(JudgeSession.expires, now)),
    )
    .limit(1);

  return rows[0] ?? null;
};

interface CalendarStub {
  events: {
    insert: (params: unknown) => Promise<{ data: { id: string } }>;
    update: (params: unknown) => Promise<{ data: { id: string } }>;
    delete: (params: unknown) => Promise<Record<string, never>>;
  };
}

export const calendar: CalendarStub = {
  events: {
    insert: (_params: unknown) => {
      console.warn("Google Calendar integration not implemented - stub called");
      return Promise.resolve({ data: { id: "stub-event-id" } });
    },
    update: (_params: unknown) => {
      console.warn("Google Calendar integration not implemented - stub called");
      return Promise.resolve({ data: { id: "stub-event-id" } });
    },
    delete: (_params: unknown) => {
      console.warn("Google Calendar integration not implemented - stub called");
      return Promise.resolve({});
    },
  },
};

type OptionalSchema =
  | { success: true; schema: JSONSchema7 }
  | { success: false; msg: string };

function createJsonSchemaValidator({
  optional,
  type,
  options,
  min,
  max,
}: ValidatorOptions): OptionalSchema {
  const schema: JSONSchema7 = {};

  switch (type) {
    case "SHORT_ANSWER":
    case "PARAGRAPH":
      schema.type = "string";
      break;
    case "EMAIL":
      schema.type = "string";
      schema.format = "email";
      break;
    case "PHONE":
      schema.type = "string";
      schema.pattern = "^\\+?\\d{7,15}$";
      break;
    case "DATE":
      schema.type = "string";
      schema.format = "date";
      break;
    case "TIME":
      schema.type = "string";
      schema.pattern = "^([01]\\d|2[0-3]):([0-5]\\d)$";
      break;
    case "NUMBER":
    case "LINEAR_SCALE":
      schema.type = "number";
      break;
    case "MULTIPLE_CHOICE":
    case "DROPDOWN":
      if (!options?.length)
        return {
          success: false,
          msg: "Options are required for multiple choice / dropdown",
        };
      schema.type = "string";
      schema.enum = options;
      break;
    case "CHECKBOXES":
      if (!options?.length)
        return { success: false, msg: "Options required for checkboxes" };
      schema.type = "array";
      schema.items = { type: "string", enum: options };
      break;
    default:
      schema.type = "string";
  }

  if (min !== undefined) {
    if (schema.type === "string") schema.minLength = min;
    if (schema.type === "array") schema.minItems = min;
    if (schema.type === "number") schema.minimum = min;
  } else {
    if (schema.type === "array" && !optional) schema.minItems = 1;
  }

  if (max !== undefined) {
    if (schema.type === "string") schema.maxLength = max;
    if (schema.type === "array") schema.maxItems = max;
    if (schema.type === "number") schema.maximum = max;
  }

  return { success: true, schema };
}

export function generateJsonSchema(form: FormType): OptionalSchema {
  const schema: JSONSchema7 = {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  };

  const properties: Record<string, JSONSchema7> = {};
  const required: string[] = [];

  for (const formQuestion of form.questions) {
    const { question, optional, ...rest } = formQuestion;
    const convert = createJsonSchemaValidator({ optional, ...rest });
    if (convert.success) properties[question] = convert.schema;
    else return convert;

    if (!optional) {
      required.push(question);
    }
  }

  schema.properties = properties;
  if (required.length > 0) {
    schema.required = required;
  }

  return { success: true, schema };
}

// Helper to regenerate presigned URLs for media
export async function regenerateMediaUrls(
  instructions: FormType["instructions"],
) {
  if (!instructions) return [];
  const updatedQuestions = await Promise.all(
    instructions.map(async (i) => {
      const updated = { ...i };

      // Regenerate image URL if objectName exists
      if ("imageObjectName" in i && i.imageObjectName) {
        try {
          updated.imageUrl = await minioClient.presignedGetObject(
            FORM_ASSETS_BUCKET,
            i.imageObjectName,
            PRESIGNED_URL_EXPIRY,
          );
        } catch (e) {
          console.error("Failed to regenerate image URL:", e);
        }
      }

      // Regenerate video URL if objectName exists
      if ("videoObjectName" in i && i.videoObjectName) {
        try {
          updated.videoUrl = await minioClient.presignedGetObject(
            FORM_ASSETS_BUCKET,
            i.videoObjectName,
            PRESIGNED_URL_EXPIRY,
          );
        } catch (e) {
          console.error("Failed to regenerate video URL:", e);
        }
      }

      return updated;
    }),
  );

  return updatedQuestions;
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
  EDIT_FORMS: 17
} as const;

export const PERMISSION_DATA = {
    IS_OFFICER: {
        name: "Is Officer",
        desc: "Grants access to sensitive club officer pages."
    },
    IS_JUDGE: {
        name: "Is Judge",
        desc: "Grants access to the judging system."
    },
    READ_MEMBERS: {
        name: "Read Members",
        desc: "Grants access to the list of club members."
    },
    EDIT_MEMBERS: {
        name: "Edit Members",
        desc: "Allows editing member data, including deletion."
    },
    READ_HACKERS: {
        name: "Read Hackers",
        desc: "Grants access to the list of hackers, and their hackathons."
    },
    EDIT_HACKERS: {
        name: "Edit Hackers",
        desc: "Allows editing hacker data, including approval, rejection, deletion, etc."
    },
    READ_CLUB_DATA: {
        name: "Read Club Data",
        desc: "Grants access to club statistics, such as demographics."
    },
    READ_HACK_DATA: {
        name: "Read Hackathon Data",
        desc: "Grants access to hackathon statistics, such as demographics."
    },
    READ_CLUB_EVENT: {
        name: "Read Club Events",
        desc: "Grants access to club event data, such as attendance."
    },
    EDIT_CLUB_EVENT: {
        name: "Edit Club Events",
        desc: "Allows creating, editing, or deleting club events."
    },
    CHECKIN_CLUB_EVENT: {
        name: "Club Event Check-in",
        desc: "Allows the user to check members into club events."
    },
    READ_HACK_EVENT: {
        name: "Read Club Events",
        desc: "Grants access to hackathon event data, such as attendance."
    },
    EDIT_HACK_EVENT: {
        name: "Edit Club Events",
        desc: "Allows creating, editing, or deleting hackathon events."
    },
    CHECKIN_HACK_EVENT: {
        name: "Club Event Check-in",
        desc: "Allows the user to check hackers into hackathon events, including the primary check-in."
    },
    EMAIL_PORTAL: {
        name: "Email Portal",
        desc: "Grants access to the email queue portal."
    },
    READ_FORMS: {
        name: "Read Forms",
        desc: "Grants access to created forms, but not their responses."
    },
    READ_FORM_RESPONSES: {
        name: "Read Form Responses",
        desc: "Grants access to form responses."
    },
    EDIT_FORMS: {
        name: "Edit Forms",
        desc: "Allows creating, editing, or deleting forms."
    }
} as const;

type PermissionKey = keyof typeof PERMISSIONS;
export function getPermsAsList(perms:string) {
    const list = []
    const permKeys = Object.keys(PERMISSIONS) as PermissionKey[]
    for (let i = 0; i < perms.length; i++) {
        const permKey = permKeys.at(i)
        if (perms[i] == "1" && permKey)
            list.push(PERMISSION_DATA[permKey].name)
    }

    return list
}