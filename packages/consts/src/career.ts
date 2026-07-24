export const COMPANY_REVIEW_STATES = [
  "pending",
  "approved",
  "rejected",
  "merged",
] as const;

export type CompanyReviewState = (typeof COMPANY_REVIEW_STATES)[number];

export const EMPLOYMENT_STATES = ["current", "past", "unknown"] as const;

export type EmploymentState = (typeof EMPLOYMENT_STATES)[number];

export const MEMBER_EMPLOYMENT_STATES = ["current", "past"] as const;

export const EMPLOYMENT_EXPERIENCE_TYPES = [
  "internship",
  "full_time",
  "part_time",
  "co_op",
  "contract",
  "fellowship",
  "self_employed",
  "other",
] as const;

export type EmploymentExperienceType =
  (typeof EMPLOYMENT_EXPERIENCE_TYPES)[number];

export const EMPLOYMENT_EXPERIENCE_LABELS = {
  co_op: "Co-op",
  contract: "Contract",
  fellowship: "Fellowship",
  full_time: "Full-time",
  internship: "Internship",
  other: "Other",
  part_time: "Part-time",
  self_employed: "Self-employed",
} satisfies Record<EmploymentExperienceType, string>;

export const MAX_EMPLOYMENT_HISTORY_ENTRIES = 50;
export const MAX_COMPANY_ALIASES = 20;
