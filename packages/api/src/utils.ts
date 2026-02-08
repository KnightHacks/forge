import type { APIGuildMember } from "discord-api-types/v10";
import type { JSONSchema7 } from "json-schema";
import { cookies } from "next/headers";
import { REST } from "@discordjs/rest";
import { TRPCError } from "@trpc/server";
import { Routes } from "discord-api-types/v10";
import { and, eq, gt, inArray } from "drizzle-orm";
import { google } from "googleapis";
import Stripe from "stripe";

import type { Session } from "@forge/auth/server";
import type { PermissionIndex, PermissionKey } from "@forge/consts";
import {
  DISCORD,
  FORM_ASSETS_BUCKET,
  FORMS,
  GOOGLE_PERSONIFY_EMAIL,
  PERMISSION_DATA,
  PERMISSIONS,
  PRESIGNED_URL_EXPIRY,
} from "@forge/consts";
import { db } from "@forge/db/client";
import { JudgeSession, Roles } from "@forge/db/schemas/auth";
import { client } from "@forge/email";

import { env } from "./env";
import { minioClient } from "./minio/minio-client";

export const discord = new REST({ version: "10" }).setToken(
  env.DISCORD_BOT_TOKEN,
);

/**
 * Adds a role to a member of the KnightHacks Discord guild.
 *
 * @param discordUserId - The Discord user ID of the member to modify
 * @param roleId - The Discord role ID to add to the member
 */
export async function addRoleToMember(discordUserId: string, roleId: string) {
  await discord.put(
    Routes.guildMemberRole(DISCORD.KNIGHTHACKS_GUILD, discordUserId, roleId),
  );
}

/**
 * Removes a role from a member in the KnightHacks Discord guild.
 *
 * @param discordUserId - The Discord user ID of the member to update.
 * @param roleId - The ID of the role to remove.
 */
export async function removeRoleFromMember(
  discordUserId: string,
  roleId: string,
) {
  await discord.delete(
    Routes.guildMemberRole(DISCORD.KNIGHTHACKS_GUILD, discordUserId, roleId),
  );
}

/**
 * Finds a Discord user ID in the KnightHacks guild matching the provided username query.
 *
 * @param username - The username or search query to match against guild members
 * @returns The Discord user ID of the first matched member as a `string`, or `null` if no match is found
 */
export async function resolveDiscordUserId(
  username: string,
): Promise<string | null> {
  const q = username.trim().toLowerCase();
  const members = (await discord.get(
    `${Routes.guildMembersSearch(DISCORD.KNIGHTHACKS_GUILD)}?query=${encodeURIComponent(q)}&limit=1`,
  )) as APIGuildMember[];
  return members[0]?.user.id ?? null;
}

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, { typescript: true });

