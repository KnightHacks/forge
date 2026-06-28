import { readFile } from "node:fs/promises";
import type { Page } from "playwright/test";
import { expect, test } from "playwright/test";

import type { InsertMember } from "@forge/db/schemas/knight-hacks";
import { PERMISSIONS } from "@forge/consts";
import { and, eq, inArray } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, Session, User } from "@forge/db/schemas/auth";
import {
  DuesPayment,
  FormResponse,
  FormsSchemas,
  Hacker,
  Member,
} from "@forge/db/schemas/knight-hacks";
import {
  ADMIN_MEMBER_DELETE_CONFIRMATION,
  ADMIN_MEMBER_DUES_INVALIDATION_CONFIRMATION,
  ADMIN_MEMBER_DUES_SECOND_CONFIRMATION,
  getDuesAcademicYear,
  MEMBER_DASHBOARD_PATH,
  MEMBER_SIGNUP_FORM_ID,
  MEMBER_SIGNUP_FORM_SLUG,
  memberSignupFormData,
  memberSignupFormJsonSchema,
} from "@forge/validators";

const ADMIN_PATH = "/admin/members";
const READER_USER_ID = "00000000-0000-4000-8000-000000000601";
const EDITOR_USER_ID = "00000000-0000-4000-8000-000000000602";
const OFFICER_USER_ID = "00000000-0000-4000-8000-000000000603";
const UNAUTHORIZED_USER_ID = "00000000-0000-4000-8000-000000000604";
const READER_ROLE_ID = "00000000-0000-4000-8000-000000000651";
const EDITOR_ROLE_ID = "00000000-0000-4000-8000-000000000652";
const OFFICER_ROLE_ID = "00000000-0000-4000-8000-000000000653";
const CLUB_DATA_ROLE_ID = "00000000-0000-4000-8000-000000000654";
const ALICE_USER_ID = "00000000-0000-4000-8000-000000000610";
const ALICE_MEMBER_ID = "00000000-0000-4000-8000-000000000710";
const BOB_MEMBER_ID = "00000000-0000-4000-8000-000000000711";
const CHARLIE_MEMBER_ID = "00000000-0000-4000-8000-000000000712";

const adminUsers = [
  {
    discordUserId: "admin-reader-e2e",
    email: "admin-reader-e2e@example.test",
    id: READER_USER_ID,
    name: "Admin Reader",
  },
  {
    discordUserId: "admin-editor-e2e",
    email: "admin-editor-e2e@example.test",
    id: EDITOR_USER_ID,
    name: "Admin Editor",
  },
  {
    discordUserId: "admin-officer-e2e",
    email: "admin-officer-e2e@example.test",
    id: OFFICER_USER_ID,
    name: "Admin Officer",
  },
  {
    discordUserId: "admin-club-data-e2e",
    email: "admin-club-data-e2e@example.test",
    id: UNAUTHORIZED_USER_ID,
    name: "Club Data Reader",
  },
] as const;

const targetUsers = Array.from({ length: 30 }, (_, index) => {
  const suffix = 610 + index;
  return {
    discordUserId: `admin-target-${index.toString().padStart(2, "0")}`,
    email: `admin-target-${index.toString().padStart(2, "0")}@example.test`,
    id: `00000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`,
    name: `Admin Target ${index.toString().padStart(2, "0")}`,
  };
});

const roleIds = [
  READER_ROLE_ID,
  EDITOR_ROLE_ID,
  OFFICER_ROLE_ID,
  CLUB_DATA_ROLE_ID,
];
const testUserIds = [
  ...adminUsers.map(({ id }) => id),
  ...targetUsers.map(({ id }) => id),
];
const pngPayload = {
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64",
  ),
  mimeType: "image/png",
  name: "admin-member-avatar.png",
};
const pdfPayload = {
  buffer: Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n"),
  mimeType: "application/pdf",
  name: "admin-member-resume.pdf",
};

