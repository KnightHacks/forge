import type { InsertMember } from "@forge/db/schemas/knight-hacks";
import { ISSUE, PERMISSIONS } from "@forge/consts";
import { eq, inArray, or } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import {
  FormSections,
  FormsSchemas,
  Issue,
  IssueHistory,
  IssueReminderDelivery,
  IssuesToTeamsVisibility,
  IssuesToUsersAssignment,
  Member,
} from "@forge/db/schemas/knight-hacks";

/**
 * Fixture data for the visual-regression baselines.
 *
 * Two rules govern everything in this file, and both exist because a baseline
 * that drifts is worse than no baseline at all:
 *
 * 1. **Every date is an absolute literal.** Nothing is derived from `new
 *    Date()`. The existing e2e specs seed relative to now — `club-operations-
 *    issues.spec.ts` writes issues into the current UTC month, and
 *    `admin-club-analytics.spec.ts` derives the dues year from today. That is
 *    correct for behavioural specs and fatal for pixel comparison: the
 *    rendered due dates and month headings would change on the 1st of every
 *    month.
 *
 * 2. **No dues rows are seeded, deliberately.** The members table's Dues badge
 *    comes from `buildDuesStatus({ referenceDate = new Date() })`, and
 *    `getDuesAcademicYear` rolls over on 1 August. A member with a payment
 *    would render "Paid" until that date and "Unpaid" after it — a baseline
 *    that fails once a year for no reason anyone would connect to the change
 *    they were making. With no payments the badge reads "Unpaid" for every
 *    possible reference date. The column's *layout* is what these baselines
 *    police, and that is identical either way.
 */

const id = (suffix: number) =>
  `d1500000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;

export const VISUAL_USER_ID = id(1);
/**
 * The sole holder of `ROLE_DETAIL_ROLE_ID`.
 *
 * A user of its own rather than one of the directory members, so that
 * `Blade assignments` and the e2e gateway's `getRoleCounts` — which counts
 * `Permissions` rows — are both exactly 1. It gets no `Member` row on purpose:
 * `getAdminMembers` selects from `Member`, so a holder without one cannot
 * reach the members baselines.
 */
const ROLE_DETAIL_HOLDER_USER_ID = id(2);
const OFFICER_ROLE_ID = id(11);
const PROGRAMS_ROLE_ID = id(12);
const MARKETING_ROLE_ID = id(13);
const PARTNERSHIPS_ROLE_ID = id(14);
export const ROLE_DETAIL_ROLE_ID = id(15);
export const SETTINGS_MEMBER_ID = id(21);

/**
 * The role the role-detail-dialog baselines open.
 *
 * The name is what renders in the captured dialog header, so it is pinned
 * here rather than being spelled again in the spec. Under the e2e Discord
 * override `getGuildRoles` builds its list from the database and echoes each
 * linked row's stored name back before overlaying seven hard-coded roles
 * (`packages/api/src/tests/support/role-management-discord.ts`), and
 * `buildLinkedRoleViews` renders `live?.name ?? role.name`. So the stored name
 * below is what the dialog shows — but only because `discordRoleId` is none of
 * those seven ids. Reusing one would silently rename the role in the capture.
 */
export const ROLE_DETAIL_ROLE_NAME = "Baseline Role Detail";

const ROLE_IDS = [
  OFFICER_ROLE_ID,
  PROGRAMS_ROLE_ID,
  MARKETING_ROLE_ID,
  PARTNERSHIPS_ROLE_ID,
  ROLE_DETAIL_ROLE_ID,
];

/**
 * The team ids the issue-workspace baselines filter on.
 *
 * The issue views are not scoped to a fixture by default — they show every
 * issue the actor can see, and a working Blade database contains real ones
 * (43 across "KH IX Team" and "Design Team" on the machine this was written
 * on). Filtering by team is what makes these baselines a function of the
 * fixture rather than of whatever the developer has been doing.
 */
export const ISSUE_TEAM_IDS = [
  PROGRAMS_ROLE_ID,
  MARKETING_ROLE_ID,
  PARTNERSHIPS_ROLE_ID,
];

const DIRECTORY_COUNT = 12;
const DIRECTORY_USER_IDS = Array.from({ length: DIRECTORY_COUNT }, (_, index) =>
  id(100 + index),
);
const DIRECTORY_MEMBER_IDS = Array.from(
  { length: DIRECTORY_COUNT },
  (_, index) => id(200 + index),
);
const ISSUE_COUNT = 64;
const ISSUE_IDS = Array.from({ length: ISSUE_COUNT }, (_, index) =>
  id(300 + index),
);
const ROOT_ISSUE_ID = id(300);

export const FORM_SECTION_ID = id(401);
export const BUILDER_FORM_ID = id(411);
const PUBLISHED_FORM_ID = id(412);
const ARCHIVED_FORM_ID = id(413);
const FORM_IDS = [BUILDER_FORM_ID, PUBLISHED_FORM_ID, ARCHIVED_FORM_ID];

const ALL_USER_IDS = [
  VISUAL_USER_ID,
  ROLE_DETAIL_HOLDER_USER_ID,
  ...DIRECTORY_USER_IDS,
];

/**
 * The token the admin members table is filtered by.
 *
 * `getAdminMembers` selects every row in `Member` when no query is supplied,
 * so an unfiltered baseline would be hostage to whatever any other spec left
 * behind in the shared dev database. Every fixture member carries this as a
 * last name, and the baseline pins `?q=`, `?sort=` and `?direction=`.
 */
export const DIRECTORY_QUERY = "baseline";

/** The month the issues calendar baseline is pinned to, matching `dueAt` below. */
export const ISSUES_CALENDAR_DATE = "2025-01-15";

function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Missing ${label}.`);
  return value;
}

