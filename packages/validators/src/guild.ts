import { z } from "zod";

import { FORMS, GUILD } from "@forge/consts";

export const guildOpportunityStatusSchema = z.enum(
  GUILD.GUILD_OPPORTUNITY_STATUS_OPTIONS,
);

function uniqueOpportunityStatuses(maximum: number) {
  return z
    .array(guildOpportunityStatusSchema)
    .max(maximum, `Choose up to ${maximum} opportunity statuses.`)
    .refine((statuses) => new Set(statuses).size === statuses.length, {
      message: "Choose each opportunity status only once.",
    });
}

export const guildOpportunityStatusesSchema = uniqueOpportunityStatuses(
  GUILD.GUILD_MAX_OPPORTUNITY_STATUSES,
);

export const guildMemberStatusSchema = z.enum(GUILD.GUILD_TAG_OPTIONS);

export const guildRoleCalloutSchema = z.object({
  label: z.string().trim().min(1).max(80),
  category: z.enum(["officer", "director", "team"]),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .nullable(),
});

export const guildPublicEmploymentSchema = z.object({
  city: z
    .object({
      key: z.string(),
      label: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      name: z.string(),
      state: z.string(),
    })
    .nullable(),
  company: z.object({
    displayName: z.string(),
    id: z.string().uuid(),
  }),
  endMonth: z.string().nullable(),
  experienceType: z.string().nullable(),
  id: z.string().uuid(),
  startMonth: z.string().nullable(),
  state: z.enum(["current", "past", "unknown"]),
  title: z.string().nullable(),
});

export const guildProfileSchema = z
  .object({
    id: z.string().uuid(),
    firstName: z.string(),
    lastName: z.string(),
    tagline: z.string().nullable(),
    about: z.string().nullable(),
    profilePictureUrl: z.string().url().nullable(),
    school: z.string(),
    major: z.string(),
    gradDate: z.string(),
    memberSinceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    company: z.string().nullable(),
    githubProfileUrl: z.string().url().nullable(),
    linkedinProfileUrl: z.string().url().nullable(),
    websiteUrl: z.string().url().nullable(),
    resumeAvailable: z.boolean(),
    opportunityStatuses: guildOpportunityStatusesSchema,
    memberStatus: guildMemberStatusSchema,
    roleCallout: guildRoleCalloutSchema.nullable(),
    employmentHistory: z.array(guildPublicEmploymentSchema).default([]),
  })
  .strict();

export const guildListProfilesInputSchema = z.object({
  seed: z.string().uuid(),
  cursor: z.string().max(1024).optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(GUILD.GUILD_MAX_PAGE_SIZE)
    .default(GUILD.GUILD_DEFAULT_PAGE_SIZE),
  query: z.string().trim().max(80).optional(),
  memberStatuses: z.array(guildMemberStatusSchema).max(2).default([]),
  graduationYears: z
    .array(z.number().int().min(1900).max(2100))
    .max(25)
    .default([]),
  memberSinceYears: z
    .array(z.number().int().min(1900).max(2100))
    .max(50)
    .default([]),
  schools: z.array(z.enum(FORMS.SCHOOLS)).max(25).default([]),
  majors: z.array(z.enum(FORMS.MAJORS)).max(25).default([]),
  resumeAvailable: z.boolean().optional(),
  teamMembersOnly: z.boolean().default(false),
  opportunityStatuses: uniqueOpportunityStatuses(
    GUILD.GUILD_OPPORTUNITY_STATUS_OPTIONS.length,
  ).default([]),
});

export const guildProfileInputSchema = z.object({
  memberId: z.string().uuid(),
});

export const guildResumeUrlInputSchema = guildProfileInputSchema.extend({
  disposition: z.enum(["inline", "attachment"]).default("inline"),
});

export const guildFilterOptionsSchema = z.object({
  graduationYears: z.array(z.number().int()),
  memberSinceYears: z.array(z.number().int()),
  schools: z.array(z.enum(FORMS.SCHOOLS)),
  majors: z.array(z.enum(FORMS.MAJORS)),
});

export const updateGuildPreferencesSchema = z
  .object({
    guildProfileVisible: z.boolean().optional(),
    guildResumeVisible: z.boolean().optional(),
    guildOpportunityStatuses: guildOpportunityStatusesSchema.optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.guildProfileVisible !== undefined ||
      input.guildResumeVisible !== undefined ||
      input.guildOpportunityStatuses !== undefined,
    {
      message: "Choose at least one Guild preference to update.",
    },
  );

export type GuildProfile = z.infer<typeof guildProfileSchema>;
export type GuildListProfilesInput = z.infer<
  typeof guildListProfilesInputSchema
>;
export type UpdateGuildPreferencesInput = z.infer<
  typeof updateGuildPreferencesSchema
>;