function permissionBitstring(...keys: PERMISSIONS.PermissionKey[]) {
  const maxIndex = Math.max(
    ...Object.values(PERMISSIONS.PERMISSION_DATA).map(({ idx }) => idx),
  );
  const bits = Array.from({ length: maxIndex + 1 }, () => "0");
  for (const key of keys) {
    const permission = PERMISSIONS.PERMISSION_DATA[key];
    if (!permission) throw new Error(`Unknown permission ${key}`);
    bits[permission.idx] = "1";
  }
  return bits.join("");
}

function memberValues(index: number): InsertMember {
  const user = targetUsers[index];
  if (!user) throw new Error(`Missing target user ${index}`);
  const names = [
    ["Alice", "Archive"],
    ["Bob", "Builder"],
    ["Charlie", "Circuit"],
  ] as const;
  const [firstName, lastName] = names[index] ?? ["Member", `Number ${index}`];
  const day = Math.max(1, 27 - index);

  return {
    about: `Member fixture ${index}`,
    age: 24,
    company: index === 0 ? "NVIDIA" : index === 1 ? "Knight Hacks" : null,
    dateCreated: `2026-06-${String(day).padStart(2, "0")}`,
    discordUser: user.discordUserId,
    dob: "2001-02-03",
    email: user.email,
    firstName,
    gender: index === 0 ? "Woman" : "Prefer not to answer",
    githubProfileUrl: "https://github.com/knighthacks",
    gradDate: index === 0 ? "2027-05-02" : "2028-12-15",
    guildProfileVisible: index % 2 === 0,
    id: `00000000-0000-4000-8000-${String(710 + index).padStart(12, "0")}`,
    lastName,
    levelOfStudy: "Undergraduate University (3+ year)",
    linkedinProfileUrl: "https://www.linkedin.com/company/knight-hacks",
    major: "Computer Science",
    phoneNumber: `407-555-${String(1000 + index)}`,
    points: index,
    profilePictureUrl: null,
    raceOrEthnicity: "Prefer not to answer",
    resumeUrl: null,
    school:
      index === 2 ? "University of Florida" : "University of Central Florida",
    shirtSize: "M",
    tagline: `Fixture member ${index}`,
    timeCreated: `${String(index % 24).padStart(2, "0")}:00:00`,
    userId: user.id,
    websiteUrl: "https://knighthacks.org",
  };
}

const aliceResponseData = {
  about: "Member fixture 0",
  codeOfConductAccepted: false,
  company: "NVIDIA",
  dob: "2001-02-03",
  email: targetUsers[0]?.email,
  firstName: "Alice",
  gender: "Woman",
  githubProfileUrl: "https://github.com/knighthacks",
  gradTerm: "Spring",
  gradYear: 2027,
  guildProfileVisible: true,
  lastName: "Archive",
  levelOfStudy: "Undergraduate University (3+ year)",
  linkedinProfileUrl: "https://www.linkedin.com/company/knight-hacks",
  major: "Computer Science",
  phoneNumber: "407-555-1000",
  profilePictureUrl: "",
  raceOrEthnicity: "Prefer not to answer",
  resumeUrl: "",
  school: "University of Central Florida",
  shirtSize: "M",
  tagline: "Fixture member 0",
  websiteUrl: "https://knighthacks.org",
};

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

async function cleanupE2EData() {
  await db.delete(Session).where(inArray(Session.userId, testUserIds));
  await db
    .delete(FormResponse)
    .where(inArray(FormResponse.userId, testUserIds));
  await db.delete(Hacker).where(inArray(Hacker.userId, testUserIds));
  await db.delete(Member).where(inArray(Member.userId, testUserIds));
  await db.delete(Permissions).where(inArray(Permissions.userId, testUserIds));
  await db.delete(User).where(inArray(User.id, testUserIds));
  await db.delete(Roles).where(inArray(Roles.id, roleIds));
}