function permissionBitstring(...keys: PERMISSIONS.PermissionKey[]) {
  const bits = Array.from(
    { length: Object.keys(PERMISSIONS.PERMISSION_DATA).length },
    () => "0",
  );
  for (const key of keys) {
    bits[PERMISSIONS.PERMISSION_DATA[key].idx] = "1";
  }
  return bits.join("");
}

const DIRECTORY_FIRST_NAMES = [
  "Avery",
  "Blair",
  "Casey",
  "Devon",
  "Emery",
  "Finley",
  "Gray",
  "Harper",
  "Indigo",
  "Jordan",
  "Kai",
  "Lennox",
];

const ISSUE_TITLES = [
  "Finalize fall kickoff run of show",
  "Confirm workshop mentor roster",
  "Review partner activation brief",
  "Publish member newsletter",
  "Book general body meeting room",
  "Reconcile event supply inventory",
  "Prepare onboarding follow-up",
  "Approve social launch assets",
];

function builderFormData() {
  return {
    description:
      "Collected before every general body meeting so the programs team can size the room and prep materials.",
    instructions: [],
    questions: [
      {
        id: id(501),
        maxLength: 120,
        prompt: "What should we call you?",
        required: true,
        retired: false,
        type: "short_text" as const,
      },
      {
        allowOther: true,
        id: id(502),
        manualOptions: [
          { id: id(601), label: "Workshops", value: "workshops" },
          { id: id(602), label: "Socials", value: "socials" },
          { id: id(603), label: "Hackathons", value: "hackathons" },
        ],
        optionSource: "manual" as const,
        presetCatalogId: null,
        prompt: "Which programming do you want more of?",
        required: true,
        retired: false,
        type: "multiple_choice" as const,
      },
      {
        id: id(503),
        max: 10,
        min: 1,
        prompt: "How useful was the last meeting?",
        required: false,
        retired: false,
        type: "linear_scale" as const,
      },
      {
        allowedMimeTypes: ["application/pdf"],
        id: id(504),
        maxBytes: 5 * 1024 * 1024,
        prompt: "Attach a resume if you want feedback",
        required: false,
        retired: false,
        type: "file" as const,
      },
      {
        id: id(505),
        maxLength: 2000,
        prompt: "Anything else the officers should know?",
        required: false,
        retired: false,
        type: "paragraph" as const,
      },
    ],
    title: "General body meeting intake",
  };
}

