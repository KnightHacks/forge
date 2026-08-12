import type { Page } from "playwright/test";
import { expect, test } from "playwright/test";

import { and, eq, inArray, or } from "@forge/db";
import { db } from "@forge/db/client";
import { User } from "@forge/db/schemas/auth";
import {
  DuesConfiguration,
  DuesPayment,
  Member,
} from "@forge/db/schemas/knight-hacks";
import {
  buildDuesAcademicYear,
  getDuesAcademicYear,
  MEMBER_DASHBOARD_PATH,
  MEMBER_SIGNUP_FORM_SLUG,
} from "@forge/validators";

const UNPAID_USER_ID = "00000000-0000-4000-8000-000000000501";
const PAID_USER_ID = "00000000-0000-4000-8000-000000000502";
const NO_MEMBER_USER_ID = "00000000-0000-4000-8000-000000000503";
const UNPAID_MEMBER_ID = "00000000-0000-4000-8000-000000000511";
const PAID_MEMBER_ID = "00000000-0000-4000-8000-000000000512";
const DUES_CONFIGURATION_ID = "global";
let originalPaymentsEnabled: boolean | null = null;

const testUsers = [
  {
    discordUserId: "blade-dues-unpaid",
    email: "blade-dues-unpaid@example.test",
    id: UNPAID_USER_ID,
    name: "Blade Dues Unpaid",
  },
  {
    discordUserId: "blade-dues-paid",
    email: "blade-dues-paid@example.test",
    id: PAID_USER_ID,
    name: "Blade Dues Paid",
  },
  {
    discordUserId: "blade-dues-no-member",
    email: "blade-dues-no-member@example.test",
    id: NO_MEMBER_USER_ID,
    name: "Blade Dues No Member",
  },
];

const testUserIds = testUsers.map((user) => user.id);
const testEmails = testUsers.map((user) => user.email);
const testDiscordIds = testUsers.map((user) => user.discordUserId);
const testMemberIds = [UNPAID_MEMBER_ID, PAID_MEMBER_ID];
const testPhones = ["321-555-0501", "321-555-0502"];

function routeURL(path: string) {
  return new RegExp(`${path.replaceAll("/", "\\/")}$`);
}

function memberValues({
  email,
  firstName,
  id,
  phoneNumber,
  userId,
}: {
  email: string;
  firstName: string;
  id: string;
  phoneNumber: string;
  userId: string;
}) {
  return {
    about: "Seeded Guild bio for dues testing.",
    age: 24,
    company: "Knight Hacks",
    discordUser: "dues-e2e",
    dob: "2000-02-03",
    email,
    firstName,
    gender: "Prefer not to answer" as const,
    githubProfileUrl: "https://github.com/knighthacks",
    gradDate: "2027-05-02",
    guildProfileVisible: true,
    id,
    lastName: "Member",
    levelOfStudy: "Undergraduate University (3+ year)" as const,
    linkedinProfileUrl: "https://www.linkedin.com/company/knight-hacks",
    major: "Computer Science" as const,
    phoneNumber,
    raceOrEthnicity: "Prefer not to answer" as const,
    school: "University of Central Florida" as const,
    shirtSize: "M" as const,
    tagline: "Dues test profile",
    userId,
    websiteUrl: "https://knighthacks.org",
  };
}

