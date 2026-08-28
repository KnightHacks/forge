import { expect, test } from "playwright/test";

test("renders the public archive without application infrastructure", async ({
  page,
}) => {
  const forbiddenRequests: string[] = [];
  page.on("request", (request) => {
    if (/clerk|trpc|knighthacks-api|firebase|googleapis/i.test(request.url())) {
      forbiddenRequests.push(request.url());
    }
  });

  await page.goto("/");
  await expect(
    page.getByRole("img", { name: /Knight Hacks VII/i }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sponsors" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /apply|register|sign in/i }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sponsor Us" })).toHaveCount(0);
  expect(forbiddenRequests).toEqual([]);
});

test("uses the authoritative static sponsor roster", async ({ page }) => {
  await page.goto("/#sponsors");

  for (const sponsor of [
    "ServiceNow",
    "IBM",
    "NextEra Energy",
    "BNY",
    "Siemens Energy",
    "Impress Ink",
    "Kinde",
    "Synopsys",
    "GEICO",
  ]) {
    await expect(page.getByRole("img", { name: sponsor })).toBeVisible();
  }
});

test("retains the public sections on mobile without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");

  await expect(page.getByText("Frequently Asked Questions")).toBeVisible();
  await expect(page.getByText("Get in Touch!")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});

test("production image enforces the archive route policy", async ({
  request,
}) => {
  for (const path of ["/apply", "/Login", "/dashboard/profile"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(410);
    await expect(response.text()).resolves.toContain("This event has ended");
  }

  expect((await request.get("/not-a-real-archive-page")).status()).toBe(404);
});
