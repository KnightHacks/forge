import type { Page } from "playwright/test";
import { expect, test } from "playwright/test";

import { inArray, or } from "@forge/db";
import { db } from "@forge/db/client";
import { User } from "@forge/db/schemas/auth";
import { FormsSchemas, Member } from "@forge/db/schemas/knight-hacks";
import {
  MEMBER_DASHBOARD_PATH,
  MEMBER_SETTINGS_PATH,
  MEMBER_SIGNUP_FORM_ID,
  MEMBER_SIGNUP_FORM_SLUG,
  memberSignupFormData,
  memberSignupFormJsonSchema,
} from "@forge/validators";

const MOBILE_MEMBER_USER_ID = "00000000-0000-4000-8000-000000000301";
const MOBILE_NO_MEMBER_USER_ID = "00000000-0000-4000-8000-000000000302";

const testUsers = [
  {
    discordUserId: "blade-mobile-member",
    email: "blade-mobile-member@example.test",
    id: MOBILE_MEMBER_USER_ID,
    name: "Blade Mobile Member",
  },
  {
    discordUserId: "blade-mobile-no-member",
    email: "blade-mobile-no-member@example.test",
    id: MOBILE_NO_MEMBER_USER_ID,
    name: "Blade Mobile No Member",
  },
];

const testUserIds = testUsers.map((user) => user.id);
const testEmails = testUsers.map((user) => user.email);
const testDiscordIds = testUsers.map((user) => user.discordUserId);

function routeURL(path: string) {
  return new RegExp(`${path.replaceAll("/", "\\/")}$`);
}

async function cleanupE2EData() {
  await db.delete(Member).where(inArray(Member.userId, testUserIds));

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

  await db.insert(Member).values({
    about:
      "This is a long Guild bio for the mobile dashboard. It should stay inside the social profile card, wrap cleanly, and never overlap the company or visibility tiles.",
    age: 24,
    company: "Knight Hacks",
    discordUser: "blade-mobile-member",
    dob: "2000-02-03",
    email: "blade-mobile-member@example.test",
    firstName: "Maya",
    gender: "Prefer not to answer",
    githubProfileUrl: "https://github.com/knighthacks",
    gradDate: "2027-05-02",
    guildProfileVisible: true,
    lastName: "Mobile",
    levelOfStudy: "Undergraduate University (3+ year)",
    linkedinProfileUrl: "https://www.linkedin.com/company/knight-hacks",
    major: "Computer Science",
    phoneNumber: "321-555-0301",
    profilePictureUrl: null,
    raceOrEthnicity: "Prefer not to answer",
    resumeUrl: `${MOBILE_MEMBER_USER_ID}/Resume.pdf`,
    school: "University of Central Florida",
    shirtSize: "M",
    tagline: "Mobile-first member profile",
    userId: MOBILE_MEMBER_USER_ID,
    websiteUrl: "https://knighthacks.org",
  });
}

async function signInAs(
  page: Page,
  userId = MOBILE_MEMBER_USER_ID,
  callbackURL = MEMBER_DASHBOARD_PATH,
) {
  await page.goto(
    `/api/e2e/signin?userId=${encodeURIComponent(
      userId,
    )}&callbackURL=${encodeURIComponent(callbackURL)}`,
  );
}

