import { expect, test } from "playwright/test";

import { PERMISSIONS } from "@forge/consts";
import { and, eq, inArray } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import {
  Event,
  EventTag,
  Hackathon,
  HackathonClass,
  Hacker,
  HackerAttendee,
  HackerDiscordRoleGrant,
  HackerEventAttendee,
} from "@forge/db/schemas/knight-hacks";

const ADMIN_ID = "00000000-0000-4000-8000-000000000a01";
const ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000a02";
const HACKER_USER_ID = "00000000-0000-4000-8000-000000000a03";
const HACKER_ID = "00000000-0000-4000-8000-000000000a04";
const HACKATHON_ID = "00000000-0000-4000-8000-000000000a05";
const CLASS_ID = "00000000-0000-4000-8000-000000000a06";
const VIP_ID = "00000000-0000-4000-8000-000000000a07";
const ATTENDEE_ID = "00000000-0000-4000-8000-000000000a08";
const EVENT_ID = "00000000-0000-4000-8000-000000000a09";
const TAG_ID = "00000000-0000-4000-8000-000000000a0a";

function permissionBitstring(...keys: PERMISSIONS.PermissionKey[]) {
  const maxIndex = Math.max(
    ...Object.values(PERMISSIONS.PERMISSION_DATA).map(({ idx }) => idx),
  );
  const bits = Array.from({ length: maxIndex + 1 }, () => "0");
  for (const key of keys) bits[PERMISSIONS.PERMISSION_DATA[key].idx] = "1";
  return bits.join("");
}

async function cleanupFixtures() {
  await db
    .delete(HackerEventAttendee)
    .where(eq(HackerEventAttendee.hackathonId, HACKATHON_ID));
  await db
    .delete(HackerDiscordRoleGrant)
    .where(eq(HackerDiscordRoleGrant.hackathonId, HACKATHON_ID));
  await db.delete(HackerAttendee).where(eq(HackerAttendee.id, ATTENDEE_ID));
  await db.delete(Hacker).where(eq(Hacker.id, HACKER_ID));
  await db.delete(Event).where(eq(Event.id, EVENT_ID));
  await db.delete(EventTag).where(eq(EventTag.hackathonId, HACKATHON_ID));
  await db
    .delete(HackathonClass)
    .where(inArray(HackathonClass.id, [CLASS_ID, VIP_ID]));
  await db.delete(Hackathon).where(eq(Hackathon.id, HACKATHON_ID));
  await db.delete(Permissions).where(eq(Permissions.userId, ADMIN_ID));
  await db.delete(Roles).where(eq(Roles.id, ADMIN_ROLE_ID));
  await db.delete(User).where(inArray(User.id, [ADMIN_ID, HACKER_USER_ID]));
}

