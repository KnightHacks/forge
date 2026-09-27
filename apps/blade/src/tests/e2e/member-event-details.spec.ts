import { expect, test } from "playwright/test";

import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Event } from "@forge/db/schemas/knight-hacks";

interface EventFixture {
  events: {
    duesId: string;
    partialId: string;
    pastId: string;
    publishedId: string;
  };
  users: { memberId: string };
}

test.describe("member event descriptions", () => {
  let fixture: EventFixture;

  test.beforeEach(async ({ request, page }) => {
    const response = await request.post("/api/e2e/events", {
      data: { scenario: "event-management" },
    });
    expect(response.status(), await response.text()).toBe(201);
    fixture = (await response.json()) as EventFixture;
    await page.goto(
      `/api/e2e/signin?userId=${fixture.users.memberId}&callbackURL=${encodeURIComponent("/member/events")}`,
    );
  });

  test.afterEach(async ({ request }) => {
    const response = await request.delete("/api/e2e/events");
    expect([200, 204]).toContain(response.status());
  });

  test("opens a shared ID after reload and preserves URL navigation", async ({
    page,
  }, testInfo) => {
    await page.goto(
      `/member/events?source=reminders&selected=${fixture.events.publishedId}`,
    );
    const dialog = page.getByRole("dialog", { name: "Current Workshop" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(
        "Build a typed API client with the Knight Hacks community.",
      ),
    ).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: "Open in Discord" }),
    ).toHaveAttribute("href", /discord\.com\/events\//);
    await expect(
      dialog.getByRole("link", { name: "Add to Google Calendar" }),
    ).toHaveAttribute("href", /calendar\.google\.com/);
    await page.reload();
    await expect(dialog).toBeVisible();
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("member-event-desktop.png"),
    });

    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/member\/events\?source=reminders$/);
    await page.goBack();
    await expect(dialog).toBeVisible();
    await page.goForward();
    await expect(dialog).toHaveCount(0);

    const opener = page.getByRole("link", {
      name: "Current Workshop",
      exact: true,
    });
    await opener.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  });

  test("shows an unavailable result for drafts, ended events, and unknown IDs", async ({
    page,
  }) => {
    for (const id of [
      fixture.events.partialId,
      fixture.events.pastId,
      "not-an-event-id",
    ]) {
      await page.goto(`/member/events?selected=${id}`);
      const dialog = page.getByRole("dialog", { name: "Event unavailable" });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("link")).toHaveCount(0);
      await expect(dialog).not.toContainText("Build a typed API client");
    }
  });

  test("keeps dues requirements and actions reachable on a 320px screen", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ height: 780, width: 320 });
    await page.goto(`/member/events?selected=${fixture.events.duesId}`);
    const dialog = page.getByRole("dialog", { name: "Dues Member Workshop" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText("Dues required", { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: "Pay dues" }),
    ).toHaveAttribute("href", "/member/dues");
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    if (!bounds) throw new Error("Missing dialog bounds.");
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(780);
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("member-event-320.png"),
    });

    const longDescription = [
      "## What to bring",
      ...Array.from(
        { length: 20 },
        (_, index) =>
          `Part ${index + 1}: Bring your laptop and Blade QR code. We will cover setup, work through examples, and leave time for questions.`,
      ),
      "[Read the workshop guide](https://knighthacks.org)",
      "Final preparation: charge your laptop before arriving.",
    ].join("\n\n");
    await db
      .update(Event)
      .set({ description: longDescription })
      .where(eq(Event.id, fixture.events.duesId));
    await page.reload();
    await expect(
      dialog.getByRole("heading", { name: "Dues Member Workshop" }),
    ).toBeFocused();
    await expect(
      dialog.getByRole("heading", { name: "What to bring" }),
    ).toBeVisible();
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("member-event-long-320.png"),
    });
    await dialog
      .getByText("Final preparation: charge your laptop before arriving.")
      .scrollIntoViewIfNeeded();
    await expect(
      dialog.getByText(
        "Final preparation: charge your laptop before arriving.",
      ),
    ).toBeVisible();
    await dialog
      .getByRole("link", { name: "Pay dues" })
      .scrollIntoViewIfNeeded();
    await expect(dialog.getByRole("link", { name: "Pay dues" })).toBeVisible();
  });
});
