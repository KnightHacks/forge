import { expect, test } from "playwright/test";

import {
  BUILDER_FORM_ID,
  cleanupVisualFixture,
  DIRECTORY_QUERY,
  FORM_SECTION_ID,
  ISSUE_TEAM_IDS,
  ISSUES_CALENDAR_DATE,
  seedVisualFixture,
  VISUAL_USER_ID,
} from "./visual-fixtures";
import {
  DESKTOP_VIEWPORT,
  expectVisualBaseline,
  MOBILE_VIEWPORT,
  preparePage,
  signInAs,
} from "./visual-harness";

/**
 * Visual-regression baselines for the surfaces Tier 3 of the component
 * refactor touches.
 *
 * These are the only `toHaveScreenshot` assertions in the repo. They exist
 * because Tier 3 moves JSX, and Blade's layout is built on sibling-scoped
 * Tailwind: `adminPageLayoutClassName` ends in `space-y-4 sm:space-y-6`, which
 * compiles to `> * + *` and applies to direct children only. Extracting a
 * component that introduces one wrapper `<div>` deletes a gap with no type
 * error, no lint error, and no failing unit test. `divide-y`,
 * `first:border-l-0` and `last:border-r-0` fail identically.
 *
 * Every URL below is fully pinned — sort, page size, calendar month, team
 * filter, and search query all come from the query string rather than from a
 * default that depends on the current date or on whatever else is in the dev
 * database. Blade e2e runs against the developer's own Postgres, which holds
 * real Club records; a baseline that reads ambient rows is a baseline that
 * fails for reasons unrelated to the change under review.
 *
 * Two surfaces named in the original brief are deliberately absent — the
 * analytics dashboard and the email portal. Neither can be scoped to a
 * fixture, and the reasoning is recorded in DESIGN_SYSTEM.md so that nobody
 * re-adds them without also solving the underlying database isolation.
 */

const MEMBERS_URL = `/admin/members?q=${DIRECTORY_QUERY}&sort=name&direction=asc&pageSize=25`;
const FORMS_LIST_URL = `/admin/forms?section=${FORM_SECTION_ID}`;
const FORM_BUILDER_URL = `/admin/forms/${BUILDER_FORM_ID}`;
const TEAM_FILTER = ISSUE_TEAM_IDS.map((teamId) => `team=${teamId}`).join("&");
const ISSUES_BASE = `date=${ISSUES_CALENDAR_DATE}&${TEAM_FILTER}`;
const ISSUES_LIST_URL = `/admin/issues/list?${ISSUES_BASE}&sort=dueAt&direction=asc&pageSize=25`;
const ISSUES_KANBAN_URL = `/admin/issues/kanban?${ISSUES_BASE}`;
const ISSUES_CALENDAR_URL = `/admin/issues/calendar?${ISSUES_BASE}&mode=month`;

test.describe("Blade visual baselines", () => {
  // Deliberately *not* `mode: "serial"`. These tests only read the fixture, so
  // they are independent, and serial mode would skip every baseline after the
  // first failure — which is precisely backwards for a visual suite, where the
  // useful output is the complete list of surfaces a change moved.
  // `fullyParallel: false` and `workers: 1` in playwright.config.ts already
  // guarantee they run one at a time.
  test.beforeAll(seedVisualFixture);
  test.afterAll(cleanupVisualFixture);

  test.beforeEach(async ({ page }) => {
    await preparePage(page);
  });

  test.describe("desktop", () => {
    test.use({ viewport: DESKTOP_VIEWPORT });

    test("form builder", async ({ page }) => {
      await signInAs(page, VISUAL_USER_ID, FORM_BUILDER_URL);
      await expect(
        page.getByRole("heading", { name: "Edit form" }),
      ).toBeVisible();
      await expect(page.locator("[data-sortable-question]")).toHaveCount(5);
      await expectVisualBaseline(page, "form-builder-desktop.png");
    });

    test("forms list", async ({ page }) => {
      await signInAs(page, VISUAL_USER_ID, FORMS_LIST_URL);
      await expect(page.getByText("Workshop feedback").first()).toBeVisible();
      await expectVisualBaseline(page, "forms-list-desktop.png");
    });

    test("issue workspace list view", async ({ page }) => {
      await signInAs(page, VISUAL_USER_ID, ISSUES_LIST_URL);
      await expect(
        page.getByText("Finalize fall kickoff run of show").first(),
      ).toBeVisible();
      await expectVisualBaseline(page, "issues-list-desktop.png");
    });

    test("issue workspace kanban view", async ({ page }) => {
      await signInAs(page, VISUAL_USER_ID, ISSUES_KANBAN_URL);
      await expect(
        page.getByText("Finalize fall kickoff run of show").first(),
      ).toBeVisible();
      await expectVisualBaseline(page, "issues-kanban-desktop.png");
    });

    test("issue workspace calendar view", async ({ page }) => {
      await signInAs(page, VISUAL_USER_ID, ISSUES_CALENDAR_URL);
      await expect(
        page.getByText("Finalize fall kickoff run of show").first(),
      ).toBeVisible();
      await expectVisualBaseline(page, "issues-calendar-desktop.png");
    });

    test("admin members table", async ({ page }) => {
      await signInAs(page, VISUAL_USER_ID, MEMBERS_URL);
      await expect(
        page.getByRole("heading", { name: "Members" }),
      ).toBeVisible();
      await expect(page.getByText("Avery").first()).toBeVisible();
      await expectVisualBaseline(page, "admin-members-desktop.png");
    });

    test("member settings", async ({ page }) => {
      await signInAs(page, VISUAL_USER_ID, "/member/settings");
      await expect(
        page.getByRole("heading", { name: "Edit member profile" }),
      ).toBeVisible();
      await expectVisualBaseline(page, "member-settings-desktop.png");
    });
  });

  test.describe("mobile", () => {
    test.use({ viewport: MOBILE_VIEWPORT });

    // The admin members table swaps to an entirely different tree below `md`
    // (`hidden md:block` table, `md:hidden` card list), so this is not a
    // narrower rendering of the desktop baseline — it is separate markup.
    test("admin members card list", async ({ page }) => {
      await signInAs(page, VISUAL_USER_ID, MEMBERS_URL);
      await expect(
        page.getByRole("heading", { name: "Members" }),
      ).toBeVisible();
      await expectVisualBaseline(page, "admin-members-mobile.png");
    });

    test("member settings", async ({ page }) => {
      await signInAs(page, VISUAL_USER_ID, "/member/settings");
      await expect(
        page.getByRole("heading", { name: "Edit member profile" }),
      ).toBeVisible();
      await expectVisualBaseline(page, "member-settings-mobile.png");
    });
  });
});
