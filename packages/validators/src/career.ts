import { z } from "zod";

import { CAREER } from "@forge/consts";

const OBVIOUSLY_DISALLOWED_COMPANY_TERMS = [
  "asshole",
  "bitch",
  "cunt",
  "fuck",
  "nigger",
  "shit",
] as const;

function containsDisallowedCompanyTerm(value: string) {
  const normalized = value.toLowerCase();
  return OBVIOUSLY_DISALLOWED_COMPANY_TERMS.some((term) =>
    normalized.includes(term),
  );
}

function trimmedOrNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed?.length ? trimmed : null;
}

export function normalizeCompanyName(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const companyNameSchema = z
  .string()
  .trim()
  .min(2, "Enter a company name.")
  .max(120, "Company names must be 120 characters or fewer.")
  .refine((value) => !containsDisallowedCompanyTerm(value), {
    message: "Choose an appropriate company name.",
  });

const optionalCompanyNameSchema = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .pipe(companyNameSchema.nullable())
  .nullable()
  .optional();

const companyDomainSchema = z
  .string()
  .trim()
  .max(253, "Company domains must be 253 characters or fewer.")
  .transform((value, context) => {
    if (value.length === 0) return null;

    const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(value)
      ? value
      : `https://${value}`;

    try {
      return new URL(withProtocol).hostname
        .toLowerCase()
        .replace(/^www\./, "")
        .replace(/\.$/, "");
    } catch {
      context.addIssue({
        code: "custom",
        message: "Enter a valid company domain.",
      });
      return z.NEVER;
    }
  });

export const companyCreateInputSchema = z
  .object({
    displayName: companyNameSchema,
  })
  .strict();

export const companyAdminUpdateSchema = z
  .object({
    aliases: z
      .array(companyNameSchema)
      .max(
        CAREER.MAX_COMPANY_ALIASES,
        `Add no more than ${CAREER.MAX_COMPANY_ALIASES} aliases.`,
      )
      .transform((aliases) => {
        const normalized = new Set<string>();
        return aliases.filter((alias) => {
          const key = normalizeCompanyName(alias);
          if (normalized.has(key)) return false;
          normalized.add(key);
          return true;
        });
      }),
    displayName: companyNameSchema,
    domain: companyDomainSchema.nullable().optional(),
    legalName: optionalCompanyNameSchema,
  })
  .strict()
  .transform((input) => ({
    ...input,
    domain: input.domain ?? null,
    legalName: input.legalName ?? input.displayName,
  }));

export const usCityKeySchema = z
  .string()
  .regex(/^\d{2}-\d{5}$/, "Choose a city from the U.S. city search.");

const EMPLOYMENT_MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

/**
 * Browsers that do not implement `input[type="month"]` expose it as a plain
 * text field. Accept the month formats people naturally enter there, while
 * keeping the database representation sortable and constrained as YYYY-MM.
 */
export function normalizeEmploymentMonth(value: string) {
  const input = value.trim();
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(input)) return input;

  const numeric = /^(0?[1-9]|1[0-2])[/-](\d{4})$/.exec(input);
  if (numeric) {
    return `${numeric[2]}-${numeric[1]?.padStart(2, "0")}`;
  }

  const named = /^([a-z]+)\.?\s+(\d{4})$/i.exec(input);
  if (named) {
    const monthName = named[1]?.toLowerCase() ?? "";
    const monthIndex = EMPLOYMENT_MONTHS.findIndex(
      (month) =>
        month === monthName ||
        (monthName.length >= 3 && month.startsWith(monthName)),
    );
    if (monthIndex >= 0) {
      return `${named[2]}-${String(monthIndex + 1).padStart(2, "0")}`;
    }
  }

  return input;
}

const employmentMonthSchema = z
  .string()
  .transform(normalizeEmploymentMonth)
  .pipe(
    z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use a valid month and year."),
  );

export const memberEmploymentStateSchema = z.enum(
  CAREER.MEMBER_EMPLOYMENT_STATES,
);

export const employmentInputSchema = z
  .object({
    cityKey: usCityKeySchema.nullable().optional(),
    companyId: z.string().uuid("Choose a company.").nullable().optional(),
    endMonth: employmentMonthSchema.nullable().optional(),
    experienceType: z.enum(CAREER.EMPLOYMENT_EXPERIENCE_TYPES),
    guildVisible: z.boolean().default(true),
    startMonth: employmentMonthSchema.nullable().optional(),
    state: memberEmploymentStateSchema,
    proposedCompanyName: companyNameSchema.nullable().optional(),
    title: z
      .string()
      .trim()
      .min(1, "Enter a position title.")
      .max(120, "Position titles must be 120 characters or fewer."),
  })
  .strict()
  .superRefine((employment, context) => {
    if (
      Boolean(employment.companyId) === Boolean(employment.proposedCompanyName)
    ) {
      context.addIssue({
        code: "custom",
        message: "Choose an existing company or enter a new one.",
        path: ["companyId"],
      });
    }

    if (employment.state === "current" && employment.endMonth) {
      context.addIssue({
        code: "custom",
        message: "Current employment cannot have an end month.",
        path: ["endMonth"],
      });
    }

    if (
      employment.startMonth &&
      employment.endMonth &&
      employment.endMonth < employment.startMonth
    ) {
      context.addIssue({
        code: "custom",
        message: "End month cannot be before start month.",
        path: ["endMonth"],
      });
    }
  })
  .transform((employment) => ({
    ...employment,
    cityKey: employment.cityKey ?? null,
    companyId: employment.companyId ?? null,
    endMonth: employment.endMonth ?? null,
    proposedCompanyName: trimmedOrNull(employment.proposedCompanyName),
    startMonth: employment.startMonth ?? null,
  }));

export const employmentHistorySchema = z
  .array(employmentInputSchema)
  .max(
    CAREER.MAX_EMPLOYMENT_HISTORY_ENTRIES,
    `Add no more than ${CAREER.MAX_EMPLOYMENT_HISTORY_ENTRIES} employment entries.`,
  );

export const guildLocationInputSchema = z
  .object({
    currentCityKey: usCityKeySchema.nullable(),
    guildLocationVisible: z.boolean(),
  })
  .strict();

export const companyIdInputSchema = z
  .object({
    companyId: z.string().uuid(),
  })
  .strict();

export const companySearchInputSchema = z
  .object({
    limit: z.number().int().min(1).max(25).default(10),
    query: z.string().trim().min(1).max(80),
  })
  .strict();

export const usCitySearchInputSchema = z
  .object({
    limit: z.number().int().min(1).max(25).default(10),
    query: z.string().trim().min(1).max(80),
  })
  .strict();

export const mergeCompaniesInputSchema = z
  .object({
    canonicalCompanyId: z.string().uuid(),
    duplicateCompanyId: z.string().uuid(),
  })
  .strict()
  .refine(
    (input) => input.canonicalCompanyId !== input.duplicateCompanyId,
    "Choose two different companies.",
  );

export type CompanyCreateInput = z.infer<typeof companyCreateInputSchema>;
export type EmploymentInput = z.infer<typeof employmentInputSchema>;
export type GuildLocationInput = z.infer<typeof guildLocationInputSchema>;