async function seedE2EData() {
  await cleanupE2EData();
  await ensureSignupForm();

  await db.insert(Roles).values([
    {
      discordRoleId: "admin-reader-role-e2e",
      id: READER_ROLE_ID,
      name: "Admin reader E2E",
      permissions: permissionBitstring("READ_MEMBERS"),
    },
    {
      discordRoleId: "admin-editor-role-e2e",
      id: EDITOR_ROLE_ID,
      name: "Admin editor E2E",
      permissions: permissionBitstring("EDIT_MEMBERS"),
    },
    {
      discordRoleId: "admin-officer-role-e2e",
      id: OFFICER_ROLE_ID,
      name: "Admin officer E2E",
      permissions: permissionBitstring("IS_OFFICER"),
    },
    {
      discordRoleId: "admin-club-data-role-e2e",
      id: CLUB_DATA_ROLE_ID,
      name: "Club data E2E",
      permissions: permissionBitstring("READ_CLUB_DATA"),
    },
  ]);

  await db.insert(User).values(
    [...adminUsers, ...targetUsers].map((user) => ({
      ...user,
      emailVerified: true,
      image: null,
    })),
  );
  await db.insert(Permissions).values([
    { roleId: READER_ROLE_ID, userId: READER_USER_ID },
    { roleId: EDITOR_ROLE_ID, userId: EDITOR_USER_ID },
    { roleId: OFFICER_ROLE_ID, userId: OFFICER_USER_ID },
    { roleId: CLUB_DATA_ROLE_ID, userId: UNAUTHORIZED_USER_ID },
    { roleId: READER_ROLE_ID, userId: ALICE_USER_ID },
  ]);

  await db.insert(Member).values([
    ...targetUsers.map((_, index) => memberValues(index)),
    {
      ...memberValues(29),
      dateCreated: "2026-05-01",
      discordUser: "admin-club-data-member-e2e",
      email: "club-data-member-e2e@example.test",
      firstName: "Club",
      id: "00000000-0000-4000-8000-000000000799",
      lastName: "Data",
      phoneNumber: "407-555-1999",
      userId: UNAUTHORIZED_USER_ID,
    },
  ]);

  await db.insert(FormResponse).values({
    form: MEMBER_SIGNUP_FORM_ID,
    responseData: aliceResponseData,
    userId: ALICE_USER_ID,
  });
  await db.insert(Hacker).values({
    age: 24,
    agreesToMLHCodeOfConduct: true,
    agreesToMLHDataSharing: true,
    agreesToReceiveEmailsFromMLH: true,
    discordUser: "admin-target-00",
    dob: "2001-02-03",
    email: "admin-hacker-alice@example.test",
    firstName: "Alice",
    gender: "Woman",
    gradDate: "2027-05-02",
    isFirstTime: false,
    lastName: "Archive",
    levelOfStudy: "Undergraduate University (3+ year)",
    major: "Computer Science",
    phoneNumber: "407-555-2999",
    raceOrEthnicity: "Prefer not to answer",
    resumeUrl: null,
    school: "University of Central Florida",
    shirtSize: "M",
    survey1: "Build useful things.",
    survey2: "Learn with friends.",
    userId: ALICE_USER_ID,
  });
  await db.insert(Session).values({
    expires: new Date("2030-01-01T00:00:00Z"),
    id: "admin-alice-session-e2e",
    sessionToken: "admin-alice-session-token-e2e",
    userId: ALICE_USER_ID,
  });

  const currentYear = getDuesAcademicYear(new Date()).startYear;
  await db.insert(DuesPayment).values([
    {
      active: true,
      amount: 2500,
      id: "00000000-0000-4000-8000-000000000810",
      memberId: ALICE_MEMBER_ID,
      paymentDate: new Date("2026-06-01T12:00:00Z"),
      stripePaymentIntentId: "pi_admin_alice_e2e",
      year: currentYear,
    },
    {
      active: true,
      amount: 2600,
      id: "00000000-0000-4000-8000-000000000812",
      memberId: CHARLIE_MEMBER_ID,
      paymentDate: new Date("2026-06-02T12:00:00Z"),
      stripePaymentIntentId: "pi_admin_charlie_e2e",
      year: currentYear,
    },
    {
      active: true,
      amount: 2500,
      id: "00000000-0000-4000-8000-000000000813",
      memberId: CHARLIE_MEMBER_ID,
      paymentDate: new Date("2026-06-03T12:00:00Z"),
      stripePaymentIntentId: null,
      year: currentYear + 1,
    },
    {
      active: true,
      amount: 2500,
      id: "00000000-0000-4000-8000-000000000811",
      memberId: BOB_MEMBER_ID,
      paymentDate: new Date("2025-06-02T12:00:00Z"),
      stripePaymentIntentId: "pi_admin_bob_history_e2e",
      year: currentYear - 1,
    },
  ]);
}