export const isDiscordAdmin = async (user: Session["user"]) => {
  try {
    const guildMember = (await discord.get(
      Routes.guildMember(DISCORD.KNIGHTHACKS_GUILD, user.discordUserId),
    )) as APIGuildMember;
    return guildMember.roles.includes(DISCORD.ADMIN_ROLE);
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

export const parsePermissions = async (discordUserId: string) => {
  const guildMember = (await discord.get(
    Routes.guildMember(DISCORD.KNIGHTHACKS_GUILD, discordUserId),
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
      if (!role.permissions) continue;

      for (
        let i = 0;
        i < role.permissions.length && i < permissionsLength;
        ++i
      ) {
        if (role.permissions[i] === "1") {
          permissionsBits[i] = true;
        }
      }
    }
  }

  // creates the map of permissions to their boolean values
  const permissionsMap = Object.keys(PERMISSIONS).reduce(
    (accumulator, key) => {
      const index = PERMISSIONS[key];
      if (index === undefined) return accumulator;

      accumulator[key] = permissionsBits[index] ?? false;

      return accumulator;
    },
    {} as Record<PermissionKey, boolean>,
  );

  return permissionsMap;
};

// Mock tRPC context for type-safety
interface Context {
  session: {
    permissions: Record<PermissionKey, boolean>;
  };
}

export const controlPerms = {
  // Returns true if the user has any required permission OR has isOfficer role
  or: (perms: PermissionKey[], ctx: Context) => {
    // first check if user has IS_OFFICER
    if (ctx.session.permissions.IS_OFFICER) return true;

    let flag = false;
    for (const p of perms) if (ctx.session.permissions[p]) flag = true;
    if (!flag) throw new TRPCError({ code: "UNAUTHORIZED" });
    return true;
  },

  // Returns true only if the user has ALL required permissions
  and: (perms: PermissionKey[], ctx: Context) => {
    // first check if user has IS_OFFICER
    if (ctx.session.permissions.IS_OFFICER) return true;

    for (const p of perms)
      if (!ctx.session.permissions[p])
        throw new TRPCError({ code: "UNAUTHORIZED" });

    return true;
  },
};

export const isDiscordMember = async (user: Session["user"]) => {
  try {
    await discord.get(
      Routes.guildMember(DISCORD.KNIGHTHACKS_GUILD, user.discordUserId),
    );
    return true;
  } catch {
    return false;
  }
};

/**
 * Check whether a Discord user has the VIP role in the KnightHacks guild.
 *
 * @param discordUserId - The Discord user ID to check
 * @returns `true` if the user has the VIP role in the KnightHacks guild, `false` otherwise.
 */
export async function isDiscordVIP(discordUserId: string) {
  const guildMember = (await discord.get(
    Routes.guildMember(DISCORD.KNIGHTHACKS_GUILD, discordUserId),
  )) as APIGuildMember;
  return guildMember.roles.includes(DISCORD.VIP_ROLE);
}

export const sendEmail = async ({
  to,
  subject,
  template_id,
  from,
  data,
}: {
  to: string | string[];
  subject: string;
  template_id: number;
  data: Record<string, string>;
  from?: string;
}): Promise<{ success: true }> => {
  try {
    await client.tx.send({
      template_id: template_id,
      from_email: from ?? env.LISTMONK_FROM_EMAIL,
      subscriber_mode: "external",
      subscriber_emails: typeof to === "string" ? [to] : to,
      subject: subject,
      data: data,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error(
      `Failed to send email: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
};

/**
 * Posts an embedded log message to the configured Discord log channel.
 *
 * @param title - Brief title shown at the top of the embed
 * @param message - Main body text of the embed
 * @param color - Visual color of the embed; one of `"tk_blue"`, `"blade_purple"`, `"uhoh_red"`, or `"success_green"`
 * @param userId - Discord user ID to mention in the embed
 */
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
  await discord.post(Routes.channelMessages(DISCORD.LOG_CHANNEL), {
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

const GOOGLE_PRIVATE_KEY = Buffer.from(env.GOOGLE_PRIVATE_KEY_B64, "base64")
  .toString("utf-8")
  .replace(/\\n/g, "\n");

const gapiCalendar = "https://www.googleapis.com/auth/calendar";
const gapiGmailSend = "https://www.googleapis.com/auth/gmail.send";
const gapiGmailSettingsSharing =
  "https://www.googleapis.com/auth/gmail.settings.sharing";

const auth = new google.auth.JWT(
  env.GOOGLE_CLIENT_EMAIL,
  undefined,
  GOOGLE_PRIVATE_KEY,
  [gapiCalendar, gapiGmailSend, gapiGmailSettingsSharing],
  GOOGLE_PERSONIFY_EMAIL as string,
);

export const gmail = google.gmail({
  version: "v1",
  auth: auth,
});

export const calendar = google.calendar({
  version: "v3",
  auth: auth,
});

type OptionalSchema =
  | { success: true; schema: JSONSchema7 }
  | { success: false; msg: string };

/**
 * Builds a JSON Schema7 validator fragment for a form field from validator options.
 *
 * Produces a JSON Schema7 object that enforces the field's type, formats, allowed options,
 * and min/max constraints. When `optionsConst` is provided it is used to resolve dropdown/choice
 * options; otherwise `options` is used. Validation for required selections is applied when `optional`
 * is false.
 *
 * @param optional - Whether the field is optional (omitting required constraints when true)
 * @param type - The form field type to generate schema for (e.g., SHORT_ANSWER, CHECKBOXES)
 * @param options - Explicit option values for choice/dropdown/checkbox fields
 * @param optionsConst - A constant reference to resolve option values instead of `options`
 * @param min - Minimum constraint: minLength for strings, minItems for arrays, minimum for numbers
 * @param max - Maximum constraint: maxLength for strings, maxItems for arrays, maximum for numbers
 * @param allowOther - When true, permits values outside the declared options for choice fields
 * @returns `success: true` with `{ schema }` containing the JSONSchema7 fragment on success; `success: false` with `msg` when validator options are invalid (e.g., missing options for choice fields)
 */
function createJsonSchemaValidator({
  optional,
  type,
  options,
  optionsConst,
  min,
  max,
  allowOther,
}: FORMS.ValidatorOptions): OptionalSchema {
  const schema: JSONSchema7 = {};

  const resolvedOptions = optionsConst
    ? [...FORMS.getDropdownOptionsFromConst(optionsConst)]
    : options;

  switch (type) {
    case "SHORT_ANSWER":
    case "PARAGRAPH":
      schema.type = "string";
      if (max === undefined) {
        schema.maxLength = type === "SHORT_ANSWER" ? 150 : 750;
      }
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
      if (!resolvedOptions?.length)
        return {
          success: false,
          msg: "Options are required for multiple choice / dropdown",
        };
      schema.type = "string";
      if (!allowOther) {
        schema.enum = resolvedOptions;
      }
      break;
    case "CHECKBOXES":
      if (!resolvedOptions?.length)
        return { success: false, msg: "Options required for checkboxes" };
      schema.type = "array";
      if (allowOther) {
        schema.items = { type: "string" };
      } else {
        schema.items = { type: "string", enum: resolvedOptions };
      }
      break;
    case "FILE_UPLOAD":
      schema.type = "string";
      break;
    case "BOOLEAN":
      schema.type = "boolean";
      break;
    case "LINK":
      schema.type = "string";
      schema.format = "uri";
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
    if (schema.type === "string") {
      // Explicit max value overrides any defaults
      schema.maxLength = max;
    }
    if (schema.type === "array") schema.maxItems = max;
    if (schema.type === "number") schema.maximum = max;
  }

  return { success: true, schema };
}

/**
 * Builds a JSON Schema (Draft-07) that validates responses for the given form.
 *
 * @param form - The form definition containing an ordered list of questions and validators
 * @returns An object with `success: true` and the generated JSON Schema under `schema` when all questions validate;
 *          otherwise returns the first validation error produced by a question validator (an object with `success: false` and `msg`).
 */
export function generateJsonSchema(form: FORMS.FormType): OptionalSchema {
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

/**
 * Regenerates presigned image and video URLs for each form instruction that references stored media.
 *
 * For each instruction with an `imageObjectName` or `videoObjectName`, attempts to replace `imageUrl`/`videoUrl`
 * with a newly generated presigned URL. If generating a URL fails for an item, the original URL (if any) is left unchanged
 * and processing continues for other items.
 *
 * @param instructions - The form's instructions array to process
 * @returns The updated instructions array with regenerated `imageUrl` and `videoUrl` where applicable
 */
export async function regenerateMediaUrls(
  instructions: FORMS.FormType["instructions"],
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

export function getPermsAsList(perms: string) {
  const list = [];
  const permKeys = Object.keys(PERMISSIONS);
  for (let i = 0; i < perms.length; i++) {
    const permKey = permKeys.at(i);
    if (perms[i] == "1" && permKey) {
      const permissionData = PERMISSION_DATA[permKey];
      if (permissionData) list.push(permissionData.name);
    }
  }
  return list;
}