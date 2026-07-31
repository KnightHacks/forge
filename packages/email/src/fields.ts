/**
 * The personalization catalog and everything that only needs to *read* it.
 *
 * Split from `templates.ts` deliberately. That module imports the TypeScript
 * compiler at module scope to parse JSX templates; anything importing a field
 * name from it dragged all of `typescript` along. The hackathon router needs
 * only to regex-match `{{field.path}}` in a subject line, so it imports
 * `@forge/email/fields` and the compiler stays out of its graph.
 */

export interface PersonalizationField {
  fallback?: string;
  field: string;
  required: boolean;
  type: "number" | "string" | "string[]";
}

export class EmailTemplateValidationError extends Error {
  readonly code = "EMAIL_TEMPLATE_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "EmailTemplateValidationError";
  }
}

export function scalarText(value: unknown): string {
  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
    ? String(value)
    : "";
}

export const PERSONALIZATION_FIELDS = {
  "hacker.status": "string",
  "hackathon.applicationUrl": "string",
  // Dates arrive already formatted. Every other field here is a plain scalar,
  // and a template author has no way to format a timestamp — an acceptance
  // email showing a raw ISO string would be the obvious failure.
  "hackathon.confirmationDeadline": "string",
  "hackathon.displayName": "string",
  "hackathon.endDate": "string",
  "hackathon.name": "string",
  "hackathon.startDate": "string",
  "member.graduationYear": "number",
  "recipient.email": "string",
  "recipient.firstName": "string",
  "recipient.name": "string",
  "team.roleNames": "string[]",
} as const satisfies Record<string, PersonalizationField["type"]>;

export const EMAIL_TEMPLATE_DOMAINS = ["club", "hackathon"] as const;
export type EmailTemplateDomain = (typeof EMAIL_TEMPLATE_DOMAINS)[number];

/**
 * Which field families each product may reference.
 *
 * `member.*` and `team.*` come from a club member record, and a hacker need not
 * be one — a hackathon template referencing either renders blank for exactly the
 * people it is addressed to. Keeping the two sets apart is why the catalog is
 * scoped rather than flat.
 *
 * Matched by prefix so a new field joins the right set by its name alone.
 */
const DOMAIN_FIELD_PREFIXES: Record<EmailTemplateDomain, string[]> = {
  club: ["member.", "recipient.", "team."],
  hackathon: ["hacker.", "hackathon.", "recipient."],
};

export function personalizationFieldsForDomain(domain: EmailTemplateDomain) {
  const prefixes = DOMAIN_FIELD_PREFIXES[domain];
  return Object.keys(PERSONALIZATION_FIELDS)
    .filter((field) => prefixes.some((prefix) => field.startsWith(prefix)))
    .sort();
}

/**
 * Subject lines interpolate too, using `{{field.path}}`.
 *
 * The provider does not do this for us: `sendTransactional` hands the subject
 * to Listmonk verbatim, and in raw-content mode its template only knows about
 * the body. So a subject is rendered here before it is sent, against the same
 * catalog the body uses — otherwise "[DUE {{hackathon.confirmationDeadline}}]"
 * would arrive in someone's inbox exactly as typed.
 *
 * Deliberately permissive: it matches ANY `{{ ... }}` placeholder, not only
 * well-formed `namespace.key` ones.
 *
 * An earlier version required two dot-separated alpha segments, which meant a
 * typo simply did not match — so `{{hackathonDisplayName}}` (missing dot) and
 * `{{hackathon.confirmationDeadline.date}}` (one segment too many) were
 * invisible to validation AND to rendering, and shipped to the applicant as
 * literal braces. Matching everything and rejecting what is not in the catalog
 * is what makes the officer-facing promise — "a misspelt field is rejected when
 * you press Save, not silently at send time" — actually true.
 */
const SUBJECT_FIELD_PATTERN = /\{\{([^{}]*)\}\}/g;

export function subjectFields(subject: string): string[] {
  return [...subject.matchAll(SUBJECT_FIELD_PATTERN)].map((match) =>
    (match[1] ?? "").trim(),
  );
}

/**
 * Rejects a subject referencing a field its domain cannot fill, so the failure
 * lands on the officer typing it rather than on the applicant reading it.
 */
export function assertSubjectFieldsAllowed(
  subject: string,
  domain: EmailTemplateDomain,
) {
  const allowed = new Set(personalizationFieldsForDomain(domain));
  for (const field of subjectFields(subject)) {
    if (!Object.hasOwn(PERSONALIZATION_FIELDS, field)) {
      throw new EmailTemplateValidationError(
        `Unknown personalization field "${field}" in the subject.`,
      );
    }
    if (!allowed.has(field)) {
      throw new EmailTemplateValidationError(
        `Personalization field "${field}" is not available to ${domain} templates.`,
      );
    }
  }
}

/**
 * A missing value renders as an empty string rather than leaving the raw
 * placeholder in place — a blank is a smaller embarrassment than showing an
 * applicant the template syntax.
 */
export function renderSubject(
  subject: string,
  values: Record<string, unknown>,
): string {
  return subject
    .replace(SUBJECT_FIELD_PATTERN, (_match, raw: string) => {
      const [namespace, key] = raw.trim().split(".");
      const scope = namespace ? values[namespace] : undefined;
      const value =
        typeof scope === "object" && scope !== null && key
          ? (scope as Record<string, unknown>)[key]
          : undefined;
      return scalarText(value);
    })
    .trim();
}

export function assertFieldsAllowedForDomain(
  contract: Map<string, PersonalizationField>,
  domain: EmailTemplateDomain,
) {
  const prefixes = DOMAIN_FIELD_PREFIXES[domain];
  for (const field of contract.keys()) {
    if (prefixes.some((prefix) => field.startsWith(prefix))) continue;
    throw new EmailTemplateValidationError(
      `Personalization field "${field}" is not available to ${domain} templates.`,
    );
  }
}

/**
 * How hackathon dates reach a template and a subject line.
 *
 * Declared beside the catalog that promises them as pre-formatted strings. The
 * alternative — each caller formatting its own — is how an officer approves a
 * preview reading "Oct 3, 2026" and the applicant receives "10/3/2026" for the
 * deadline they have to act on.
 *
 * Fixed to one locale and UTC on purpose: Knight Hacks runs in one place, and a
 * deadline that renders differently per reader is worse than one that is
 * consistently explicit.
 */
const HACKATHON_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

export function formatHackathonDate(value: Date | string) {
  return HACKATHON_DATE_FORMAT.format(new Date(value));
}