test.describe("Hackathon event and check-in critical flow", () => {
  test.beforeAll(async () => {
    await cleanupFixtures();
    await db.insert(User).values([
      {
        discordUserId: "990000000000000901",
        email: "hack-event-admin@example.test",
        id: ADMIN_ID,
        name: "Hack Event Admin",
      },
      {
        // Deliberately invalid so the role worker records a repairable failure
        // without making a real Discord request from this browser test.
        discordUserId: "e2e-no-discord-account",
        email: "minor-hacker@example.test",
        id: HACKER_USER_ID,
        name: "Minor Hacker",
      },
    ]);
    await db.insert(Roles).values({
      discordRoleId: "990000000000000902",
      id: ADMIN_ROLE_ID,
      name: "Hack Event Admins",
      permissions: permissionBitstring("IS_OFFICER"),
    });
    await db
      .insert(Permissions)
      .values({ roleId: ADMIN_ROLE_ID, userId: ADMIN_ID });
    await db.insert(Hackathon).values({
      applicationDeadline: new Date("2026-07-01T00:00:00.000Z"),
      applicationOpen: new Date("2026-06-01T00:00:00.000Z"),
      confirmationDeadline: new Date("2026-07-15T00:00:00.000Z"),
      displayName: "E2E Hackathon Events",
      endDate: new Date("2027-08-07T00:00:00.000Z"),
      generalHackerDiscordRoleId: "990000000000000903",
      id: HACKATHON_ID,
      name: "e2e-hackathon-events",
      startDate: new Date("2027-08-05T00:00:00.000Z"),
      theme: "Event operations",
    });
    await db.insert(HackathonClass).values([
      {
        color: "#6d28d9",
        discordRoleId: "990000000000000904",
        hackathonId: HACKATHON_ID,
        id: CLASS_ID,
        kind: "class",
        name: "Violet",
      },
      {
        color: "#f59e0b",
        discordRoleId: "990000000000000905",
        hackathonId: HACKATHON_ID,
        id: VIP_ID,
        kind: "vip",
        name: "VIP",
      },
    ]);
    await db.insert(EventTag).values({
      color: "#6d28d9",
      defaultPoints: 25,
      hackathonId: HACKATHON_ID,
      id: TAG_ID,
      name: "Operations",
      normalizedName: "operations",
    });
    await db.insert(Event).values({
      creationKey: "00000000-0000-4000-8000-000000000a0b",
      creationPayloadHash: "a".repeat(64),
      description: "Admit every hacker to the whole event.",
      discordSyncState: "error",
      dues_paying: false,
      end_datetime: new Date("2027-08-07T00:00:00.000Z"),
      googleSyncState: "error",
      hackathonId: HACKATHON_ID,
      id: EVENT_ID,
      isOperationsCalendar: false,
      legacy: false,
      location: "Registration hall",
      name: "Whole Hack Check-in",
      points: 25,
      publishedAt: new Date("2027-07-01T00:00:00.000Z"),
      purpose: "primary_check_in",
      roles: [],
      start_datetime: new Date("2027-08-05T00:00:00.000Z"),
      tag: "Operations",
      tagId: TAG_ID,
      tagColor: "#6d28d9",
      visibilityDuesPaying: false,
      visibilityInternal: false,
      visibilityRevision: 1,
      visibilityRoles: [],
    });
    await db.insert(Hacker).values({
      age: 15,
      discordUser: "e2e-minor",
      dob: "2011-01-01",
      email: "minor-hacker@example.test",
      firstName: "Minor",
      gradDate: "2030-05-01",
      id: HACKER_ID,
      isFirstTime: true,
      lastName: "Hacker",
      levelOfStudy: "Undergraduate University (3+ year)",
      phoneNumber: "4075550101",
      school: "University of Central Florida",
      shirtSize: "M",
      survey1: "",
      survey2: "",
      userId: HACKER_USER_ID,
    });
    await db.insert(HackerAttendee).values({
      hackathonId: HACKATHON_ID,
      hackerId: HACKER_ID,
      id: ATTENDEE_ID,
      isFirstTime: null,
      isVip: true,
      status: "confirmed",
    });
  });

  test.afterAll(cleanupFixtures);

  test("keeps linked hack tag identity after rename and an unrelated event edit", async ({
    page,
  }) => {
    await db
      .update(EventTag)
      .set({ name: "Technical", normalizedName: "technical" })
      .where(eq(EventTag.id, TAG_ID));
    await db.insert(EventTag).values({
      id: "00000000-0000-4000-8000-000000000a0c",
      hackathonId: HACKATHON_ID,
      name: "Operations",
      normalizedName: "operations",
      color: "#ffffff",
      defaultPoints: 99,
      emoji: "🎮",
    });
    await page.goto(
      `/api/e2e/signin?userId=${ADMIN_ID}&callbackURL=${encodeURIComponent(`/admin/hackathon-events?hackathon=${HACKATHON_ID}`)}`,
    );
    await page
      .getByRole("button", { name: "Edit Whole Hack Check-in", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Edit event",
      exact: true,
    });
    await expect(dialog.getByLabel("Tag", { exact: true })).toHaveValue(TAG_ID);
    await dialog
      .getByLabel("Location", { exact: true })
      .fill("Updated Hack Room");
    await dialog
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();

    const updated = await db.query.Event.findFirst({
      where: eq(Event.id, EVENT_ID),
    });
    expect(updated).toMatchObject({
      tagId: TAG_ID,
      location: "Updated Hack Room",
      points: 25,
    });
  });

  test("persists hack tag announcement settings without Club-only scheduling", async ({
    page,
  }, testInfo) => {
    await page.goto(
      `/api/e2e/signin?userId=${ADMIN_ID}&callbackURL=${encodeURIComponent(`/admin/hackathon-events?hackathon=${HACKATHON_ID}&view=tags`)}`,
    );
    await page.getByRole("button", { name: "Create tag", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Create tag" });
    await dialog.getByLabel("Name", { exact: true }).fill("E2E Hack Workshop");
    await dialog.getByLabel("Announcement emoji").fill("🛠️");
    await expect(dialog.getByLabel("Skip Next Week reminders")).toHaveCount(0);
    await dialog
      .getByRole("combobox", {
        name: "Announcement channel override (optional)",
      })
      .click();
    await page
      .getByRole("option", { name: "#event-announcements-e2e" })
      .click();
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("hack-tag-settings-desktop.png"),
    });
    await dialog.getByRole("button", { name: "Save tag" }).click();
    await expect(dialog).not.toBeVisible();

    const [created] = await db
      .select()
      .from(EventTag)
      .where(
        and(
          eq(EventTag.hackathonId, HACKATHON_ID),
          eq(EventTag.name, "E2E Hack Workshop"),
        ),
      );
    expect(created).toMatchObject({
      emoji: "🛠️",
      announcementChannelId: "990000000000000950",
      skipNextWeek: false,
    });

    await page.reload();
    await page.setViewportSize({ width: 320, height: 780 });
    await page
      .getByRole("button", { name: "Edit E2E Hack Workshop", exact: true })
      .click();
    const edit = page.getByRole("dialog", { name: "Edit tag" });
    await expect(edit.getByLabel("Announcement emoji")).toHaveValue("🛠️");
    await expect(
      edit.getByRole("combobox", {
        name: "Announcement channel override (optional)",
      }),
    ).toHaveText("#event-announcements-e2e");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("hack-tag-settings-320.png"),
    });
    await edit.getByLabel("Announcement emoji").clear();
    await edit
      .getByRole("combobox", {
        name: "Announcement channel override (optional)",
      })
      .click();
    await page.getByRole("option", { name: "Use default channel" }).click();
    await edit.getByRole("button", { name: "Save tag" }).click();
    await expect(edit).not.toBeVisible();

    const [updated] = await db
      .select()
      .from(EventTag)
      .where(
        and(
          eq(EventTag.hackathonId, HACKATHON_ID),
          eq(EventTag.name, "E2E Hack Workshop"),
        ),
      );
    expect(updated).toMatchObject({
      emoji: null,
      announcementChannelId: null,
      skipNextWeek: false,
    });
  });

  test("keeps list, calendar day, tags, and duplicate workflows aligned", async ({
    page,
  }) => {
    await page.goto(
      `/api/e2e/signin?userId=${ADMIN_ID}&callbackURL=${encodeURIComponent(
        `/admin/hackathon-events?hackathon=${HACKATHON_ID}`,
      )}`,
    );

    await expect(
      page.getByRole("table", { name: "Hackathon events" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Attendance" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Feedback" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Past" }).click();
    await page.getByLabel("Sort events").selectOption("name");
    await expect
      .poll(() => new URL(page.url()).searchParams.get("timing"))
      .toBe("past");
    await expect
      .poll(() => new URL(page.url()).searchParams.get("sort"))
      .toBe("name");
    await page.getByRole("button", { name: "Upcoming" }).click();

    await page
      .getByRole("button", { name: "Duplicate Whole Hack Check-in" })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Duplicate event" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto(
      `/admin/hackathon-events?hackathon=${HACKATHON_ID}&view=calendar&calendarMode=day&calendarStart=2027-08-05T04%3A00%3A00.000Z&calendarEnd=2027-08-06T04%3A00%3A00.000Z`,
    );
    await expect(page.locator(".fc-timeGridDay-view")).toBeVisible();
    await expect(page.getByText("Whole Hack Check-in").first()).toBeVisible();

    await page.getByRole("link", { name: "Tags" }).click();
    await expect(
      page.getByRole("heading", { name: "Event tags" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Import previous tags" }).click();
    const importDialog = page.getByRole("dialog", {
      name: "Import previous hackathon tags",
    });
    await expect(importDialog).toBeVisible();
    await expect(importDialog).toContainText("Review every tag used before");
  });

  test("admits a confirmed minor, keeps the result open, and reopens history", async ({
    page,
  }) => {
    await page.goto(
      `/api/e2e/signin?userId=${ADMIN_ID}&callbackURL=${encodeURIComponent(
        `/admin/hackathon-events?hackathon=${HACKATHON_ID}`,
      )}`,
    );
    await expect(
      page.getByRole("heading", { name: "Hackathon Events" }),
    ).toBeVisible();
    await expect(page.getByText("Whole Hack Check-in").first()).toBeVisible();

    await page.goto(
      `/admin/hackathon-check-in?hackathon=${HACKATHON_ID}&event=${EVENT_ID}`,
    );
    await expect(
      page.getByRole("heading", { name: "Hackathon Check-in" }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Manual" }).click();
    await page.getByLabel("Hacker").fill("minor-hacker@example.test");
    await page.getByRole("button", { name: /Minor Hacker/ }).click();
    await page
      .getByRole("button", { name: "Check in selected hacker" })
      .click();

    const result = page.getByRole("dialog", { name: "Checked in" });
    await expect(result).toBeVisible();
    await expect(result.getByRole("alert")).toContainText("under 18");
    await expect(result.getByText("Violet")).toBeVisible();
    await expect(result.getByText("VIP", { exact: true }).last()).toBeVisible();
    await page.waitForTimeout(500);
    await expect(result).toBeVisible();

    await result.getByRole("button", { name: "Close check-in result" }).click();
    const historyRow = page.getByRole("button", {
      name: /Minor Hacker.*Whole Hack Check-in/i,
    });
    await expect(historyRow).toBeVisible();
    await page.setViewportSize({ height: 844, width: 390 });
    await historyRow.click();
    await expect(result).toBeVisible();
    await expect(result.getByRole("alert")).toContainText("under 18");
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      )
      .toBe(true);

    const [attendee] = await db
      .select({
        classId: HackerAttendee.classId,
        isFirstTime: HackerAttendee.isFirstTime,
        points: HackerAttendee.points,
        status: HackerAttendee.status,
      })
      .from(HackerAttendee)
      .where(
        and(
          eq(HackerAttendee.id, ATTENDEE_ID),
          eq(HackerAttendee.hackathonId, HACKATHON_ID),
        ),
      );
    expect(attendee).toMatchObject({
      classId: CLASS_ID,
      isFirstTime: true,
      points: 25,
      status: "checkedin",
    });
    const [profile] = await db
      .select({ isFirstTime: Hacker.isFirstTime })
      .from(Hacker)
      .where(eq(Hacker.id, HACKER_ID));
    expect(profile?.isFirstTime).toBe(false);
  });
});
