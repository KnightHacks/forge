import type { Page } from "playwright/test";
import { expect, test } from "playwright/test";

import type { InsertMember } from "@forge/db/schemas/knight-hacks";
import { and, eq, inArray, or } from "@forge/db";
import { db } from "@forge/db/client";
import { User } from "@forge/db/schemas/auth";
import {
  FormResponse,
  FormSections,
  FormsSchemas,
  Member,
} from "@forge/db/schemas/knight-hacks";
import {
  MEMBER_DASHBOARD_PATH,
  MEMBER_SETTINGS_PATH,
  MEMBER_SIGNUP_FORM_ID,
  MEMBER_SIGNUP_FORM_SLUG,
  memberSignupFormData,
  memberSignupFormJsonSchema,
} from "@forge/validators";

const EDIT_USER_ID = "00000000-0000-4000-8000-000000000201";
const BACKFILL_USER_ID = "00000000-0000-4000-8000-000000000202";
const NO_MEMBER_USER_ID = "00000000-0000-4000-8000-000000000203";
const DUPLICATE_USER_ID = "00000000-0000-4000-8000-000000000204";

const testUsers = [
  {
    discordUserId: "blade-edit-member",
    email: "blade-edit-member@example.test",
    id: EDIT_USER_ID,
    name: "Blade Edit Member",
  },
  {
    discordUserId: "blade-backfill-member",
    email: "blade-backfill-member@example.test",
    id: BACKFILL_USER_ID,
    name: "Blade Backfill Member",
  },
  {
    discordUserId: "blade-settings-no-member",
    email: "blade-settings-no-member@example.test",
    id: NO_MEMBER_USER_ID,
    name: "Blade No Member",
  },
  {
    discordUserId: "blade-duplicate-member",
    email: "blade-duplicate-member@example.test",
    id: DUPLICATE_USER_ID,
    name: "Blade Duplicate Member",
  },
];

const testUserIds = testUsers.map((user) => user.id);
const testEmails = [
  ...testUsers.map((user) => user.email),
  "blade-edit-updated@example.test",
  "blade-backfill-updated@example.test",
];
const testDiscordIds = testUsers.map((user) => user.discordUserId);
const testPhones = [
  "321-555-0201",
  "321-555-0202",
  "321-555-0203",
  "321-555-0204",
  "321-555-0299",
];

const pdfPayload = {
  buffer: Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n"),
  mimeType: "application/pdf",
  name: "blade-settings-resume.pdf",
};

const pngPayload = {
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64",
  ),
  mimeType: "image/png",
  name: "blade-settings-avatar.png",
};

function routeURL(path: string) {
  return new RegExp(`${path.replaceAll("/", "\\/")}$`);
}

const baseMemberValues = {
  about: "Seeded Guild bio from Member row.",
  age: 24,
  company: "Knight Hacks",
  discordUser: "seeded-discord",
  dob: "2000-02-03",
  firstName: "Casey",
  gender: "Prefer not to answer",
  githubProfileUrl: "https://github.com/knighthacks",
  gradDate: "2027-05-02",
  guildProfileVisible: true,
  lastName: "Member",
  levelOfStudy: "Undergraduate University (3+ year)",
  linkedinProfileUrl: "https://www.linkedin.com/company/knight-hacks",
  major: "Computer Science",
  profilePictureUrl: null,
  raceOrEthnicity: "Prefer not to answer",
  resumeUrl: null,
  school: "University of Central Florida",
  shirtSize: "M",
  tagline: "Seeded Guild tagline",
  websiteUrl: "https://knighthacks.org",
} as const;

function memberValues(
  userId: string,
  overrides: Partial<InsertMember> = {},
): InsertMember {
  return {
    ...baseMemberValues,
    email: `member-${userId.slice(-3)}@example.test`,
    phoneNumber: `321-555-0${userId.slice(-3)}`,
    userId,
    ...overrides,
  };
}

const staleResponseData = {
  about: "Stale response bio",
  codeOfConductAccepted: false,
  company: "Stale Co",
  dob: "2000-02-03",
  email: "stale-response@example.test",
  firstName: "Stale",
  gender: "Prefer not to answer",
  githubProfileUrl: "",
  gradTerm: "Spring",
  gradYear: 2026,
  guildProfileVisible: false,
  lastName: "Response",
  levelOfStudy: "Undergraduate University (3+ year)",
  linkedinProfileUrl: "",
  major: "Computer Science",
  phoneNumber: "321-555-0299",
  profilePictureUrl: "",
  raceOrEthnicity: "Prefer not to answer",
  resumeUrl: "",
  school: "University of Central Florida",
  shirtSize: "M",
  tagline: "Stale tagline",
  websiteUrl: "",
};

