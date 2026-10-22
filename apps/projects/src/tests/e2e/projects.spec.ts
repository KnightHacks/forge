import { expect, test } from "playwright/test";

test("home leads into the archive and a technical case study", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Make something worth taking apart." }),
  ).toBeVisible();
  await expect(page.getByText("Illustrative preview")).toHaveCount(0);
  await expect(page.getByText("Fixture").first()).toBeVisible();

  await page.getByRole("link", { name: /Explore the archive/ }).click();
  await expect(page).toHaveURL(/\/archive$/);
  await page
    .getByRole("link", { name: /Signal Garden/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/archive\/signal-garden$/);
  await expect(
    page.getByRole("heading", { name: "Start with the moment the map fails" }),
  ).toBeVisible();
  await expect(
    page.getByRole("figure", { name: "Architecture at a glance" }),
  ).toBeVisible();
  await expect(
    page.getByText("Fictional case-study fixture", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Repository/ })).toHaveAttribute(
    "href",
    "https://example.com/signal-garden-repository",
  );
});

test("archive area filters, search, empty state, and clear action work", async ({
  page,
}) => {
  await page.goto("/archive");
  await expect(
    page.getByText("Showing 6 of 6 illustrative projects"),
  ).toBeVisible();

  await page.getByRole("button", { name: "CV" }).click();
  await expect(page.getByRole("link", { name: /Canopy Count/ })).toBeVisible();
  await expect(
    page.getByText(
      "Showing 1 of 6 illustrative projects · CV",
    ),
  ).toBeVisible();

  await page
    .getByRole("searchbox", { name: "Search projects" })
    .fill("no matching fixture");
  await expect(
    page.getByRole("heading", { name: "No projects match those filters" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Clear search and filters" }).click();
  await expect(
    page.getByText("Showing 6 of 6 illustrative projects"),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Rover Relay/ })).toBeVisible();
});

test("area discovery link opens a prefiltered archive", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "ML" }).click();
  await expect(page).toHaveURL(/area=ML/);
  await expect(page.getByRole("link", { name: /Canopy Count/ })).toBeVisible();
  await expect(
    page.getByText("Showing 1 of 6 illustrative projects · ML"),
  ).toBeVisible();
});

test("public pages keep keyboard focus and fit a 320px viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const route of ["/", "/archive", "/archive/signal-garden"]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    const widths = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  }

  await page.goto("/archive");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Knight Hacks Projects home" }),
  ).toBeFocused();
});

test("unknown case studies render the branded not-found page", async ({
  page,
}) => {
  await page.goto("/archive/not-a-project");
  await expect(
    page.getByRole("heading", { name: "No project at this address." }),
  ).toBeVisible();
  await page
    .locator("#main-content")
    .getByRole("link", { name: /Browse the archive/ })
    .click();
  await expect(page).toHaveURL(/\/archive$/);
});