async function signInAs(page: Page, userId: string, callbackURL = ADMIN_PATH) {
  await page.goto(
    `/api/e2e/signin?userId=${encodeURIComponent(userId)}&callbackURL=${encodeURIComponent(callbackURL)}`,
  );
}

async function getAliceMember() {
  return (
    (await db.query.Member.findFirst({
      where: eq(Member.id, ALICE_MEMBER_ID),
    })) ?? null
  );
}

test.describe("admin member dashboard", () => {
  test.describe.configure({ mode: "serial" });
  let existingDuesSnapshot: { active: boolean; id: string }[] = [];

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    existingDuesSnapshot = await db
      .select({ active: DuesPayment.active, id: DuesPayment.id })
      .from(DuesPayment);
    await seedE2EData();
  });

  test.afterEach(async () => {
    for (const row of existingDuesSnapshot) {
      await db
        .update(DuesPayment)
        .set({ active: row.active })
        .where(eq(DuesPayment.id, row.id));
    }
  });

  test.afterAll(async () => {
    await cleanupE2EData();
  });

  test("gates member PII and allows readers without their own Member profile", async ({
    browser,
    page,
  }) => {
    await page.goto(ADMIN_PATH);
    await expect(page).toHaveURL(/\/$/);

    await signInAs(page, UNAUTHORIZED_USER_ID);
    await expect(page).toHaveURL(new RegExp(`${MEMBER_DASHBOARD_PATH}$`));
    await expect(page.getByRole("link", { name: /member admin/i })).toHaveCount(
      0,
    );

    await signInAs(page, READER_USER_ID);
    await expect(page).toHaveURL(new RegExp(`${ADMIN_PATH}$`));
    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
    await expect(page.getByText("Alice Archive").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Invalidate all dues" }),
    ).toHaveCount(0);

    await page.getByRole("textbox", { name: "Search members" }).fill("alce");
    await expect(page).toHaveURL(/q=alce/);
    await page.getByRole("button", { name: "View" }).first().click();
    await expect(page).toHaveURL(/member=[0-9a-f-]{36}/);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit member" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: "Grant dues" })).toHaveCount(
      0,
    );
    const shareableURL = page.url();
    await page.reload();
    await expect(page).toHaveURL(shareableURL);
    const desktopDialog = page.getByRole("dialog");
    await expect(desktopDialog).toBeVisible();
    await expect
      .poll(() =>
        desktopDialog.evaluate((element) => getComputedStyle(element).opacity),
      )
      .toBe("1");
    await page.screenshot({
      path: ".playwright-results/admin-member-detail-desktop.png",
    });
    await desktopDialog.screenshot({
      path: ".playwright-results/admin-member-detail-desktop-dialog.png",
    });

    const mobileContext = await browser.newContext({
      viewport: { height: 740, width: 320 },
    });
    const mobilePage = await mobileContext.newPage();
    await signInAs(mobilePage, EDITOR_USER_ID);
    await mobilePage
      .getByRole("button", { name: "Open navigation menu" })
      .click();
    await expect(
      mobilePage.getByRole("menuitem", { name: "Dashboard" }),
    ).toBeVisible();
    await expect(
      mobilePage.getByRole("menuitem", { name: "Members" }),
    ).toBeVisible();
    const mobileNavigationMenu = mobilePage.getByRole("menu");
    await expect
      .poll(() =>
        mobileNavigationMenu.evaluate(
          (element) => getComputedStyle(element).opacity,
        ),
      )
      .toBe("1");
    await mobilePage.screenshot({
      path: ".playwright-results/admin-members-mobile-menu.png",
    });
    await mobilePage.keyboard.press("Escape");
    await mobilePage
      .getByRole("textbox", { name: "Search members" })
      .fill("alce");
    await expect(mobilePage).toHaveURL(/q=alce/);
    const mobileMember = mobilePage.getByRole("button", {
      name: /^Alice Archive/,
    });
    await expect(mobileMember).toBeVisible();
    await expect(mobilePage.locator("table")).not.toBeVisible();
    expect(
      await mobilePage.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
    await mobilePage.screenshot({
      path: ".playwright-results/admin-members-mobile-list.png",
    });
    await mobileMember.click();
    const mobileDialog = mobilePage.getByRole("dialog");
    await expect(mobileDialog).toBeVisible();
    await expect(
      mobileDialog.getByRole("heading", { name: "Membership & dues" }),
    ).toBeVisible();
    await expect(
      mobileDialog.getByRole("heading", { name: "Contact & identity" }),
    ).toBeVisible();
    await expect(
      mobileDialog.getByRole("heading", { name: "Academics & work" }),
    ).toBeVisible();
    await expect(
      mobileDialog.getByRole("heading", { name: "Guild profile" }),
    ).toBeVisible();
    expect(
      await mobilePage.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
    await expect
      .poll(() =>
        mobileDialog.evaluate((element) => getComputedStyle(element).opacity),
      )
      .toBe("1");
    await mobilePage.screenshot({
      path: ".playwright-results/admin-members-mobile.png",
    });
    await mobileContext.close();

    await signInAs(page, ALICE_USER_ID, "/dashboard");
    await expect(page).toHaveURL(new RegExp(`${MEMBER_DASHBOARD_PATH}$`));
    await expect(page.getByTestId("admin-navigation-rail")).toBeVisible();
    const dashboardHeader = await page
      .getByTestId("blade-shell-header")
      .boundingBox();
    const dashboardRailHeader = await page
      .getByTestId("admin-navigation-rail-header")
      .boundingBox();
    expect(dashboardRailHeader?.y).toBe(dashboardHeader?.y);
    expect(
      (dashboardRailHeader?.y ?? 0) + (dashboardRailHeader?.height ?? 0),
    ).toBe((dashboardHeader?.y ?? 0) + (dashboardHeader?.height ?? 0));
    await page.getByRole("link", { name: "Members", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${ADMIN_PATH}$`));
    await expect(page.getByTestId("admin-navigation-rail")).toBeVisible();
    const adminHeader = await page
      .getByTestId("blade-shell-header")
      .boundingBox();
    expect(adminHeader?.x).toBe(dashboardHeader?.x);
    expect(adminHeader?.height).toBe(dashboardHeader?.height);
  });

  test("searches fuzzily, persists table state, paginates, filters, sorts, and exports every match", async ({
    page,
  }) => {
    await signInAs(page, READER_USER_ID);

    const search = page.getByRole("textbox", { name: "Search members" });
    await search.fill("alce");
    await expect(page).toHaveURL(/q=alce/);
    await expect(page.getByText("Alice Archive").first()).toBeVisible();
    await expect(page.getByText("Bob Builder")).toHaveCount(0);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /^members-\d{4}-\d{2}-\d{2}\.csv$/,
    );
    const downloadPath = await download.path();
    if (!downloadPath) throw new Error("CSV download did not produce a file.");
    const csv = await readFile(downloadPath, "utf8");
    expect(csv).toContain("Alice");
    expect(csv).not.toContain("Bob Builder");
    expect(csv).not.toContain(ALICE_USER_ID);

    await search.fill("admin target");
    await expect(page).toHaveURL(/q=admin(?:\+|%20)target/);
    await expect(page.getByText("Showing 1-25 of 30 members")).toBeVisible();
    const allPagesDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    const allPagesDownload = await allPagesDownloadPromise;
    const allPagesPath = await allPagesDownload.path();
    if (!allPagesPath) throw new Error("All-page CSV did not produce a file.");
    const allPagesCsv = await readFile(allPagesPath, "utf8");
    expect(allPagesCsv).toContain("admin-target-29@example.test");

    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText("Page 2 of 2")).toBeVisible();

    await page.getByRole("combobox", { name: "Rows per page" }).click();
    for (const size of [25, 50, 100, 250, 500]) {
      await expect(
        page.getByRole("option", { name: `${size} rows`, exact: true }),
      ).toBeVisible();
    }
    await page.getByRole("option", { name: "50 rows", exact: true }).click();
    await expect(page).toHaveURL(/pageSize=50/);
    await expect(page).not.toHaveURL(/page=2/);

    await page.getByRole("button", { name: /Name/ }).click();
    await expect(page).toHaveURL(/sort=name/);
    await expect(page).toHaveURL(/direction=asc/);

    await page.getByRole("button", { name: "Filters" }).click();
    await expect(
      page.getByRole("dialog", { name: "Filter members" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Any dues status" }).click();
    await page.getByRole("option", { name: "paid", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Any school" }).click();
    await page
      .getByRole("option", {
        name: "University of Central Florida",
        exact: true,
      })
      .click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/dues=paid/);
    await expect(page).toHaveURL(
      /school=University(?:\+|%20)of(?:\+|%20)Central(?:\+|%20)Florida/,
    );
    await expect(page.getByText("Alice Archive").first()).toBeVisible();
    await expect(page.getByText("Charlie Circuit")).toHaveCount(0);
    await expect(page.getByText("Dues: paid")).toBeVisible();
    await page
      .getByRole("button", { name: /Remove filter/ })
      .first()
      .click();
    await expect(page).not.toHaveURL(/dues=paid/);

    const orFilters = new URLSearchParams();
    orFilters.set("q", "admin target");
    orFilters.set("dues", "paid");
    orFilters.append("school", "University of Central Florida");
    orFilters.append("school", "University of Florida");
    await page.goto(`${ADMIN_PATH}?${orFilters.toString()}`);
    await expect(page.getByText("Alice Archive").first()).toBeVisible();
    await expect(page.getByText("Charlie Circuit").first()).toBeVisible();
    orFilters.set("gender", "Woman");
    await page.goto(`${ADMIN_PATH}?${orFilters.toString()}`);
    await expect(page.getByText("Alice Archive").first()).toBeVisible();
    await expect(page.getByText("Charlie Circuit")).toHaveCount(0);

    await page.screenshot({
      path: ".playwright-results/admin-members-desktop.png",
    });
  });

  test("edits the selected profile, manages files and dues, and deletes only membership data", async ({
    page,
  }) => {
    await signInAs(page, EDITOR_USER_ID);
    await page
      .getByRole("button", { name: "Revoke dues for Charlie Circuit" })
      .click();
    await expect(page.getByText("Dues revoked.")).toBeVisible();
    const toastColors = await page
      .locator("[data-sonner-toast]")
      .filter({ hasText: "Dues revoked." })
      .evaluate((toast) => {
        const cardProbe = document.createElement("div");
        cardProbe.className = "bg-card";
        document.body.append(cardProbe);
        const colors = {
          card: getComputedStyle(cardProbe).backgroundColor,
          toast: getComputedStyle(toast).backgroundColor,
        };
        cardProbe.remove();
        return colors;
      });
    expect(toastColors.toast).toBe(toastColors.card);
    await expect
      .poll(async () => {
        const rows = await db.query.DuesPayment.findMany({
          where: eq(DuesPayment.memberId, CHARLIE_MEMBER_ID),
        });
        return rows.filter((row) => row.active).length;
      })
      .toBe(0);
    await page
      .getByRole("button", { name: "Grant dues for Charlie Circuit" })
      .click();
    await expect(page.getByText("Dues granted.")).toBeVisible();
    await expect
      .poll(async () => {
        const rows = await db.query.DuesPayment.findMany({
          where: eq(DuesPayment.memberId, CHARLIE_MEMBER_ID),
        });
        return rows.filter((row) => row.active).length;
      })
      .toBe(1);

    await page.goto(`${ADMIN_PATH}?member=${ALICE_MEMBER_ID}`);
    await expect(page).toHaveURL(
      new RegExp(`${ADMIN_PATH}\\?member=${ALICE_MEMBER_ID}$`),
    );
    const editorDialog = page.getByRole("dialog");
    await expect(editorDialog).toBeVisible();
    const editorHeader = await editorDialog
      .getByTestId("member-detail-header")
      .boundingBox();
    const editMemberButton = page.getByRole("button", {
      name: "Edit member",
    });
    const editMemberButtonBox = await editMemberButton.boundingBox();
    expect(editMemberButtonBox?.y).toBeGreaterThanOrEqual(editorHeader?.y ?? 0);
    expect(
      (editMemberButtonBox?.y ?? 0) + (editMemberButtonBox?.height ?? 0),
    ).toBeLessThanOrEqual((editorHeader?.y ?? 0) + (editorHeader?.height ?? 0));
    await editorDialog.screenshot({
      path: ".playwright-results/admin-member-editor-desktop.png",
    });
    await editMemberButton.click();
    await page.getByPlaceholder("Lenny").fill("Alicia");
    await page
      .getByPlaceholder("tk@knighthacks.org")
      .fill("alicia-admin-e2e@example.test");
    await page.locator("#admin-member-points").fill("77");
    await page.getByRole("button", { name: "Save member" }).click();
    await expect(page.getByText("Member profile saved.")).toBeVisible();

    await expect
      .poll(async () => (await getAliceMember())?.firstName)
      .toBe("Alicia");
    await expect.poll(async () => (await getAliceMember())?.points).toBe(77);
    const response = await db.query.FormResponse.findFirst({
      where: and(
        eq(FormResponse.userId, ALICE_USER_ID),
        eq(FormResponse.form, MEMBER_SIGNUP_FORM_ID),
      ),
    });
    expect(response?.responseData).toMatchObject({
      codeOfConductAccepted: false,
      email: "alicia-admin-e2e@example.test",
      firstName: "Alicia",
    });

    await page
      .locator('input[accept="image/jpeg,image/png,image/gif,image/webp"]')
      .setInputFiles(pngPayload);
    await expect(page.getByText("Profile picture saved.")).toBeVisible();
    await expect
      .poll(async () => (await getAliceMember())?.profilePictureUrl)
      .toContain(ALICE_USER_ID);

    await page
      .locator('input[accept="application/pdf,.pdf"]')
      .setInputFiles(pdfPayload);
    await expect(page.getByText("Resume saved.")).toBeVisible();
    const sharedResume = (await getAliceMember())?.resumeUrl;
    expect(sharedResume).toContain(ALICE_USER_ID);
    await db
      .update(Hacker)
      .set({ resumeUrl: sharedResume })
      .where(eq(Hacker.userId, ALICE_USER_ID));
    await page.getByRole("button", { name: "Remove resume" }).click();
    await expect(page.getByText("Resume removed.")).toBeVisible();
    await expect
      .poll(async () => (await getAliceMember())?.resumeUrl)
      .toBeNull();
    expect(
      (
        await db.query.Hacker.findFirst({
          where: eq(Hacker.userId, ALICE_USER_ID),
        })
      )?.resumeUrl,
    ).toBe(sharedResume);
    await page.getByRole("button", { name: "Remove profile picture" }).click();
    await expect(page.getByText("Profile picture removed.")).toBeVisible();

    await page.getByRole("button", { name: "Revoke dues" }).click();
    await expect(page.getByText("Dues status updated.")).toBeVisible();
    const originalDues = await db.query.DuesPayment.findFirst({
      where: eq(DuesPayment.memberId, ALICE_MEMBER_ID),
    });
    expect(originalDues?.active).toBe(false);
    await expect(
      page.getByRole("button", { name: "Grant dues" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Grant dues" }).click();
    await expect
      .poll(async () => {
        const rows = await db.query.DuesPayment.findMany({
          where: eq(DuesPayment.memberId, ALICE_MEMBER_ID),
        });
        return rows.find((row) => row.active) ?? null;
      })
      .toMatchObject({
        active: true,
        amount: 2500,
        stripePaymentIntentId: null,
      });
    const grantedDues = (
      await db.query.DuesPayment.findMany({
        where: eq(DuesPayment.memberId, ALICE_MEMBER_ID),
      })
    ).find((row) => row.active);
    expect(grantedDues?.id).not.toBe(originalDues?.id);

    await expect(
      page.getByRole("button", { name: "Revoke dues" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Revoke dues" }).click();
    await expect
      .poll(async () =>
        db.query.DuesPayment.findFirst({
          where: eq(DuesPayment.id, grantedDues?.id ?? ""),
        }),
      )
      .toMatchObject({ active: false });
    await expect(
      page.getByRole("button", { name: "Grant dues" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Grant dues" }).click();
    await expect
      .poll(async () =>
        db.query.DuesPayment.findFirst({
          where: eq(DuesPayment.id, grantedDues?.id ?? ""),
        }),
      )
      .toMatchObject({
        active: true,
        amount: grantedDues?.amount,
        id: grantedDues?.id,
        paymentDate: grantedDues?.paymentDate,
        stripePaymentIntentId: grantedDues?.stripePaymentIntentId,
      });

    await page.getByRole("button", { name: "Delete member" }).click();
    await page
      .getByLabel(/Type I am absolutely sure/)
      .fill(ADMIN_MEMBER_DELETE_CONFIRMATION);
    await page.getByRole("button", { name: "Delete Member profile" }).click();
    await expect(page.getByText("Member profile deleted.")).toBeVisible();
    await expect.poll(getAliceMember).toBeNull();
    expect(
      await db.query.User.findFirst({ where: eq(User.id, ALICE_USER_ID) }),
    ).not.toBeNull();
    expect(
      await db.query.Permissions.findFirst({
        where: eq(Permissions.userId, ALICE_USER_ID),
      }),
    ).not.toBeNull();
    expect(
      await db.query.Session.findFirst({
        where: eq(Session.userId, ALICE_USER_ID),
      }),
    ).not.toBeNull();
    expect(
      await db.query.Hacker.findFirst({
        where: eq(Hacker.userId, ALICE_USER_ID),
      }),
    ).not.toBeNull();
    expect(
      await db.query.FormResponse.findFirst({
        where: eq(FormResponse.userId, ALICE_USER_ID),
      }),
    ).toBeUndefined();
    expect(
      await db.query.DuesPayment.findFirst({
        where: eq(DuesPayment.memberId, ALICE_MEMBER_ID),
      }),
    ).toBeUndefined();
  });

  test("requires the officer-only three-stage confirmation and invalidates only effective dues", async ({
    page,
  }) => {
    await signInAs(page, OFFICER_USER_ID);
    await page.getByRole("button", { name: "Invalidate all dues" }).click();
    await expect(
      page.getByRole("heading", { name: "Are you sure?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    const second = page.getByRole("textbox", { name: "Second confirmation" });
    expect(
      await second.evaluate((element) => {
        const event = new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
        });
        return !element.dispatchEvent(event);
      }),
    ).toBe(true);
    await expect(second).toHaveValue("");
    await second.pressSequentially(ADMIN_MEMBER_DUES_SECOND_CONFIRMATION);
    await page.getByRole("button", { name: "Continue" }).click();
    const final = page.getByRole("textbox", { name: "Final confirmation" });
    expect(
      await final.evaluate((element) => {
        const event = new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
        });
        return !element.dispatchEvent(event);
      }),
    ).toBe(true);
    await expect(final).toHaveValue("");
    await final.pressSequentially(ADMIN_MEMBER_DUES_INVALIDATION_CONFIRMATION);
    await page
      .getByRole("button", { name: "Invalidate effective dues" })
      .click();
    await expect(
      page.getByText(/Invalidated effective dues for \d+ members?\./),
    ).toBeVisible();

    expect(
      await db.query.DuesPayment.findFirst({
        where: eq(DuesPayment.id, "00000000-0000-4000-8000-000000000810"),
      }),
    ).toMatchObject({ active: false });
    expect(
      await db.query.DuesPayment.findFirst({
        where: eq(DuesPayment.id, "00000000-0000-4000-8000-000000000812"),
      }),
    ).toMatchObject({ active: false });
    expect(
      await db.query.DuesPayment.findFirst({
        where: eq(DuesPayment.id, "00000000-0000-4000-8000-000000000813"),
      }),
    ).toMatchObject({ active: false });
    expect(
      await db.query.DuesPayment.findFirst({
        where: eq(DuesPayment.id, "00000000-0000-4000-8000-000000000811"),
      }),
    ).toMatchObject({ active: true });
  });
});
