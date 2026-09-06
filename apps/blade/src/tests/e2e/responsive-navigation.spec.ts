import type { Page } from "playwright/test";
import { expect, test } from "playwright/test";

import { PERMISSIONS } from "@forge/consts";
import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import { FormSections, Member } from "@forge/db/schemas/knight-hacks";

const userId = "b1ade000-0000-4000-8000-000000000001";
const roleId = "b1ade000-0000-4000-8000-000000000002";
const sectionId = "b1ade000-0000-4000-8000-000000000003";

async function cleanup() {
  await db.delete(Member).where(eq(Member.userId, userId));
  await db.delete(Permissions).where(eq(Permissions.userId, userId));
  await db.delete(User).where(eq(User.id, userId));
  await db.delete(Roles).where(eq(Roles.id, roleId));
  await db.delete(FormSections).where(eq(FormSections.id, sectionId));
}

test.beforeAll(async () => {
  await cleanup();
  await db.insert(User).values({
    id: userId,
    name: "Navigation Tester",
    discordUserId: "blade-navigation-e2e",
  });
  const keys: PERMISSIONS.PermissionKey[] = [
    "READ_MEMBERS",
    "READ_FORMS",
    "IS_OFFICER",
  ];
  const bits = Array.from(
    { length: Object.keys(PERMISSIONS.PERMISSION_DATA).length },
    () => "0",
  );
  for (const key of keys) bits[PERMISSIONS.PERMISSION_DATA[key].idx] = "1";
  await db.insert(Roles).values({
    id: roleId,
    name: "Navigation test",
    discordRoleId: "blade-navigation-e2e",
    permissions: bits.join(""),
  });
  await db.insert(Permissions).values({ userId, roleId });
  await db.insert(Member).values({
    userId,
    firstName: "Navigation",
    lastName: "Tester",
    discordUser: "blade-navigation-e2e",
    gradDate: "2027-05-02",
    dob: "2000-02-03",
    age: 26,
    email: "blade-navigation@example.test",
    phoneNumber: "321-555-0123",
    school: "University of Central Florida",
    levelOfStudy: "Undergraduate University (3+ year)",
    shirtSize: "M",
  });
  await db
    .insert(FormSections)
    .values({ id: sectionId, name: "Navigation test section" });
});
test.afterAll(cleanup);