function simpleFormData(title: string, description: string) {
  return {
    description,
    instructions: [],
    questions: [
      {
        id: id(511),
        maxLength: 200,
        prompt: "Share one sentence of feedback",
        required: true,
        retired: false,
        type: "short_text" as const,
      },
    ],
    title,
  };
}

/**
 * The four roles the existing baselines depend on, plus the one the role
 * detail dialog opens.
 *
 * Extracted the way `builderFormData` is, so `seedVisualFixture` stays under
 * the file's 200-line function limit. Do not rename the first four: the issue
 * baselines render their names as team filter chips.
 */
function roleRows() {
  return [
    {
      discordRoleId: "visual-baseline-officer-role",
      id: OFFICER_ROLE_ID,
      name: "Officers",
      permissions: permissionBitstring("IS_OFFICER"),
      teamHexcodeColor: "#8b5cf6",
    },
    {
      discordRoleId: "visual-baseline-programs-role",
      id: PROGRAMS_ROLE_ID,
      name: "Programs",
      permissions: permissionBitstring("EDIT_ISSUES"),
      teamHexcodeColor: "#22c55e",
    },
    {
      discordRoleId: "visual-baseline-marketing-role",
      emailAudienceEnabled: true,
      id: MARKETING_ROLE_ID,
      name: "Marketing",
      permissions: permissionBitstring("EDIT_ISSUES"),
      teamHexcodeColor: "#f59e0b",
    },
    {
      discordRoleId: "visual-baseline-partnerships-role",
      id: PARTNERSHIPS_ROLE_ID,
      name: "Partnerships",
      permissions: permissionBitstring("READ_ISSUES"),
      teamHexcodeColor: "#38bdf8",
    },
    // The role the role-detail-dialog baselines open. Every field the captured
    // regions read is pinned: a non-empty permission set so the header badge
    // reads "Access" rather than "Cosmetic"
    // (`isCosmeticPermissionString` is "no permissions at all"), a colour so
    // the header swatch is not the `#64748b` fallback, and the email audience
    // off so the captured switch is in its default position.
    // `issueRemindersEnabled` is spelled out because the column defaults to
    // `true`, not `false`.
    {
      discordRoleId: "visual-baseline-role-detail-role",
      emailAudienceEnabled: false,
      eventFeedbackExcluded: false,
      id: ROLE_DETAIL_ROLE_ID,
      issueRemindersEnabled: false,
      name: ROLE_DETAIL_ROLE_NAME,
      permissions: permissionBitstring("READ_ISSUES"),
      teamHexcodeColor: "#ef4444",
    },
  ];
}

export async function cleanupVisualFixture() {
  await db
    .delete(IssueReminderDelivery)
    .where(inArray(IssueReminderDelivery.issueId, ISSUE_IDS));
  await db.delete(IssueHistory).where(inArray(IssueHistory.issueId, ISSUE_IDS));
  await db
    .delete(IssuesToTeamsVisibility)
    .where(inArray(IssuesToTeamsVisibility.issueId, ISSUE_IDS));
  await db
    .delete(IssuesToUsersAssignment)
    .where(inArray(IssuesToUsersAssignment.issueId, ISSUE_IDS));
  await db.delete(Issue).where(inArray(Issue.id, ISSUE_IDS));
  await db.delete(FormsSchemas).where(inArray(FormsSchemas.id, FORM_IDS));
  await db.delete(FormSections).where(eq(FormSections.id, FORM_SECTION_ID));
  await db
    .delete(Member)
    .where(inArray(Member.id, [SETTINGS_MEMBER_ID, ...DIRECTORY_MEMBER_IDS]));
  await db
    .delete(Permissions)
    .where(
      or(
        inArray(Permissions.userId, ALL_USER_IDS),
        inArray(Permissions.roleId, ROLE_IDS),
      ),
    );
  await db.delete(Roles).where(inArray(Roles.id, ROLE_IDS));
  await db.delete(User).where(inArray(User.id, ALL_USER_IDS));
}

