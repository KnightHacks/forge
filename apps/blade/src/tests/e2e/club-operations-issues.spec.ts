import type { Page } from "playwright/test";
import { expect, test } from "playwright/test";

import { ISSUE, PERMISSIONS } from "@forge/consts";
import { eq, inArray, or } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import {
  Issue,
  IssueHistory,
  IssueReminderDelivery,
  IssuesToTeamsVisibility,
  IssuesToUsersAssignment,
  Template,
} from "@forge/db/schemas/knight-hacks";

const OFFICER_ID = "a8100000-0000-4000-8000-000000000001";
const OFFICER_ROLE_ID = "a8100000-0000-4000-8000-000000000011";
const PROGRAMS_ROLE_ID = "a8100000-0000-4000-8000-000000000012";
const MARKETING_ROLE_ID = "a8100000-0000-4000-8000-000000000013";
const PARTNERSHIPS_ROLE_ID = "a8100000-0000-4000-8000-000000000014";
const TEMPLATE_ID = "a8100000-0000-4000-8000-000000000021";
const ROLE_IDS = [
  OFFICER_ROLE_ID,
  PROGRAMS_ROLE_ID,
  MARKETING_ROLE_ID,
  PARTNERSHIPS_ROLE_ID,
];
const ISSUE_IDS = Array.from(
  { length: 64 },
  (_, index) =>
    `a8100000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`,
);
const ROOT_ISSUE_ID = "a8100000-0000-4000-8000-000000000100";

function permissionBitstring(...keys: PERMISSIONS.PermissionKey[]) {
  const bits = Array.from(
    { length: Object.keys(PERMISSIONS.PERMISSION_DATA).length },
    () => "0",
  );
  for (const key of keys) {
    const permission = PERMISSIONS.PERMISSION_DATA[key];
    bits[permission.idx] = "1";
  }
  return bits.join("");
}

async function cleanupIssuesFixture() {
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
  await db.delete(Template).where(eq(Template.id, TEMPLATE_ID));
  await db
    .delete(Permissions)
    .where(
      or(
        eq(Permissions.userId, OFFICER_ID),
        inArray(Permissions.roleId, ROLE_IDS),
      ),
    );
  await db.delete(Roles).where(inArray(Roles.id, ROLE_IDS));
  await db.delete(User).where(eq(User.id, OFFICER_ID));
}

async function seedIssuesFixture() {
  await cleanupIssuesFixture();
  await db.insert(User).values({
    discordUserId: "issues-officer-e2e",
    email: "issues-officer@example.test",
    id: OFFICER_ID,
    name: "Morgan Operations",
  });
  await db.insert(Roles).values([
    {
      discordRoleId: "issues-officer-role-e2e",
      id: OFFICER_ROLE_ID,
      name: "Officers",
      permissions: permissionBitstring("IS_OFFICER"),
      teamHexcodeColor: "#8b5cf6",
    },
    {
      discordRoleId: "issues-programs-role-e2e",
      id: PROGRAMS_ROLE_ID,
      name: "Programs",
      permissions: permissionBitstring("EDIT_ISSUES"),
      teamHexcodeColor: "#22c55e",
    },
    {
      discordRoleId: "issues-marketing-role-e2e",
      id: MARKETING_ROLE_ID,
      name: "Marketing",
      permissions: permissionBitstring("EDIT_ISSUES"),
      teamHexcodeColor: "#f59e0b",
    },
    {
      discordRoleId: "issues-partnerships-role-e2e",
      id: PARTNERSHIPS_ROLE_ID,
      name: "Partnerships",
      permissions: permissionBitstring("READ_ISSUES"),
      teamHexcodeColor: "#38bdf8",
    },
  ]);
  await db.insert(Permissions).values({
    roleId: OFFICER_ROLE_ID,
    userId: OFFICER_ID,
  });

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const statuses = ISSUE.ISSUE_STATUS;
  const priorities = ISSUE.PRIORITY;
  const teams = [PROGRAMS_ROLE_ID, MARKETING_ROLE_ID, PARTNERSHIPS_ROLE_ID];
  const titles = [
    "Finalize fall kickoff run of show",
    "Confirm workshop mentor roster",
    "Review partner activation brief",
    "Publish member newsletter",
    "Book general body meeting room",
    "Reconcile event supply inventory",
    "Prepare onboarding follow-up",
    "Approve social launch assets",
  ];

  await db.insert(Issue).values(
    ISSUE_IDS.map((id, index) => ({
      creator: OFFICER_ID,
      date: new Date(Date.UTC(year, month, (index % 27) + 1, 23, 0)),
      description:
        index === 0
          ? "## Launch checklist\n\nConfirm the final owner, venue handoff, and communications sequence.\n\n- Verify access\n- Share the runbook\n- Capture decisions"
          : `Operational context for ${titles[index % titles.length]}.`,
      dueAt:
        index % 9 === 0
          ? null
          : new Date(Date.UTC(year, month, (index % 27) + 1, 23, 0)),
      id,
      links: index % 5 === 0 ? ["https://example.com/runbook"] : [],
      name: `${titles[index % titles.length]}${index >= titles.length ? ` · ${index + 1}` : ""}`,
      priority: priorities[index % priorities.length] ?? "Medium",
      status: statuses[index % statuses.length] ?? "Backlog",
      team: teams[index % teams.length] ?? PROGRAMS_ROLE_ID,
    })),
  );
  await db.insert(IssueHistory).values(
    Array.from({ length: 32 }, (_, index) => ({
      action: index === 31 ? "created" : "updated",
      actorDisplayName: index % 3 === 0 ? "Morgan Operations" : "System",
      actorId: index % 3 === 0 ? OFFICER_ID : null,
      after: { revision: 32 - index },
      before: { revision: 31 - index },
      changedFields: index === 31 ? [] : ["status"],
      createdAt: new Date(Date.now() - index * 60_000),
      issueId: ROOT_ISSUE_ID,
    })),
  );
  await db.insert(IssuesToTeamsVisibility).values(
    ISSUE_IDS.slice(0, 12).map((issueId) => ({
      issueId,
      teamId: PARTNERSHIPS_ROLE_ID,
    })),
  );
  await db.insert(Template).values({
    body: {
      children: [
        {
          children: [],
          description: "Coordinate the handoff for {PARENT}.",
          name: "Confirm owner for {PARENT}",
          priority: "Medium",
          relativeDueDays: 2,
          status: "Backlog",
          team: PROGRAMS_ROLE_ID,
        },
      ],
      description: "## Goal\n\n{INPUT}",
      name: "{INPUT}",
      priority: "High",
      relativeDueDays: 7,
      status: "Planning",
      team: PROGRAMS_ROLE_ID,
    },
    id: TEMPLATE_ID,
    name: "Program launch",
    normalizedName: "program launch",
  });
}

