import type { Page } from "playwright/test";
import { expect, test } from "playwright/test";

import type { InsertMember } from "@forge/db/schemas/knight-hacks";
import { DISCORD, PERMISSIONS } from "@forge/consts";
import { inArray } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import {
  DiscordArchiveChannel,
  DiscordArchiveMessage,
} from "@forge/db/schemas/discord";
import {
  DuesPayment,
  Event,
  EventAttendee,
  Member,
} from "@forge/db/schemas/knight-hacks";
import { getDuesAcademicYear, MEMBER_DASHBOARD_PATH } from "@forge/validators";

const ANALYTICS_PATH = "/admin/analytics";
const ANALYTICS_USER_ID = "00000000-0000-4000-8000-000000000901";
const UNAUTHORIZED_USER_ID = "00000000-0000-4000-8000-000000000902";
const ANALYTICS_ROLE_ID = "00000000-0000-4000-8000-000000000903";
const UNAUTHORIZED_MEMBER_ID = "00000000-0000-4000-8000-000000000929";
const MEMBER_USER_IDS = Array.from(
  { length: 8 },
  (_, index) =>
    `00000000-0000-4000-8000-${String(910 + index).padStart(12, "0")}`,
);
const MEMBER_IDS = Array.from(
  { length: 8 },
  (_, index) =>
    `00000000-0000-4000-8000-${String(920 + index).padStart(12, "0")}`,
);
const EVENT_IDS = Array.from(
  { length: 5 },
  (_, index) =>
    `00000000-0000-4000-8000-${String(930 + index).padStart(12, "0")}`,
);
const DISCORD_CHANNEL_ID = "9000000000000000930";
const DISCORD_AUTHOR_ID = "9000000000000000910";
const DISCORD_MESSAGE_IDS = [
  "9000000000000000931",
  "9000000000000000932",
  "9000000000000000933",
  "9000000000000000934",
] as const;