async function expectWithinViewport(page: Page, selectorName: string) {
  const box = await page
    .getByRole("dialog", { name: selectorName })
    .boundingBox();
  const viewport = page.viewportSize();

  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();

  if (!box || !viewport) return;

  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

test.describe("mobile member experience", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedE2EData();
  });

  test.afterAll(async () => {
    await cleanupE2EData();
  });

  test("shows a lightweight Guild profile on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInAs(page);

    const guildProfile = page.getByRole("region", { name: "Guild profile" });
    const viewport = page.viewportSize();

    await expect(guildProfile).toBeVisible();
    const guildProfileBox = await guildProfile.boundingBox();
    expect(guildProfileBox?.height ?? 0).toBeGreaterThan(
      (viewport?.height ?? 0) * 0.8,
    );
    await expect(
      page.getByRole("region", { name: "Member details" }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Edit profile")).toHaveAttribute(
      "href",
      MEMBER_SETTINGS_PATH,
    );
    await expect(
      page.getByRole("heading", { name: "Welcome, Maya" }),
    ).toHaveCount(0);
    await expect(page.getByText("Mobile-first member profile")).toBeVisible();
    await expect(
      guildProfile.getByRole("group", { name: "Company" }),
    ).toContainText("Knight Hacks");
    await expect(page.getByText("GitHub")).toBeVisible();
    await expect(page.getByText("LinkedIn")).toBeVisible();
    await expect(page.getByText("Portfolio")).toBeVisible();
    await expect(page.getByText("Resume", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "View" })).toBeVisible();
    await expect(page.getByText("PDF resume")).toHaveCount(0);
  });

  test("keeps desktop dashboard order and profile-attached settings", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signInAs(page);

    const guildProfile = page.getByRole("region", { name: "Guild profile" });
    const memberDetails = page.getByRole("region", { name: "Member details" });
    const guildBox = await guildProfile.boundingBox();
    const detailsBox = await memberDetails.boundingBox();

    expect(detailsBox?.x ?? 0).toBeLessThan(guildBox?.x ?? 0);
    await expect(page.getByLabel("Edit profile")).toHaveAttribute(
      "href",
      MEMBER_SETTINGS_PATH,
    );
  });

  test("keeps signup submit at the bottom and required errors reachable on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInAs(
      page,
      MOBILE_NO_MEMBER_USER_ID,
      `/form/${MEMBER_SIGNUP_FORM_SLUG}`,
    );

    const submitButton = page.getByRole("button", {
      name: "Create member profile",
    });

    await expect(submitButton).not.toBeInViewport();
    await submitButton.scrollIntoViewIfNeeded();
    await expect(submitButton).toBeInViewport();

    await submitButton.click();
    await expect(page.getByText("First name is required.")).toBeVisible();
    await expect(
      page.getByText("You must accept the Knight Hacks Code of Conduct."),
    ).toBeVisible();
    await expect(page).toHaveURL(routeURL(`/form/${MEMBER_SIGNUP_FORM_SLUG}`));
  });

  test("keeps settings save sticky and dirty dialog mobile-safe", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInAs(page, MOBILE_MEMBER_USER_ID, MEMBER_SETTINGS_PATH);

    const saveButton = page.getByRole("button", { name: "Save changes" });

    await expect(saveButton).toBeInViewport();
    await page.getByPlaceholder("Lenny").fill("Maya Edited");
    await expect(saveButton).toBeEnabled();
    await expect(
      page.getByText("You have unsaved profile changes."),
    ).toBeVisible();

    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(
      page.getByRole("dialog", { name: "Leave with unsaved changes?" }),
    ).toBeVisible();
    await expectWithinViewport(page, "Leave with unsaved changes?");
  });

  test("fits resume and delete dialogs inside a phone viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInAs(page);

    await page.getByRole("button", { name: "View" }).click();
    await expect(page.getByRole("dialog", { name: "Resume" })).toBeVisible();
    await expectWithinViewport(page, "Resume");
    await page.getByRole("button", { name: "Close" }).click();

    await page.getByLabel("Edit profile").click();
    await expect(page).toHaveURL(routeURL(MEMBER_SETTINGS_PATH));
    await page.getByRole("button", { name: "Delete profile" }).click();
    await expect(
      page.getByRole("dialog", { name: "Delete member profile?" }),
    ).toBeVisible();
    await expectWithinViewport(page, "Delete member profile?");
  });

  test("shows mobile-shaped skeletons before loaded dashboard content", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInAs(page);
    await page.goto(`${MEMBER_DASHBOARD_PATH}?debugLatency=3000`);

    const skeletonProfile = page.getByRole("region", {
      name: "Guild profile loading",
    });
    const viewport = page.viewportSize();

    await expect(
      skeletonProfile.locator(".animate-pulse").first(),
    ).toBeVisible();
    const skeletonProfileBox = await skeletonProfile.boundingBox();
    expect(skeletonProfileBox?.height ?? 0).toBeGreaterThan(
      (viewport?.height ?? 0) * 0.8,
    );
    await expect(page.locator("section").first()).toHaveClass(/gap-4/);
    await expect(page.getByText("Mobile-first member profile")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Welcome, Maya" }),
    ).toHaveCount(0);
  });
});
