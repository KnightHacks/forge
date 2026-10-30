// Shared vocabulary for the Career job board (#633). CAREER covers Guild
// companies and employment history; this module covers scraped job listings,
// member applications, and Discord delivery.

export const JOB_TRACKS = ["internship", "new_grad"] as const;

export type JobTrack = (typeof JOB_TRACKS)[number];

export const JOB_TRACK_LABELS = {
  internship: "Internship",
  new_grad: "New grad",
} satisfies Record<JobTrack, string>;

/**
 * Role categories used for filtering and grouping. Categories never exclude a
 * job from ingestion; anything unclassified lands in `other`. To add one, add
 * its key here (in display order) and its definition below. The classification
 * rules live in `@forge/api`.
 */
export const JOB_CATEGORIES = [
  "swe",
  "data_ai",
  "pm",
  "it_security",
  "quant",
  "analyst",
  "hardware",
  "design",
  "other",
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];

export const JOB_CATEGORY_DEFINITIONS = {
  analyst: {
    description:
      "Business, data, product, and financial analysts, plus business intelligence.",
    label: "Analyst",
  },
  data_ai: {
    description:
      "Data engineering, data science, machine learning, AI engineering, and applied research.",
    label: "Data / AI",
  },
  design: {
    description: "UX/UI, product design, UX research, and interaction design.",
    label: "Design",
  },
  hardware: {
    description:
      "Electrical engineering, computer hardware, chip design, FPGA, and robotics.",
    label: "Hardware",
  },
  it_security: {
    description:
      "IT support, systems and network administration, cybersecurity, and security operations.",
    label: "IT / Security",
  },
  other: {
    description:
      "Roles that don't clearly fit a category or don't give enough detail to classify.",
    label: "Other",
  },
  pm: {
    description:
      "Product management and technical program or project management.",
    label: "PM",
  },
  quant: {
    description:
      "Quantitative research, quantitative trading, and quantitative developer roles.",
    label: "Quant",
  },
  swe: {
    description:
      "Software engineering across frontend, backend, mobile, embedded, platform, SRE, DevOps, and test automation.",
    label: "SWE",
  },
} satisfies Record<JobCategory, { description: string; label: string }>;

export const JOB_WORK_ARRANGEMENTS = ["onsite", "hybrid", "remote"] as const;

export type JobWorkArrangement = (typeof JOB_WORK_ARRANGEMENTS)[number];

export const JOB_WORK_ARRANGEMENT_LABELS = {
  hybrid: "Hybrid",
  onsite: "On-site",
  remote: "Remote",
} satisfies Record<JobWorkArrangement, string>;

/**
 * How much of a source's location text could be parsed. The original text is
 * always kept; `unknown` means nothing could be resolved from it.
 */
export const JOB_LOCATION_KINDS = [
  "city",
  "state",
  "remote_us",
  "unknown",
] as const;

export type JobLocationKind = (typeof JOB_LOCATION_KINDS)[number];

export const JOB_SORTS = ["newest", "recently_posted", "company"] as const;

export type JobSort = (typeof JOB_SORTS)[number];

export const JOB_SORT_LABELS = {
  company: "Company (A–Z)",
  newest: "Newest on Forge",
  recently_posted: "Recently posted",
} satisfies Record<JobSort, string>;

/** Posted-date filter windows. Jobs without a source posted date are excluded. */
export const JOB_POSTED_WITHIN = ["day", "week", "month"] as const;

export type JobPostedWithin = (typeof JOB_POSTED_WITHIN)[number];

export const JOB_POSTED_WITHIN_LABELS = {
  day: "Past 24 hours",
  month: "Past 30 days",
  week: "Past 7 days",
} satisfies Record<JobPostedWithin, string>;

export const JOB_POSTED_WITHIN_DAYS = {
  day: 1,
  month: 30,
  week: 7,
} satisfies Record<JobPostedWithin, number>;

/** Application stages in pipeline order, followed by the closed outcomes. */
export const APPLICATION_STAGES = [
  "saved",
  "applied",
  "online_assessment",
  "recruiter_screen",
  "interviewing",
  "final_round",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export const APPLICATION_STAGE_LABELS = {
  applied: "Applied",
  final_round: "Final round",
  interviewing: "Interviewing",
  offer: "Offer",
  online_assessment: "Online assessment",
  recruiter_screen: "Recruiter screen",
  rejected: "Rejected",
  saved: "Saved",
  withdrawn: "Withdrawn",
} satisfies Record<ApplicationStage, string>;

/** Stages where a numbered interview round is meaningful. */
export const APPLICATION_ROUND_STAGES = [
  "interviewing",
] as const satisfies readonly ApplicationStage[];

export const MAX_APPLICATION_ROUND = 10;

export const APPLICATION_VISIBILITIES = ["community", "private"] as const;

export type ApplicationVisibility = (typeof APPLICATION_VISIBILITIES)[number];

export const DEFAULT_APPLICATION_VISIBILITY =
  "community" satisfies ApplicationVisibility;

export const APPLICATION_VISIBILITY_LABELS = {
  community: "Visible to signed-in members",
  private: "Private",
} satisfies Record<ApplicationVisibility, string>;

export const MAX_APPLICATION_NOTES_LENGTH = 2000;

export const ALERT_TARGET_KINDS = ["company", "location"] as const;

export type AlertTargetKind = (typeof ALERT_TARGET_KINDS)[number];

export const MAX_ALERT_CUSTOM_VALUE_LENGTH = 120;

export const JOB_DELIVERY_STATES = [
  "pending",
  "sending",
  "sent",
  "uncertain",
  "suppressed",
] as const;

export type JobDeliveryState = (typeof JOB_DELIVERY_STATES)[number];

export const JOB_SEARCH_DEFAULT_LIMIT = 25;
export const JOB_SEARCH_MAX_LIMIT = 50;
export const JOB_SEARCH_MAX_QUERY_LENGTH = 120;
