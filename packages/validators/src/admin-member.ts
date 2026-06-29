import { z } from "zod";

import { FORMS } from "@forge/consts";

import { memberProfileFormSchema } from "./member";

export { permissionExpressionSchema, permissionKeySchema } from "./permissions";
export type { PermissionExpression } from "./permissions";

const strictDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Enter a valid date.");

const adminMemberSchoolSchema = z
  .string()
  .trim()
  .refine(
    (value) => (FORMS.SCHOOLS as readonly string[]).includes(value),
    "Choose a valid school.",
  );

export const adminMemberPageSizes = [25, 50, 100, 250, 500] as const;
export const adminMemberSortFields = ["joined", "name", "discord"] as const;
export const ADMIN_MEMBER_DELETE_CONFIRMATION = "I am absolutely sure";
export const ADMIN_MEMBER_DUES_SECOND_CONFIRMATION =
  "I am absolutely sure that I would like to invalidate all effective dues.";
export const ADMIN_MEMBER_DUES_INVALIDATION_CONFIRMATION =
  "I am aware of the consequences regarding this action if it were by mistake. I am absolutely sure that I want to invalidate all effective dues.";

export const adminMemberListSchema = z
  .object({
    page: z.number().int().positive().default(1),
    pageSize: z
      .union([
        z.literal(25),
        z.literal(50),
        z.literal(100),
        z.literal(250),
        z.literal(500),
      ])
      .default(25),
    query: z.string().trim().max(100).default(""),
    sortField: z.enum(adminMemberSortFields).default("joined"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
    duesStatuses: z.array(z.enum(["paid", "unpaid"])).default([]),
    schools: z.array(adminMemberSchoolSchema).default([]),
    majors: z.array(z.enum(FORMS.MAJORS)).default([]),
    levelsOfStudy: z.array(z.enum(FORMS.LEVELS_OF_STUDY)).default([]),
    graduationYears: z.array(z.number().int().min(1900).max(2100)).default([]),
    companies: z.array(z.string().trim().min(1).max(255)).default([]),
    guildVisibilities: z.array(z.enum(["public", "private"])).default([]),
    genders: z.array(z.enum(FORMS.GENDERS)).default([]),
    racesOrEthnicities: z.array(z.enum(FORMS.RACES_OR_ETHNICITIES)).default([]),
    joinedFrom: strictDateString.optional(),
    joinedTo: strictDateString.optional(),
  })
  .superRefine((input, ctx) => {
    if (
      input.joinedFrom &&
      input.joinedTo &&
      input.joinedFrom > input.joinedTo
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Joined-from date must not be after joined-to date.",
        path: ["joinedFrom"],
      });
    }
  });

export const adminMemberIdSchema = z.object({
  memberId: z.string().uuid(),
});

export const adminMemberDeleteSchema = adminMemberIdSchema.extend({
  confirmation: z.literal(ADMIN_MEMBER_DELETE_CONFIRMATION),
});

export const adminMemberMassDuesInvalidationSchema = z.object({
  confirmation: z.literal(ADMIN_MEMBER_DUES_INVALIDATION_CONFIRMATION),
});

export const adminMemberEditableProfileSchema = memberProfileFormSchema
  .omit({
    profilePictureUrl: true,
    resumeUrl: true,
    school: true,
  })
  .extend({ school: adminMemberSchoolSchema });

export const adminMemberUpdateSchema = z.object({
  memberId: z.string().uuid(),
  points: z.number().int().min(0),
  profile: adminMemberEditableProfileSchema,
});

export const adminMemberDuesStatusSchema = z.object({
  memberId: z.string().uuid(),
  paid: z.boolean(),
});

export type AdminMemberListInput = z.infer<typeof adminMemberListSchema>;
export type AdminMemberEditableProfileValues = z.input<
  typeof adminMemberEditableProfileSchema
>;
export type AdminMemberPageSize = (typeof adminMemberPageSizes)[number];
export type AdminMemberSortField = (typeof adminMemberSortFields)[number];
export type AdminMemberUpdateInput = z.infer<typeof adminMemberUpdateSchema>;