export async function seedVisualFixture() {
  await cleanupVisualFixture();

  await db.insert(User).values([
    {
      discordUserId: "visual-baseline-officer",
      email: "visual-baseline-officer@example.test",
      emailVerified: true,
      id: VISUAL_USER_ID,
      image: null,
      name: "Riley Baseline",
    },
    {
      discordUserId: "visual-baseline-role-detail-holder",
      email: "visual-baseline-role-detail-holder@example.test",
      emailVerified: true,
      id: ROLE_DETAIL_HOLDER_USER_ID,
      image: null,
      name: "Quinn Baseline",
    },
    ...DIRECTORY_USER_IDS.map((userId, index) => ({
      discordUserId: `visual-baseline-member-${index}`,
      email: `visual-baseline-member-${index}@example.test`,
      emailVerified: true,
      id: userId,
      image: null,
      name: `${DIRECTORY_FIRST_NAMES[index]} Baseline`,
    })),
  ]);

  await db.insert(Roles).values(roleRows());

  await db.insert(Permissions).values([
    { roleId: OFFICER_ROLE_ID, userId: VISUAL_USER_ID },
    { roleId: ROLE_DETAIL_ROLE_ID, userId: ROLE_DETAIL_HOLDER_USER_ID },
  ]);

  // The member behind /member/settings. `profilePictureUrl` and `resumeUrl`
  // stay null on purpose: both render presigned S3 URLs, one into an <img> and
  // one into a PDF <iframe>, which would make the page depend on object
  // storage being reachable.
  await db.insert(Member).values({
    about:
      "Third-year CS student, Knight Hacks programs lead, and a reluctant but competent maintainer of the check-in tablet.",
    age: 21,
    company: "Knight Hacks",
    dateCreated: "2024-08-19",
    discordUser: "visual-baseline-officer",
    dob: "2004-03-11",
    email: "visual-baseline-officer@example.test",
    firstName: "Riley",
    gender: "Prefer not to answer",
    githubProfileUrl: "https://github.com/example",
    gradDate: "2027-05-02",
    guildOpportunityStatuses: ["internships", "offering-mentorship"],
    guildProfileVisible: true,
    id: SETTINGS_MEMBER_ID,
    lastName: "Baseline",
    levelOfStudy: "Undergraduate University (3+ year)",
    linkedinProfileUrl: "https://www.linkedin.com/in/example",
    major: "Computer Science",
    phoneNumber: "407-555-1500",
    points: 120,
    profilePictureUrl: null,
    raceOrEthnicity: "Prefer not to answer",
    resumeUrl: null,
    school: "University of Central Florida",
    shirtSize: "M",
    tagline: "Programs lead, workshop wrangler",
    timeCreated: "09:15:00",
    userId: VISUAL_USER_ID,
    websiteUrl: "https://example.com",
  });

  const directoryMembers: InsertMember[] = DIRECTORY_MEMBER_IDS.map(
    (memberId, index) => ({
      age: 19 + (index % 5),
      // Distinct date+time pairs: the admin table's "joined" sort compares
      // `${dateCreated} ${timeCreated}` as a string, so equal values would
      // fall through to an id tiebreak and read as an arbitrary order.
      dateCreated: `2024-09-${String(index + 1).padStart(2, "0")}`,
      discordUser: `visual-baseline-member-${index}`,
      dob: `${2003 - (index % 4)}-06-14`,
      email: `visual-baseline-member-${index}@example.test`,
      firstName: DIRECTORY_FIRST_NAMES[index] ?? `Member ${index}`,
      gender: index % 3 === 0 ? "Woman" : "Prefer not to answer",
      gradDate: `${2026 + (index % 3)}-05-02`,
      guildProfileVisible: index % 2 === 0,
      id: memberId,
      lastName: "Baseline",
      levelOfStudy:
        index < 9
          ? "Undergraduate University (3+ year)"
          : "Graduate University (Masters, Professional, Doctoral, etc)",
      major: "Computer Science",
      phoneNumber: `407-555-${String(1510 + index)}`,
      points: index * 15,
      profilePictureUrl: null,
      raceOrEthnicity: "Prefer not to answer",
      resumeUrl: null,
      school:
        index < 9 ? "University of Central Florida" : "University of Florida",
      shirtSize: index % 2 === 0 ? "M" : "L",
      timeCreated: `${String(8 + (index % 10)).padStart(2, "0")}:30:00`,
      userId: required(DIRECTORY_USER_IDS[index], "directory member user"),
    }),
  );
  await db.insert(Member).values(directoryMembers);

  // Issues land in January 2025 to match ISSUES_CALENDAR_DATE. Both the
  // calendar grid and every rendered due label are then a function of the URL,
  // not of the current month.
  const teams = [PROGRAMS_ROLE_ID, MARKETING_ROLE_ID, PARTNERSHIPS_ROLE_ID];
  await db.insert(Issue).values(
    ISSUE_IDS.map((issueId, index) => ({
      creator: VISUAL_USER_ID,
      date: new Date(Date.UTC(2025, 0, (index % 27) + 1, 23, 0)),
      description:
        index === 0
          ? "## Launch checklist\n\nConfirm the final owner, venue handoff, and communications sequence."
          : `Operational context for ${ISSUE_TITLES[index % ISSUE_TITLES.length]}.`,
      dueAt:
        index % 9 === 0
          ? null
          : new Date(Date.UTC(2025, 0, (index % 27) + 1, 23, 0)),
      id: issueId,
      links: index % 5 === 0 ? ["https://example.com/runbook"] : [],
      name: `${ISSUE_TITLES[index % ISSUE_TITLES.length]}${
        index >= ISSUE_TITLES.length ? ` · ${index + 1}` : ""
      }`,
      parent: index === 1 ? ROOT_ISSUE_ID : null,
      priority: ISSUE.PRIORITY[index % ISSUE.PRIORITY.length] ?? "Medium",
      status:
        ISSUE.ISSUE_STATUS[index % ISSUE.ISSUE_STATUS.length] ?? "Backlog",
      team: teams[index % teams.length] ?? PROGRAMS_ROLE_ID,
    })),
  );

  await db.insert(FormSections).values({
    id: FORM_SECTION_ID,
    name: "Baseline programs",
    order: 0,
  });

  await db.insert(FormsSchemas).values([
    {
      allowEdit: true,
      formData: builderFormData(),
      formValidatorJson: {},
      id: BUILDER_FORM_ID,
      name: "General body meeting intake",
      responseMode: "single_editable",
      section: "Baseline programs",
      sectionId: FORM_SECTION_ID,
      slugName: "visual-baseline-intake",
      state: "draft",
    },
    {
      formData: simpleFormData(
        "Workshop feedback",
        "Sent to attendees the morning after every workshop.",
      ),
      formValidatorJson: {},
      id: PUBLISHED_FORM_ID,
      name: "Workshop feedback",
      publishedAt: new Date("2024-10-01T12:00:00.000Z"),
      section: "Baseline programs",
      sectionId: FORM_SECTION_ID,
      slugName: "visual-baseline-workshop-feedback",
      state: "published",
    },
    {
      archivedAt: new Date("2025-01-05T12:00:00.000Z"),
      formData: simpleFormData(
        "Spring officer applications",
        "Closed after the spring officer cycle finished.",
      ),
      formValidatorJson: {},
      id: ARCHIVED_FORM_ID,
      name: "Spring officer applications",
      publishedAt: new Date("2024-11-01T12:00:00.000Z"),
      section: "Baseline programs",
      sectionId: FORM_SECTION_ID,
      slugName: "visual-baseline-officer-applications",
      state: "archived",
    },
  ]);
}