async function cleanupE2EData() {
  await db
    .delete(FormResponse)
    .where(inArray(FormResponse.userId, testUserIds));

  await db
    .delete(Member)
    .where(
      or(
        inArray(Member.userId, testUserIds),
        inArray(Member.email, testEmails),
        inArray(Member.phoneNumber, testPhones),
      ),
    );

  await db
    .delete(User)
    .where(
      or(
        inArray(User.id, testUserIds),
        inArray(User.email, testEmails),
        inArray(User.discordUserId, testDiscordIds),
      ),
    );
}

async function ensureSignupForm() {
  const sectionId = "53fc75b1-7308-4af0-84e8-b79292b5eb33";
  await db
    .insert(FormSections)
    .values({ id: sectionId, name: "Membership" })
    .onConflictDoNothing();

  await db
    .insert(FormsSchemas)
    .values({
      allowEdit: false,
      allowResubmission: false,
      duesOnly: false,
      formData: memberSignupFormData,
      formValidatorJson: memberSignupFormJsonSchema,
      id: MEMBER_SIGNUP_FORM_ID,
      isClosed: false,
      name: memberSignupFormData.name,
      section: "Membership",
      sectionId,
      slugName: MEMBER_SIGNUP_FORM_SLUG,
    })
    .onConflictDoUpdate({
      target: FormsSchemas.id,
      set: {
        allowEdit: false,
        allowResubmission: false,
        duesOnly: false,
        formData: memberSignupFormData,
        formValidatorJson: memberSignupFormJsonSchema,
        isClosed: false,
        name: memberSignupFormData.name,
        section: "Membership",
        slugName: MEMBER_SIGNUP_FORM_SLUG,
      },
    });
}

async function seedE2EData() {
  await cleanupE2EData();
  await ensureSignupForm();

  await db.insert(User).values(
    testUsers.map((user) => ({
      discordUserId: user.discordUserId,
      email: user.email,
      emailVerified: true,
      id: user.id,
      image: null,
      name: user.name,
    })),
  );

  await db.insert(Member).values([
    memberValues(EDIT_USER_ID, {
      email: "blade-edit-member@example.test",
      phoneNumber: "321-555-0201",
    }),
    memberValues(BACKFILL_USER_ID, {
      email: "blade-backfill-member@example.test",
      firstName: "Bailey",
      phoneNumber: "321-555-0202",
    }),
    memberValues(DUPLICATE_USER_ID, {
      email: "blade-duplicate-member@example.test",
      firstName: "Dup",
      phoneNumber: "321-555-0204",
    }),
  ]);

  await db.insert(FormResponse).values({
    form: MEMBER_SIGNUP_FORM_ID,
    responseData: staleResponseData,
    userId: EDIT_USER_ID,
  });
}

async function signInAs(
  page: Page,
  userId = EDIT_USER_ID,
  callbackURL = MEMBER_DASHBOARD_PATH,
) {
  await page.goto(
    `/api/e2e/signin?userId=${encodeURIComponent(
      userId,
    )}&callbackURL=${encodeURIComponent(callbackURL)}`,
  );
}

async function getMember(userId: string) {
  return (
    (await db.query.Member.findFirst({
      where: eq(Member.userId, userId),
    })) ?? null
  );
}

async function getSignupResponse(userId: string) {
  return (
    (await db.query.FormResponse.findFirst({
      where: and(
        eq(FormResponse.userId, userId),
        eq(FormResponse.form, MEMBER_SIGNUP_FORM_ID),
      ),
    })) ?? null
  );
}

async function getUser(userId: string) {
  return (
    (await db.query.User.findFirst({
      where: eq(User.id, userId),
    })) ?? null
  );
}

async function fillProfileEdits(page: Page) {
  await page.getByPlaceholder("Lenny").fill("Riley");
  await page
    .getByPlaceholder("tk@knighthacks.org")
    .fill("blade-edit-updated@example.test");
  await page.getByPlaceholder("123-456-7890").fill("321-555-0203");
  await page.locator('input[type="number"]').fill("2028");
  await page
    .getByPlaceholder("Knight Hacks, UCF, a company, or self-employed")
    .fill("Forge Labs");
  await page
    .getByPlaceholder("Builder, designer, first-time hacker")
    .fill("Updated Guild tagline");
  await page
    .getByPlaceholder("Share a little about what you like building.")
    .fill("Updated Guild bio from settings.");
  await page
    .getByPlaceholder("https://knighthacks.org")
    .fill("https://dvidal.dev");
  await page.getByRole("switch").click();
}

