import { expect, test } from "playwright/test";

import { and, eq, inArray, isNull, or } from "@forge/db";
import { db } from "@forge/db/client";
import { Event, EventTag } from "@forge/db/schemas/knight-hacks";

const TAG_NAME = "E2E Project Launch Announcements";
const CHANNEL_ID = "990000000000000950";
const EDITOR_ID = "e7000000-0000-4000-8000-000000000042";
const ORIGINAL_TAG_ID = "e7000000-0000-4000-8000-000000000091";
const REPLACEMENT_TAG_ID = "e7000000-0000-4000-8000-000000000092";

async function cleanupTag() {
  await db
    .delete(EventTag)
    .where(
      and(
        or(
          eq(EventTag.name, TAG_NAME),
          inArray(EventTag.id, [ORIGINAL_TAG_ID, REPLACEMENT_TAG_ID]),
        ),
        isNull(EventTag.hackathonId),
      ),
    );
}

test.describe("Club tag announcement settings", () => {
  test.beforeEach(async ({ request }) => {
    await cleanupTag();
    const seed = await request.post("/api/e2e/events", {
      data: { scenario: "event-management" },
    });
    expect(seed.status(), await seed.text()).toBe(201);
  });

  test.afterEach(async ({ request }) => {
    const response = await request.delete("/api/e2e/events");
    expect([200, 204]).toContain(response.status());
    await cleanupTag();
  });

  test("keeps linked Club tag identity after rename and an unrelated event edit", async ({
    page,
  }) => {
    const eventId = "e7000000-0000-4000-8000-000000000003";
    await db.insert(EventTag).values({
      id: ORIGINAL_TAG_ID,
      name: "E2E Identity Workshop",
      normalizedName: "e2e identity workshop",
      color: "#7c3aed",
      defaultPoints: 10,
      emoji: "🛠️",
      announcementChannelId: CHANNEL_ID,
      skipNextWeek: true,
    });
    await db
      .update(Event)
      .set({
        tagId: ORIGINAL_TAG_ID,
        tag: "E2E Identity Workshop",
        tagColor: "#7c3aed",
      })
      .where(eq(Event.id, eventId));
    await db
      .update(EventTag)
      .set({
        name: "E2E Identity Technical",
        normalizedName: "e2e identity technical",
      })
      .where(eq(EventTag.id, ORIGINAL_TAG_ID));
    await db.insert(EventTag).values({
      id: REPLACEMENT_TAG_ID,
      name: "E2E Identity Workshop",
      normalizedName: "e2e identity workshop",
      color: "#ffffff",
      defaultPoints: 99,
      emoji: "🎮",
    });

    await page.goto(
      `/api/e2e/signin?userId=${EDITOR_ID}&callbackURL=${encodeURIComponent("/admin/events?view=list")}`,
    );
    const row = page
      .getByRole("row")
      .filter({ has: page.getByText("Current Workshop", { exact: true }) });
    await row.getByRole("button", { name: "Edit event", exact: true }).click();
    const dialog = page.getByRole("dialog", {
      name: "Edit event",
      exact: true,
    });
    await expect(dialog.getByLabel("Tag", { exact: true })).toHaveValue(
      ORIGINAL_TAG_ID,
    );
    await dialog
      .getByLabel("Location", { exact: true })
      .fill("Updated Club Room");
    await dialog
      .getByRole("button", { name: "Edit event", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();

    const updated = await db.query.Event.findFirst({
      where: eq(Event.id, eventId),
    });
    expect(updated).toMatchObject({
      tagId: ORIGINAL_TAG_ID,
      location: "Updated Club Room",
      points: 10,
    });
  });

  test("persists, reopens, and clears tag-wide announcement settings", async ({
    page,
  }, testInfo) => {
    await page.goto(
      `/api/e2e/signin?userId=${EDITOR_ID}&callbackURL=${encodeURIComponent("/admin/events?view=tags")}`,
    );
    await page.getByRole("button", { name: "Create tag", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Create tag" });
    await dialog.getByLabel("Name", { exact: true }).fill(TAG_NAME);
    await dialog.getByLabel("Announcement emoji").fill("🚀");
    const channel = dialog.getByRole("combobox", {
      name: "Announcement channel override (optional)",
    });
    await channel.click();
    await page.getByPlaceholder("Search channels").fill("announcements");
    await page
      .getByRole("option", { name: "#event-announcements-e2e" })
      .click();
    await dialog.getByLabel("Skip Next Week reminders").check();
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("club-tag-settings-desktop.png"),
    });
    await dialog.getByRole("button", { name: "Save tag" }).click();
    await expect(dialog).not.toBeVisible();

    const [created] = await db
      .select()
      .from(EventTag)
      .where(and(eq(EventTag.name, TAG_NAME), isNull(EventTag.hackathonId)));
    expect(created).toMatchObject({
      emoji: "🚀",
      announcementChannelId: CHANNEL_ID,
      skipNextWeek: true,
    });

    await page.reload();
    await page.setViewportSize({ width: 320, height: 780 });
    await page
      .getByRole("button", { name: `Edit ${TAG_NAME}`, exact: true })
      .click();
    const edit = page.getByRole("dialog", { name: "Edit tag" });
    await expect(edit.getByLabel("Announcement emoji")).toHaveValue("🚀");
    await expect(edit.getByLabel("Skip Next Week reminders")).toBeChecked();
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
      path: testInfo.outputPath("club-tag-settings-320.png"),
    });
    await edit.getByLabel("Announcement emoji").fill("not-an-emoji");
    await edit.getByRole("button", { name: "Save tag" }).click();
    await expect(edit.getByRole("alert")).toBeInViewport();
    await expect(edit.getByLabel("Announcement emoji")).toHaveValue(
      "not-an-emoji",
    );
    await expect(edit.getByLabel("Skip Next Week reminders")).toBeChecked();
    await expect(
      edit.getByRole("combobox", {
        name: "Announcement channel override (optional)",
      }),
    ).toHaveText("#event-announcements-e2e");
    await edit.getByLabel("Announcement emoji").clear();
    await edit.getByLabel("Skip Next Week reminders").uncheck();
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
      .where(and(eq(EventTag.name, TAG_NAME), isNull(EventTag.hackathonId)));
    expect(updated).toMatchObject({
      emoji: null,
      announcementChannelId: null,
      skipNextWeek: false,
    });
  });
});