async function cleanupE2EData() {
  await db
    .delete(DuesPayment)
    .where(inArray(DuesPayment.memberId, testMemberIds));

  await db
    .delete(Member)
    .where(
      or(
        inArray(Member.id, testMemberIds),
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

async function seedE2EData() {
  await cleanupE2EData();

  await setPaymentAvailability(true);

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
    memberValues({
      email: "blade-dues-unpaid@example.test",
      firstName: "Una",
      id: UNPAID_MEMBER_ID,
      phoneNumber: "321-555-0501",
      userId: UNPAID_USER_ID,
    }),
    memberValues({
      email: "blade-dues-paid@example.test",
      firstName: "Paige",
      id: PAID_MEMBER_ID,
      phoneNumber: "321-555-0502",
      userId: PAID_USER_ID,
    }),
  ]);

  await db.insert(DuesPayment).values({
    active: true,
    amount: 2500,
    memberId: PAID_MEMBER_ID,
    paymentDate: new Date("2026-06-20T12:00:00Z"),
    stripePaymentIntentId: "pi_e2e_paid_seed",
    year: getDuesAcademicYear().startYear,
  });
}

async function setPaymentAvailability(paymentsEnabled: boolean) {
  await db
    .insert(DuesConfiguration)
    .values({ id: DUES_CONFIGURATION_ID, paymentsEnabled })
    .onConflictDoUpdate({
      set: { paymentsEnabled, updatedAt: new Date() },
      target: DuesConfiguration.id,
    });
}

async function signInAs(
  page: Page,
  userId: string,
  callbackURL = MEMBER_DASHBOARD_PATH,
) {
  await page.goto(
    `/api/e2e/signin?userId=${encodeURIComponent(
      userId,
    )}&callbackURL=${encodeURIComponent(callbackURL)}`,
  );
}

test.describe("member dues payment", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    const configuration = await db.query.DuesConfiguration.findFirst({
      where: eq(DuesConfiguration.id, DUES_CONFIGURATION_ID),
    });
    originalPaymentsEnabled = configuration?.paymentsEnabled ?? null;
  });

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedE2EData();
  });

  test.afterAll(async () => {
    await cleanupE2EData();
    if (originalPaymentsEnabled === null) {
      await db
        .delete(DuesConfiguration)
        .where(eq(DuesConfiguration.id, DUES_CONFIGURATION_ID));
    } else {
      await setPaymentAvailability(originalPaymentsEnabled);
    }
  });

  test("shows the paused state when member payments are disabled", async ({
    page,
  }) => {
    await setPaymentAvailability(false);
    await signInAs(page, UNPAID_USER_ID);

    await expect(page).toHaveURL(routeURL(MEMBER_DASHBOARD_PATH));
    const unpaidStatus = page
      .getByRole("group", { name: "Dues status" })
      .filter({ visible: true });
    await expect(
      unpaidStatus.getByText("Dues payments are paused until further notice"),
    ).toBeVisible();
    await expect(
      unpaidStatus.getByText("Paused", { exact: true }),
    ).toBeVisible();
    await expect(
      unpaidStatus.getByRole("button", {
        name: "Payments paused",
      }),
    ).toBeDisabled();
    await expect(
      unpaidStatus.getByRole("link", { name: "Pay dues" }),
    ).toHaveCount(0);

    await page.goto("/member/dues");
    await expect(
      page.getByRole("heading", {
        name: "Member dues paused",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Dues payments are paused until further notice.").first(),
    ).toBeVisible();
    await expect(page.getByText("Complete test payment")).toHaveCount(0);
  });

  test("lets an unpaid member pay when member payments are enabled", async ({
    page,
  }) => {
    await signInAs(page, UNPAID_USER_ID);

    await expect(page).toHaveURL(routeURL(MEMBER_DASHBOARD_PATH));
    const unpaidStatus = page
      .getByRole("group", { name: "Dues status" })
      .filter({ visible: true });
    const currentAcademicYear = getDuesAcademicYear();

    await expect(
      unpaidStatus.getByText(
        `Dues unpaid for the ${currentAcademicYear.label}.`,
      ),
    ).toBeVisible();
    await expect(
      unpaidStatus.getByText("Unpaid", { exact: true }),
    ).toBeVisible();

    await unpaidStatus.getByRole("link", { name: "Pay dues" }).click();
    await expect(page).toHaveURL(routeURL("/member/dues"));

    if (
      await page
        .getByRole("heading", { name: "The school year is almost over" })
        .isVisible()
        .catch(() => false)
    ) {
      await expect(
        page.getByText("which means you will need to pay dues again"),
      ).toBeVisible();
      await page.getByRole("button", { name: "Continue to payment" }).click();
    }

    await expect(
      page.getByRole("heading", { name: "Pay member dues" }),
    ).toBeVisible();
    await expect(page.getByText("$25.00")).toBeVisible();
    await page.getByRole("button", { name: "Complete test payment" }).click();
    await expect(
      page.getByRole("heading", { name: "Dues paid" }),
    ).toBeVisible();
    await expect(
      page.getByText("Returning to your dashboard in 5 seconds."),
    ).toBeVisible();
    await expect(
      page.getByText("Returning to your dashboard in 4 seconds."),
    ).toBeVisible({ timeout: 2_000 });
    await page.getByRole("button", { name: "Return to dashboard now" }).click();
    await expect(page).toHaveURL(routeURL(MEMBER_DASHBOARD_PATH));
    await expect(page.getByText("Paid for the").first()).toBeVisible();

    const duesRows = await db.query.DuesPayment.findMany({
      where: and(
        eq(DuesPayment.memberId, UNPAID_MEMBER_ID),
        eq(DuesPayment.active, true),
      ),
    });

    expect(duesRows).toHaveLength(1);
    expect(duesRows[0]?.amount).toBe(2500);
  });

  test("redirects an already paid member away from the dues page", async ({
    page,
  }) => {
    await signInAs(page, PAID_USER_ID, "/member/dues");

    await expect(page).toHaveURL(routeURL(MEMBER_DASHBOARD_PATH));
    await expect(page.getByText("Paid for the").first()).toBeVisible();
    await expect(page.getByText("Complete test payment")).toHaveCount(0);
  });

  test("routes authenticated users without member profiles to onboarding", async ({
    page,
  }) => {
    await signInAs(page, NO_MEMBER_USER_ID, "/member/dues");

    await expect(page).toHaveURL(routeURL(`/form/${MEMBER_SIGNUP_FORM_SLUG}`));
    await expect(
      page.getByRole("heading", { name: "Build your Knight Hacks profile." }),
    ).toBeVisible();
    await expect(page.getByText("Complete test payment")).toHaveCount(0);
  });

  test("preserves stale dues history and exposes the next payable year", async ({
    page,
  }) => {
    const currentAcademicYear = getDuesAcademicYear();
    const nextAcademicYear = buildDuesAcademicYear(
      currentAcademicYear.startYear + 1,
    );
    const stalePaymentDate = new Date("2026-06-01T12:00:00Z");

    await db.insert(DuesPayment).values({
      active: false,
      amount: 2500,
      memberId: UNPAID_MEMBER_ID,
      paymentDate: stalePaymentDate,
      stripePaymentIntentId: "pi_e2e_stale_seed",
      year: currentAcademicYear.startYear,
    });

    await signInAs(page, UNPAID_USER_ID);

    await expect(page).toHaveURL(routeURL(MEMBER_DASHBOARD_PATH));
    const duesStatus = page
      .getByRole("group", { name: "Dues status" })
      .filter({ visible: true });

    await expect(
      duesStatus.getByText(`Dues unpaid for the ${nextAcademicYear.label}.`),
    ).toBeVisible();
    await expect(
      duesStatus.getByRole("link", { name: "Pay dues" }),
    ).toBeVisible();

    const staleRows = await db.query.DuesPayment.findMany({
      where: and(
        eq(DuesPayment.memberId, UNPAID_MEMBER_ID),
        eq(DuesPayment.year, currentAcademicYear.startYear),
      ),
    });

    expect(staleRows).toHaveLength(1);
    expect(staleRows[0]?.paymentDate).toEqual(stalePaymentDate);
    expect(staleRows[0]).toMatchObject({
      active: false,
      amount: 2500,
      stripePaymentIntentId: "pi_e2e_stale_seed",
      year: currentAcademicYear.startYear,
    });

    await duesStatus.getByRole("link", { name: "Pay dues" }).click();
    await expect(page).toHaveURL(routeURL("/member/dues"));
  });

  test("keeps mobile dues status reachable inside the Guild profile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInAs(page, UNPAID_USER_ID);

    await expect(page).toHaveURL(routeURL(MEMBER_DASHBOARD_PATH));
    const guildProfile = page.getByRole("region", { name: "Guild profile" });
    await expect(guildProfile).toBeVisible();
    const duesStatus = guildProfile.getByRole("group", {
      name: "Dues status",
    });
    await expect(duesStatus).toBeVisible();
    await expect(duesStatus.getByText(/Dues unpaid for the/)).toBeVisible();
    await expect(
      duesStatus.getByRole("link", { name: "Pay dues" }),
    ).toBeVisible();
    await expect(duesStatus.getByText("Unpaid", { exact: true })).toBeVisible();
    await expect(page.getByText("Welcome, Una")).toBeHidden();
  });
});
