import { expect, test } from "playwright/test";

test("renders the public archive without application controls", async ({
  page,
}) => {
  const legacyRequests: string[] = [];
  page.on("request", (request) => {
    if (/firebase|googleapis|knighthacks-api|clerk/i.test(request.url())) {
      legacyRequests.push(request.url());
    }
  });

  await page.goto("/");

  await expect(
    page.getByRole("img", { name: "Knight Hacks 2020" }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("October 9th - October 11th, 2020").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /register|apply|dashboard/i }),
  ).toHaveCount(0);
  expect(legacyRequests).toEqual([]);
});

test("desktop archive exposes the retained historical sections", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  for (const section of ["About", "Sponsors", "Schedule", "FAQ"]) {
    const button = page.getByRole("button", { name: section, exact: true });
    await expect(async () => {
      await button.click();
      await expect(button).toHaveAttribute("aria-current", "page", {
        timeout: 1_000,
      });
    }).toPass();
  }
});

test("mobile archive preserves the public story without registration", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByText("Connect.", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Schedule" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sponsors" })).toBeVisible();
  await expect(page.getByText(/register now/i)).toHaveCount(0);
});

test("reduced-motion visitors receive a stable sponsor roster", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Sponsors", exact: true }).click();

  const grid = page.getByLabel("2020 sponsors");
  await expect(grid).toBeVisible();
  await expect(grid.getByRole("img")).toHaveCount(10);
  await expect(page.locator(".sponsor-boat").first()).toBeHidden();
});

test("production image enforces the archive route policy", async ({
  request,
}) => {
  for (const path of ["/register", "/Accepted", "/dashboard/profile"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(410);
    await expect(response.text()).resolves.toContain("This event has ended");
  }

  expect((await request.get("/not-a-real-archive-page")).status()).toBe(404);
});