async function saveProfile(page: Page) {
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();
}

test.describe("member field editing", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedE2EData();
  });

  test.afterAll(async () => {
    await cleanupE2EData();
  });

  test("redirects legacy member routes to the canonical dashboard and settings pages", async ({
    page,
  }) => {
    await signInAs(page, EDIT_USER_ID);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(routeURL(MEMBER_DASHBOARD_PATH));
    await expect(page.getByText("Welcome, Casey")).toBeVisible();
    await expect(page.getByLabel("Edit profile")).toHaveAttribute(
      "href",
      MEMBER_SETTINGS_PATH,
    );

    await page.goto("/settings");
    await expect(page).toHaveURL(routeURL(MEMBER_SETTINGS_PATH));
    await expect(
      page.getByRole("heading", { name: "Edit member profile" }),
    ).toBeVisible();

    await page.goto("/settings/profile");
    await expect(page).toHaveURL(routeURL(MEMBER_SETTINGS_PATH));
  });

  test("protects member settings and routes authenticated non-members to signup", async ({
    page,
  }) => {
    await page.goto(MEMBER_SETTINGS_PATH);
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: "Edit member profile" }),
    ).toHaveCount(0);

    await signInAs(page, NO_MEMBER_USER_ID, MEMBER_SETTINGS_PATH);
    await expect(page).toHaveURL(routeURL(`/form/${MEMBER_SIGNUP_FORM_SLUG}`));
    await expect(
      page.getByRole("heading", { name: "Build your Knight Hacks profile." }),
    ).toBeVisible();
  });

  test("prefills settings from Member instead of stale FormResponse data", async ({
    page,
  }) => {
    await signInAs(page, EDIT_USER_ID, MEMBER_SETTINGS_PATH);

    await expect(page.getByPlaceholder("Lenny")).toHaveValue("Casey");
    await expect(page.getByPlaceholder("tk@knighthacks.org")).toHaveValue(
      "blade-edit-member@example.test",
    );
    await expect(
      page.getByPlaceholder("Builder, designer, first-time hacker"),
    ).toHaveValue("Seeded Guild tagline");
    await expect(page.getByText("Stale tagline")).toHaveCount(0);
    await expect(page.getByText("Code of Conduct")).toHaveCount(0);
  });

  test("saves editable member fields, syncs the signup response, and updates dashboard", async ({
    page,
  }) => {
    await signInAs(page, EDIT_USER_ID);
    await page.getByLabel("Edit profile").click();
    await expect(page).toHaveURL(routeURL(MEMBER_SETTINGS_PATH));

    await fillProfileEdits(page);
    await expect(
      page.getByText("You have unsaved profile changes."),
    ).toBeVisible();
    await saveProfile(page);

    const member = await getMember(EDIT_USER_ID);
    const response = await getSignupResponse(EDIT_USER_ID);

    expect(member).toMatchObject({
      about: "Updated Guild bio from settings.",
      company: "Forge Labs",
      discordUser: "Blade Edit Member",
      email: "blade-edit-updated@example.test",
      firstName: "Riley",
      gradDate: "2028-05-02",
      guildProfileVisible: false,
      phoneNumber: "321-555-0203",
      tagline: "Updated Guild tagline",
      websiteUrl: "https://dvidal.dev",
    });
    expect(response?.responseData).toMatchObject({
      about: "Updated Guild bio from settings.",
      codeOfConductAccepted: false,
      email: "blade-edit-updated@example.test",
      firstName: "Riley",
      gradYear: 2028,
      guildProfileVisible: false,
    });

    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(routeURL(MEMBER_DASHBOARD_PATH));
    await expect(page.getByText("Welcome, Riley")).toBeVisible();
    await expect(page.getByText("Updated Guild tagline")).toBeVisible();
    await expect(page.getByText("Private")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Welcome, Riley")).toBeVisible();
  });

  test("backfills a missing signup response for legacy members", async ({
    page,
  }) => {
    await expect.poll(() => getSignupResponse(BACKFILL_USER_ID)).toBeNull();
    await signInAs(page, BACKFILL_USER_ID, MEMBER_SETTINGS_PATH);

    await page
      .getByPlaceholder("Builder, designer, first-time hacker")
      .fill("Backfilled Guild tagline");
    await page
      .getByPlaceholder("tk@knighthacks.org")
      .fill("blade-backfill-updated@example.test");
    await saveProfile(page);

    const member = await getMember(BACKFILL_USER_ID);
    const response = await getSignupResponse(BACKFILL_USER_ID);

    expect(member).toMatchObject({
      email: "blade-backfill-updated@example.test",
      tagline: "Backfilled Guild tagline",
    });
    expect(response?.responseData).toMatchObject({
      codeOfConductAccepted: true,
      email: "blade-backfill-updated@example.test",
      firstName: "Bailey",
      tagline: "Backfilled Guild tagline",
    });
  });

  test("keeps required validation, reset, and dirty navigation behavior on settings", async ({
    page,
  }) => {
    await signInAs(page, EDIT_USER_ID, MEMBER_SETTINGS_PATH);

    await page.getByPlaceholder("Lenny").fill("");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("First name is required.")).toBeVisible();
    await expect(page).toHaveURL(routeURL(MEMBER_SETTINGS_PATH));
    await expect
      .poll(async () => (await getMember(EDIT_USER_ID))?.firstName)
      .toBe("Casey");

    await page.getByPlaceholder("Lenny").fill("Unsaved");
    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(
      page.getByRole("heading", { name: "Leave with unsaved changes?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page).toHaveURL(routeURL(MEMBER_SETTINGS_PATH));
    await expect(page.getByPlaceholder("Lenny")).toHaveValue("Unsaved");

    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByPlaceholder("Lenny")).toHaveValue("Casey");
    await expect(
      page.getByRole("button", { name: "Save changes" }),
    ).toBeDisabled();
  });

  test("rejects duplicate email or phone updates safely", async ({ page }) => {
    await signInAs(page, EDIT_USER_ID, MEMBER_SETTINGS_PATH);

    await page
      .getByPlaceholder("tk@knighthacks.org")
      .fill("blade-duplicate-member@example.test");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(
      page.getByText(
        "A member profile with that email or phone number already exists.",
      ),
    ).toBeVisible();
    await expect
      .poll(async () => (await getMember(EDIT_USER_ID))?.email)
      .toBe("blade-edit-member@example.test");
  });

  test("exposes immediate resume and profile-picture uploads on settings", async ({
    page,
  }) => {
    await signInAs(page, EDIT_USER_ID, MEMBER_SETTINGS_PATH);

    await page
      .locator('input[accept="application/pdf,.pdf"]')
      .setInputFiles(pdfPayload);
    await expect(
      page.getByTitle("blade-settings-resume.pdf preview"),
    ).toBeVisible();
    await expect
      .poll(async () => (await getMember(EDIT_USER_ID))?.resumeUrl)
      .toContain(EDIT_USER_ID);

    await page
      .locator('input[accept="image/jpeg,image/png,image/gif,image/webp"]')
      .setInputFiles(pngPayload);
    await expect(
      page.getByAltText("Casey Member profile picture"),
    ).toBeVisible();
    await expect
      .poll(async () => (await getMember(EDIT_USER_ID))?.profilePictureUrl)
      .toContain(EDIT_USER_ID);
  });

  test("deletes the member profile, signup response, auth user, and session", async ({
    page,
  }) => {
    await signInAs(page, EDIT_USER_ID, MEMBER_SETTINGS_PATH);

    await page.getByRole("button", { name: "Delete profile" }).click();
    await expect(
      page.getByRole("heading", { name: "Delete member profile?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete my profile" }).click();

    await expect(page).toHaveURL(routeURL("/"));
    await expect.poll(() => getMember(EDIT_USER_ID)).toBeNull();
    await expect.poll(() => getSignupResponse(EDIT_USER_ID)).toBeNull();
    await expect.poll(() => getUser(EDIT_USER_ID)).toBeNull();

    const e2eCookie = (await page.context().cookies()).find(
      (cookie) => cookie.name === "blade-e2e-user-id",
    );
    expect(e2eCookie).toBeUndefined();

    await page.goto(MEMBER_DASHBOARD_PATH);
    await expect(page).toHaveURL(routeURL("/"));
    await expect(page.getByText("Welcome, Casey")).toHaveCount(0);
  });
});