async function signIn(page: Page) {
  await page.goto(`/api/e2e/signin?userId=${userId}&callbackURL=/admin/forms`);
  await expect(
    page.getByRole("heading", { name: "Form administration", exact: true }),
  ).toBeVisible();
  // Ensure the persistent navigation is hydrated before holding the next request.
  await page.getByRole("button", { name: "Expand navigation" }).click();
  await expect(
    page.getByRole("button", { name: "Collapse navigation" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Collapse navigation" }).click();
}

async function holdNavigation(page: Page, pathname: string) {
  let release!: () => void;
  let requested!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const request = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route(
    (url) => url.pathname === pathname,
    async (route) => {
      if (!route.request().headers().rsc) return route.continue();
      requested();
      const response = await route.fetch();
      await gate;
      await route.fulfill({ response });
    },
  );
  return { release, request };
}

async function expectNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("navigation responds before the server and stays usable on repeat and back", async ({
  page,
}, testInfo) => {
  await signIn(page);
  const held = await holdNavigation(page, "/admin/members");
  try {
    await page
      .getByRole("navigation", { name: "Primary", exact: true })
      .getByRole("link", { name: "Members", exact: true })
      .click();
    await held.request;
    await expect(
      page.getByRole("progressbar", { name: "Loading page" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Form administration", exact: true }),
    ).toBeVisible();
    await expectNoOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath("navigation-desktop.png"),
    });
  } finally {
    held.release();
  }
  await expect(page).toHaveURL(/\/admin\/members$/);
  await expect(
    page.getByRole("heading", { name: "Members", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Form administration", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Primary", exact: true })
    .getByRole("link", { name: "Members", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/members$/);
  await expect(page.getByRole("progressbar")).toHaveCount(0);
});

test("mobile drawer closes immediately while reduced-motion feedback persists", async ({
  page,
}, testInfo) => {
  await signIn(page);
  await page.setViewportSize({ width: 320, height: 760 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const held = await holdNavigation(page, "/admin/members");
  try {
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    await page
      .getByRole("navigation", { name: "Mobile primary navigation" })
      .getByRole("link", { name: "Members", exact: true })
      .click();
    await held.request;
    await expect(
      page.getByRole("navigation", { name: "Mobile primary navigation" }),
    ).toHaveCount(0);
    const progress = page.getByRole("progressbar", { name: "Loading page" });
    await expect(progress).toBeVisible();
    await expect(progress.locator("div")).toHaveCSS("animation-name", "none");
    await expectNoOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath("navigation-mobile.png"),
    });
  } finally {
    held.release();
  }
  await expect(page).toHaveURL(/\/admin\/members$/);
  await expect(page.getByRole("progressbar")).toHaveCount(0);
});

test("a form section selector reflects the choice before its response", async ({
  page,
}) => {
  await signIn(page);
  const held = await holdNavigation(page, "/admin/forms");
  try {
    await page
      .getByRole("combobox", { name: "Form section" })
      .selectOption(sectionId);
    await held.request;
    await expect(
      page.getByRole("combobox", { name: "Form section" }),
    ).toHaveValue(sectionId);
    await expect(page.getByRole("progressbar")).toBeVisible();
  } finally {
    held.release();
  }
  await expect(page).toHaveURL(new RegExp(`section=${sectionId}`));
  await expect(page.getByRole("progressbar")).toHaveCount(0);
});

test("a second navigation interrupts the first without waiting for its response", async ({
  page,
}) => {
  await signIn(page);
  const held = await holdNavigation(page, "/admin/members");
  try {
    const rail = page.getByRole("navigation", { name: "Primary", exact: true });
    await rail.getByRole("link", { name: "Members", exact: true }).click();
    await held.request;
    await expect(page.getByRole("progressbar")).toBeVisible();
    await rail.getByRole("link", { name: "Forms", exact: true }).click();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await expect(page).toHaveURL(/\/admin\/forms$/);
  } finally {
    held.release();
  }
});

test("search uses client navigation and keeps the shell mounted", async ({
  page,
}) => {
  await signIn(page);
  const held = await holdNavigation(page, "/admin/forms");
  try {
    await page
      .getByRole("searchbox", { name: "Search forms" })
      .fill("navigation");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await held.request;
    await expect(page.getByRole("progressbar")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Expand navigation" }),
    ).toBeVisible();
  } finally {
    held.release();
  }
  await expect(page).toHaveURL(/query=navigation/);
  await expect(page.getByRole("progressbar")).toHaveCount(0);
});

test("unsaved settings cancel navigation without starting progress", async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Edit member profile" }),
  ).toBeVisible();
  await page.getByPlaceholder("Lenny").fill("Unsaved navigation");
  await page
    .getByRole("navigation", { name: "Primary", exact: true })
    .getByRole("link", { name: "Forms", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Leave with unsaved changes?" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/member\/settings$/);
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/forms$/);
  await expect(page.getByRole("progressbar")).toHaveCount(0);
});

test("applying issue filters closes the dialog before the response", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/admin/issues/list");
  await expect(
    page.getByRole("heading", { name: "Issues", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Filter issues" });
  await dialog.getByLabel("Search", { exact: true }).fill("navigation");
  const held = await holdNavigation(page, "/admin/issues/list");
  try {
    await dialog.getByRole("button", { name: "Apply filters" }).click();
    await held.request;
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("progressbar")).toBeVisible();
  } finally {
    held.release();
  }
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page).toHaveURL(/q=navigation/);
});