function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Missing ${label}.`);
  return value;
}

function permissionBitstring(...keys: PERMISSIONS.PermissionKey[]) {
  const maxIndex = Math.max(
    ...Object.values(PERMISSIONS.PERMISSION_DATA).map(({ idx }) => idx),
  );
  const bits = Array.from({ length: maxIndex + 1 }, () => "0");
  keys.forEach((key) => {
    const permission = PERMISSIONS.PERMISSION_DATA[key];
    bits[permission.idx] = "1";
  });
  return bits.join("");
}

async function cleanup() {
  await db
    .delete(DiscordArchiveMessage)
    .where(inArray(DiscordArchiveMessage.id, [...DISCORD_MESSAGE_IDS]));
  await db
    .delete(DiscordArchiveChannel)
    .where(inArray(DiscordArchiveChannel.id, [DISCORD_CHANNEL_ID]));
  await db.delete(Event).where(inArray(Event.id, EVENT_IDS));
  await db
    .delete(Member)
    .where(inArray(Member.id, [...MEMBER_IDS, UNAUTHORIZED_MEMBER_ID]));
  await db
    .delete(Permissions)
    .where(
      inArray(Permissions.userId, [ANALYTICS_USER_ID, UNAUTHORIZED_USER_ID]),
    );
  await db
    .delete(User)
    .where(
      inArray(User.id, [
        ANALYTICS_USER_ID,
        UNAUTHORIZED_USER_ID,
        ...MEMBER_USER_IDS,
      ]),
    );
  await db.delete(Roles).where(inArray(Roles.id, [ANALYTICS_ROLE_ID]));
}

async function seed() {
  await cleanup();
  await db.insert(Roles).values({
    discordRoleId: "club-analytics-reader-e2e",
    id: ANALYTICS_ROLE_ID,
    name: "Club analytics reader E2E",
    permissions: permissionBitstring("READ_CLUB_DATA", "READ_MEMBERS"),
  });
  await db.insert(User).values([
    {
      discordUserId: "club-analytics-admin-e2e",
      email: "club-analytics-admin@example.test",
      emailVerified: true,
      id: ANALYTICS_USER_ID,
      image: null,
      name: "Analytics Reader",
    },
    {
      discordUserId: "club-analytics-unauthorized-e2e",
      email: "club-analytics-unauthorized@example.test",
      emailVerified: true,
      id: UNAUTHORIZED_USER_ID,
      image: null,
      name: "Analytics Unauthorized",
    },
    ...MEMBER_USER_IDS.map((id, index) => ({
      discordUserId:
        index === 0 ? DISCORD_AUTHOR_ID : `club-analytics-member-${index}`,
      email: `club-analytics-member-${index}@example.test`,
      emailVerified: true,
      id,
      image: null,
      name: `Analytics Member ${index}`,
    })),
  ]);
  await db.insert(Permissions).values({
    roleId: ANALYTICS_ROLE_ID,
    userId: ANALYTICS_USER_ID,
  });
  const members: InsertMember[] = MEMBER_IDS.map((id, index) => ({
    age: 18 + index,
    dateCreated: `2025-${String(8 + (index % 4)).padStart(2, "0")}-01`,
    discordUser: `club-analytics-member-${index}`,
    dob: `${2007 - index}-02-03`,
    email: `club-analytics-member-${index}@example.test`,
    firstName: required(
      ["Avery", "Blair", "Casey", "Drew", "Emery", "Finley", "Gray", "Harper"][
        index
      ],
      "Member first name",
    ),
    gender: index % 3 === 0 ? "Woman" : "Prefer not to answer",
    gradDate: `${2026 + (index % 4)}-05-02`,
    id,
    lastName: "Analytics",
    levelOfStudy:
      index < 6
        ? "Undergraduate University (3+ year)"
        : "Graduate University (Masters, Professional, Doctoral, etc)",
    major: "Computer Science",
    phoneNumber: `407-555-${String(1900 + index)}`,
    points: index * 10,
    raceOrEthnicity: "Prefer not to answer",
    school:
      index < 6 ? "University of Central Florida" : "University of Florida",
    shirtSize: index % 2 === 0 ? "M" : "L",
    timeCreated: "12:00:00",
    userId: required(MEMBER_USER_IDS[index], "Member user"),
  }));
  const firstMember = required(members[0], "base Member");
  await db.insert(Member).values([
    ...members,
    {
      ...firstMember,
      discordUser: "club-analytics-unauthorized-e2e",
      email: "club-analytics-unauthorized@example.test",
      firstName: "Unauthorized",
      id: UNAUTHORIZED_MEMBER_ID,
      phoneNumber: "407-555-1999",
      userId: UNAUTHORIZED_USER_ID,
    },
  ]);
  const eventStarts = [
    "2025-09-10T22:00:00.000Z",
    "2025-10-08T22:00:00.000Z",
    "2026-01-20T23:00:00.000Z",
    "2026-03-18T22:00:00.000Z",
    "2026-04-01T22:00:00.000Z",
  ];
  await db.insert(Event).values(
    EVENT_IDS.map((id, index) => {
      const start = new Date(required(eventStarts[index], "Event start"));
      return {
        description: `Analytics event fixture ${index}`,
        end_datetime: new Date(start.getTime() + 90 * 60 * 1000),
        id,
        location: index % 2 === 0 ? "ENG2 Atrium" : "HEC 101",
        name: required(
          [
            "TypeScript Workshop",
            "Fall Social",
            "Resume Review",
            "React Workshop",
            "Internal Planning",
          ][index],
          "Event name",
        ),
        roles: index === 4 ? ["internal-team-role"] : [],
        start_datetime: start,
        tag: index === 0 || index === 3 ? "Workshop" : "Community",
        tagColor: index === 0 || index === 3 ? "#8B5CF6" : "#22C55E",
      };
    }),
  );
  const attendanceValues = EVENT_IDS.flatMap((eventId, eventIndex) =>
    MEMBER_IDS.slice(0, Math.max(2, 8 - eventIndex)).map((memberId) => ({
      eventId,
      memberId,
    })),
  );
  await db.insert(EventAttendee).values(attendanceValues);
  await db.insert(DiscordArchiveChannel).values({
    discordUpdatedAt: new Date("2026-07-15T12:00:00Z"),
    guildId: DISCORD.KNIGHTHACKS_GUILD,
    id: DISCORD_CHANNEL_ID,
    name: "analytics-member-e2e",
    type: 0,
  });
  await db.insert(DiscordArchiveMessage).values(
    DISCORD_MESSAGE_IDS.map((id, index) => ({
      authorDiscordUserId: DISCORD_AUTHOR_ID,
      authorIsBot: false,
      channelId: DISCORD_CHANNEL_ID,
      content: "E2E message content must not surface",
      createdAt: new Date(
        required(
          [
            "2026-06-20T12:00:00Z",
            "2026-07-13T12:00:00Z",
            "2026-07-14T12:00:00Z",
            "2026-07-15T12:00:00Z",
          ][index],
          "Discord message date",
        ),
      ),
      guildId: DISCORD.KNIGHTHACKS_GUILD,
      id,
      messageType: 0,
    })),
  );
  const currentYear = getDuesAcademicYear(new Date()).startYear;
  await db.insert(DuesPayment).values(
    MEMBER_IDS.slice(0, 5).map((memberId, index) => ({
      active: true,
      amount: 2500,
      memberId,
      paymentDate: new Date(Date.UTC(currentYear, 8 + index, 1, 12)),
      stripePaymentIntentId: null,
      year: currentYear,
    })),
  );
}

async function signInAs(page: Page, userId: string) {
  await page.goto(
    `/api/e2e/signin?userId=${encodeURIComponent(userId)}&callbackURL=${encodeURIComponent(ANALYTICS_PATH)}`,
  );
}

async function settleSectionNavigation(page: Page) {
  await page
    .getByRole("navigation", { name: "Analytics sections" })
    .evaluate(async (navigation) => {
      await Promise.all(
        navigation
          .getAnimations({ subtree: true })
          .map((animation) => animation.finished.catch(() => undefined)),
      );
    });
}

test.describe("admin Club analytics", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(seed);
  test.afterAll(cleanup);

  test("renders, filters, exports, and stays responsive", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signInAs(page, ANALYTICS_USER_ID);

    await expect(page).toHaveURL(new RegExp(`${ANALYTICS_PATH}$`));
    await expect(
      page.getByRole("heading", { name: "Analytics" }),
    ).toBeVisible();
    await expect(
      page.getByText("Attendances", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("club-analytics-v1")).toHaveCount(0);
    await expect(page.getByText(/@example\.test/)).toHaveCount(0);

    await page.getByRole("link", { name: "Events", exact: true }).click();
    await expect(page.getByText("TypeScript Workshop")).toBeVisible();
    await page.getByRole("combobox", { name: "Individual event" }).click();
    await page.getByRole("option", { name: /^Internal Planning ·/ }).click();
    await expect(
      page.getByText("Internal Planning", { exact: true }),
    ).toBeVisible();
    await page.getByRole("combobox", { name: "Individual event" }).click();
    await page.getByRole("option", { name: "All matching events" }).click();
    await settleSectionNavigation(page);

    await page.getByRole("combobox", { name: "Event type" }).click();
    await page.getByRole("option", { name: "Workshop" }).click();
    await expect(page).toHaveURL(/tag=Workshop/);
    await expect(page.getByText("Fall Social")).toHaveCount(0);

    await page.getByRole("link", { name: "Discord", exact: true }).click();
    await expect(page.getByText("Message activity")).toBeVisible();
    await expect(
      page.locator('[data-analytics-metric-card="true"]'),
    ).toHaveCount(4);
    await expect(
      page.locator('[data-analytics-metric-detail="true"]'),
    ).toHaveCount(4);
    const discordMemberTable = page.getByRole("region", {
      name: "Discord messages by member",
    });
    await expect(discordMemberTable).toContainText("Avery Analytics");
    await expect(discordMemberTable).toContainText("4");
    await expect(
      page.getByText("E2E message content must not surface"),
    ).toHaveCount(0);
    await expect(page.getByText(DISCORD_AUTHOR_ID)).toHaveCount(0);
    await discordMemberTable
      .getByRole("button", { name: "Avery Analytics" })
      .click();
    const memberDialog = page.getByRole("dialog");
    await expect(memberDialog).toBeVisible();
    await expect(memberDialog.getByText("Event engagement")).toBeVisible();
    await expect(memberDialog.getByText("Discord engagement")).toBeVisible();
    await expect(
      memberDialog.getByRole("heading", { name: "Employment history" }),
    ).toBeVisible();
    await expect(memberDialog.getByText("Member ID")).toHaveCount(0);
    await expect(memberDialog.getByText("User ID")).toHaveCount(0);
    const discordHeading = memberDialog.getByRole("heading", {
      name: "Discord engagement",
    });
    await discordHeading.scrollIntoViewIfNeeded();
    await expect(
      memberDialog.getByText("July 2026", { exact: true }),
    ).toBeVisible();
    await memberDialog.getByRole("button", { name: "Previous month" }).click();
    await expect(
      memberDialog.getByText("June 2026", { exact: true }),
    ).toBeVisible();
    await memberDialog.getByRole("button", { name: "Next month" }).click();
    await page.keyboard.press("Escape");
    await expect(memberDialog).toHaveCount(0);
    await settleSectionNavigation(page);

    await page.getByRole("link", { name: "Audience", exact: true }).click();
    await expect(page).toHaveURL(/section=audience/);
    await expect(page.getByText("Program affinity")).toBeVisible();
    await expect(page.getByText("Avery Analytics")).toBeVisible();
    await expect(page.getByText("Discord audience context")).toHaveCount(0);
    await expect(
      page.locator('[data-analytics-metric-card="true"]'),
    ).toHaveCount(8);
    await expect(
      page.locator('[data-analytics-metric-detail="true"]'),
    ).toHaveCount(8);
    await settleSectionNavigation(page);

    await page.getByRole("link", { name: "Dues", exact: true }).click();
    await expect(page.getByText("Academic-year collection pace")).toBeVisible();
    await expect(page.getByText("Discord community context")).toHaveCount(0);
    await expect(
      page.locator('[data-analytics-metric-card="true"]'),
    ).toHaveCount(8);
    await expect(
      page.locator('[data-analytics-metric-detail="true"]'),
    ).toHaveCount(8);
    await settleSectionNavigation(page);

    await page.getByRole("link", { name: "Reports", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Sponsor-safe report" }),
    ).toBeVisible();
    const reportsLink = page.getByRole("link", {
      name: "Reports",
      exact: true,
    });
    await expect(reportsLink).toHaveAttribute("aria-current", "page");
    await settleSectionNavigation(page);
    const sponsorSection = page
      .getByRole("heading", { name: "Sponsor-safe report" })
      .locator("xpath=ancestor::section");
    const downloadPromise = page.waitForEvent("download");
    await sponsorSection.getByRole("button", { name: "Download CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /club-analytics-sponsor.*\.csv$/,
    );
    const discordSummarySection = page
      .getByRole("heading", { name: "Discord summary" })
      .locator("xpath=ancestor::section");
    const discordDownloadPromise = page.waitForEvent("download");
    await discordSummarySection
      .getByRole("button", { name: "Download CSV" })
      .click();
    const discordDownload = await discordDownloadPromise;
    expect(discordDownload.suggestedFilename()).toMatch(
      /discord-analytics-summary.*\.csv$/,
    );

    await page.setViewportSize({ height: 900, width: 320 });
    await page.goto(ANALYTICS_PATH);
    await expect(
      page.getByRole("heading", { name: "Analytics" }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("redirects an authenticated caller without Club-data access", async ({
    page,
  }) => {
    await signInAs(page, UNAUTHORIZED_USER_ID);
    await expect(page).toHaveURL(new RegExp(`${MEMBER_DASHBOARD_PATH}$`));
    await expect(page.getByRole("heading", { name: "Analytics" })).toHaveCount(
      0,
    );
  });

  test("keeps the reports page responsive while a resume bundle is prepared", async ({
    page,
  }) => {
    await signInAs(page, ANALYTICS_USER_ID);
    await page.getByRole("link", { name: "Reports", exact: true }).click();

    await page.evaluate(() => {
      const testWindow = window as Window & {
        resumeBundleTestHref?: string;
      };
      HTMLAnchorElement.prototype.click = function captureResumeBundleHref() {
        testWindow.resumeBundleTestHref = this.href;
      };
    });

    const resumeSection = page
      .getByRole("heading", { name: "Member resume bundle" })
      .locator("xpath=ancestor::section");
    const resumeButton = resumeSection.getByRole("button", {
      name: "Download ZIP",
    });
    await resumeButton.click();

    await expect(
      resumeSection.getByRole("button", { name: "Preparing ZIP…" }),
    ).toBeDisabled();
    await expect(
      resumeSection.getByText(
        "Checking available resumes and building folders. This usually takes about a minute; keep this page open.",
      ),
    ).toBeVisible();

    const downloadHref = await page.evaluate(
      () =>
        (
          window as Window & {
            resumeBundleTestHref?: string;
          }
        ).resumeBundleTestHref,
    );
    expect(downloadHref).toBeTruthy();
    const capturedDownloadHref = required(
      downloadHref,
      "resume bundle download href",
    );
    const downloadToken = required(
      new URL(capturedDownloadHref).searchParams.get("downloadToken") ??
        undefined,
      "resume bundle download token",
    );
    await page.context().addCookies([
      {
        name: "resume-bundle-download",
        url: new URL(capturedDownloadHref).origin,
        value: `${downloadToken}.ready`,
      },
    ]);

    await expect(resumeButton).toBeEnabled();
    await expect(resumeButton).toHaveText("Download ZIP");
  });
});
