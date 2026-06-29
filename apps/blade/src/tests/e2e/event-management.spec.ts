import type { APIRequestContext, Page } from "playwright/test";
import { expect, test } from "playwright/test";

const ADMIN_PATH = "/admin/events";

interface EventManagementFixture {
  events: {
    attendedId: string;
    partialId: string;
    publishedId: string;
  };
  member: {
    id: string;
    name: string;
  };
  users: {
    checkInId: string;
    editorId: string;
    readerId: string;
    unauthorizedId: string;
  };
}

async function seedEventManagement(request: APIRequestContext) {
  const response = await request.post("/api/e2e/events", {
    data: { scenario: "event-management" },
  });

  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()) as EventManagementFixture;
}

async function cleanupEventManagement(request: APIRequestContext) {
  const response = await request.delete("/api/e2e/events");
  expect([200, 204]).toContain(response.status());
}

class EventManagementPage {
  constructor(readonly page: Page) {}

  async signIn(userId: string, callbackURL = ADMIN_PATH) {
    await this.page.goto(
      `/api/e2e/signin?userId=${encodeURIComponent(userId)}&callbackURL=${encodeURIComponent(callbackURL)}`,
    );
  }

  async openEvent(eventId: string) {
    await this.page.goto(`${ADMIN_PATH}?view=list&event=${eventId}`);
    return this.page.getByRole("dialog", { name: /event details/i });
  }
}