async function signIn(page: Page, callbackURL: string) {
  await page.goto(
    `/api/e2e/signin?userId=${encodeURIComponent(OFFICER_ID)}&callbackURL=${encodeURIComponent(callbackURL)}`,
  );
}

test.describe("Club operations issues visual workflow", () => {
  test.beforeEach(async () => seedIssuesFixture());
  test.afterEach(async () => cleanupIssuesFixture());

  test("renders the complete dense month and dedicated operational views", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ height: 768, width: 1366 });
    await signIn(page, "/admin/issues/calendar");
    await expect(page.getByRole("heading", { name: "Issues" })).toBeVisible();
    await expect(
      page.locator('[data-issue-calendar="month-grid"]'),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: "Open Finalize fall kickoff run of show · 9",
      }),
    ).toBeVisible();
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("issues-calendar-laptop.png"),
    });

    const calendarDockHeight = await page
      .locator("[data-issue-dock]")
      .evaluate((element) => element.getBoundingClientRect().height);
    const calendarContextHeight = await page
      .locator("[data-issue-context]")
      .evaluate((element) => element.getBoundingClientRect().height);

    const calendarBox = await page
      .locator('[data-issue-calendar="month-grid"]')
      .boundingBox();
    expect(calendarBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(390);
    expect(
      (calendarBox?.y ?? 0) + (calendarBox?.height ?? 0),
    ).toBeLessThanOrEqual(768);

    await page.getByRole("button", { name: "Filters", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: /filter issues/i }),
    ).toBeVisible();
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("issues-filters-laptop.png"),
    });
    await page.keyboard.press("Escape");

    await page.getByRole("link", { name: "Kanban", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/issues\/kanban/);
    await expect
      .poll(() =>
        page
          .locator("[data-issue-dock]")
          .evaluate((element) => element.getBoundingClientRect().height),
      )
      .toBe(calendarDockHeight);
    await expect
      .poll(() =>
        page
          .locator("[data-issue-context]")
          .evaluate((element) => element.getBoundingClientRect().height),
      )
      .toBe(calendarContextHeight);
    await expect
      .poll(() => page.locator('[aria-label^="Open "]').count())
      .toBeGreaterThanOrEqual(64);
    for (const status of ISSUE.ISSUE_STATUS) {
      await expect(page.getByRole("heading", { name: status })).toBeVisible();
    }
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: testInfo.outputPath("issues-kanban-desktop.png"),
    });

    await page.getByRole("link", { name: "List", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/issues\/list/);
    await expect
      .poll(() =>
        page
          .locator("[data-issue-dock]")
          .evaluate((element) => element.getBoundingClientRect().height),
      )
      .toBe(calendarDockHeight);
    await expect
      .poll(() =>
        page
          .locator("[data-issue-context]")
          .evaluate((element) => element.getBoundingClientRect().height),
      )
      .toBe(calendarContextHeight);
    await expect(page.getByText(/Page 1 of \d+/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Next" })).toBeVisible();
    await expect(page.getByLabel("Sort issues")).toBeVisible();
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: testInfo.outputPath("issues-list-desktop.png"),
    });

    await page.goto(`/admin/issues/${ISSUE_IDS[0]}`);
    await expect(
      page.getByRole("heading", { name: "Finalize fall kickoff run of show" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Load older history" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Load older history" }).click();
    await expect(page.getByText("32", { exact: true })).toBeVisible();
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: testInfo.outputPath("issues-detail-desktop.png"),
    });
  });

  test("keeps creation and mobile agenda focused at 320px", async ({
    page,
  }, testInfo) => {
    await signIn(page, "/admin/issues/calendar");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: /create an issue/i }),
    ).toBeVisible();
    await expect(
      page.getByText("Program launch", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Program launch" }).click();
    await page.getByLabel("Template value").fill("Fall kickoff");
    await page.getByRole("button", { name: "Apply template tree" }).click();
    await expect(page.getByText(/atomically add 1 direct child/)).toBeVisible();
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("issues-create-desktop.png"),
    });
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Templates", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: /issue templates/i }),
    ).toBeVisible();
    await expect(page.getByText("Root", { exact: true })).toBeVisible();
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("issues-templates-desktop.png"),
    });
    await page.keyboard.press("Escape");

    await page.setViewportSize({ height: 900, width: 320 });
    await page.reload();
    await expect(
      page.locator('[data-issue-calendar="agenda"]').first(),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: testInfo.outputPath("issues-calendar-320.png"),
    });
  });
});