test.describe("event management", () => {
  let fixture: EventManagementFixture;
  let seeded = false;

  test.beforeEach(async ({ request }) => {
    seeded = false;
    fixture = await seedEventManagement(request);
    seeded = true;
  });

  test.afterEach(async ({ request }) => {
    if (seeded) await cleanupEventManagement(request);
  });

  test("TC-005 TC-NEG-001 separates reader, check-in, and unauthorized routes", async ({
    page,
  }) => {
    const events = new EventManagementPage(page);

    await page.goto(ADMIN_PATH);
    await expect(page).toHaveURL(/\/$/);

    await events.signIn(fixture.users.unauthorizedId);
    await expect(page).toHaveURL(/\/member\/dashboard$/);

    await events.signIn(fixture.users.readerId);
    await expect(
      page.getByRole("heading", { name: "Event management" }),
    ).toBeVisible();
    const sections = page.getByRole("navigation", {
      name: "Event management sections",
    });
    await expect(
      sections.getByRole("link", { name: "List", exact: true }),
    ).toBeVisible();
    await expect(
      sections.getByRole("link", { name: "Calendar", exact: true }),
    ).toBeVisible();
    await expect(
      sections.getByRole("link", { name: "Tags", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Create event" }),
    ).toHaveCount(0);

    await events.signIn(fixture.users.checkInId, `${ADMIN_PATH}?view=list`);
    await expect(page).toHaveURL(/\/admin\/events\?view=check-in$/);
    await expect(
      page.getByRole("heading", { name: "Event check-in" }),
    ).toBeVisible();
    await expect(page.getByRole("table", { name: "Events" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Tags" })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /export attendance/i }),
    ).toHaveCount(0);
  });

  test("TC-006 TC-007 TC-030 preserves URL state and responsive event detail", async ({
    page,
  }, testInfo) => {
    const events = new EventManagementPage(page);
    const callbackURL = `${ADMIN_PATH}?view=list&q=workshop&tag=Workshop&pageSize=50&event=${fixture.events.publishedId}`;

    await events.signIn(fixture.users.readerId, callbackURL);
    await expect(page).toHaveURL(/q=workshop/);
    await expect(page).toHaveURL(/tag=Workshop/);
    await expect(page).toHaveURL(/pageSize=50/);
    await expect(page).toHaveURL(
      new RegExp(`event=${fixture.events.publishedId}`),
    );

    const detail = page.getByRole("dialog", { name: /event details/i });
    await expect(detail).toBeVisible();
    await expect(
      detail.getByRole("heading", { name: "Current Workshop" }),
    ).toBeVisible();
    await expect(
      detail.getByRole("heading", { name: "Overview" }),
    ).toBeVisible();
    await expect(
      detail.getByRole("heading", { name: "Schedule & location" }),
    ).toBeVisible();
    await expect(
      detail.getByRole("heading", { name: "Audience & points" }),
    ).toBeVisible();
    await expect(
      detail.getByRole("heading", { name: "Integration health" }),
    ).toBeVisible();
    await expect(
      detail.getByRole("heading", { name: "Attendance" }),
    ).toBeVisible();

    await page.reload();
    await expect(detail).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Page size" })).toHaveValue(
      "50",
    );
    await expect(
      page.getByRole("combobox", { name: "Page size" }).getByRole("option"),
    ).toHaveText(["25", "50", "100", "250", "500"]);

    await page.setViewportSize({ height: 780, width: 320 });
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      )
      .toBe(true);
    await expect(detail).toBeVisible();
    await page.screenshot({
      fullPage: true,
      path: testInfo.outputPath("event-detail-320.png"),
    });
  });

  test("TC-008 TC-012 restores a local draft and repairs only the failed provider", async ({
    page,
  }) => {
    const events = new EventManagementPage(page);
    await events.signIn(fixture.users.editorId);

    await page.getByRole("button", { name: "Create event" }).click();
    const createDialog = page.getByRole("dialog", { name: "Create event" });
    await createDialog.getByLabel("Event name").fill("Draft Workshop");
    await createDialog.getByLabel("Description").fill("Unsaved browser draft");
    await createDialog.getByRole("button", { name: "Close" }).click();

    await page.reload();
    await page.getByRole("button", { name: "Create event" }).click();
    await page.getByRole("button", { name: "Restore draft" }).click();
    await expect(createDialog.getByLabel("Event name")).toHaveValue(
      "Draft Workshop",
    );
    await createDialog.getByRole("button", { name: "Close" }).click();

    const detail = await events.openEvent(fixture.events.partialId);
    await expect(detail.getByText("Needs attention")).toBeVisible();
    await expect(detail.getByText("Discord synchronized")).toBeVisible();
    await detail
      .getByRole("button", { name: "Repair Google Calendar" })
      .click();
    await expect(
      detail.getByText("Google Calendar synchronized"),
    ).toBeVisible();
    await expect(detail.getByText("Needs attention")).toHaveCount(0);
  });

  test("TC-020 TC-022 TC-025 TC-032 keeps manual check-in minimal and idempotent", async ({
    page,
  }) => {
    const events = new EventManagementPage(page);
    await events.signIn(fixture.users.checkInId, `${ADMIN_PATH}?view=check-in`);

    await page
      .getByRole("combobox", { name: "Event" })
      .selectOption(fixture.events.attendedId);
    await page.getByRole("button", { name: "Manual lookup" }).click();
    await page.getByRole("searchbox", { name: "Find member" }).fill("Ada");
    await page
      .getByRole("button", { name: new RegExp(fixture.member.name) })
      .click();
    await page
      .getByRole("button", { name: `Check in ${fixture.member.name}` })
      .click();
    await expect(page.getByRole("status")).toContainText("Checked in");

    await page
      .getByRole("button", { name: `Check in ${fixture.member.name}` })
      .click();
    await expect(page.getByRole("status")).toContainText("Already checked in");
    await expect(page.getByRole("link", { name: /attendees/i })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /export attendance/i }),
    ).toHaveCount(0);

    await events.signIn(fixture.users.editorId);
    const detail = await events.openEvent(fixture.events.attendedId);
    await expect(
      detail.getByText("Events with attendance cannot be deleted"),
    ).toBeVisible();
    await expect(
      detail.getByRole("button", { name: "Confirm delete event" }),
    ).toHaveCount(0);
  });
});
