import { expect, test } from "playwright/test";

const retainedRoutes = [
  ["/", "Knight Hacks"],
  ["/about", "About Us"],
  ["/sponsors", "Our Sponsors"],
  ["/schedule", "Schedule"],
  ["/faq", "FAQ"],
  ["/attributions", "Attributions"],
] as const;

test("serves every retained public page", async ({ page }) => {
  for (const [route, heading] of retainedRoutes) {
    const response = await page.goto(route);
    expect(response?.ok()).toBe(true);
    await expect(
      page
        .getByRole(route === "/" ? "img" : "heading", {
          name: heading,
          exact: true,
        })
        .first(),
    ).toBeVisible();
  }
});

test("contains no historical workflow controls or backend traffic", async ({
  page,
}) => {
  const forbiddenRequests: string[] = [];
  const browserErrors: string[] = [];
  page.on("request", (request) => {
    if (
      /api\.knighthacks|firebase|googleapis|clerk|trpc|sentry/i.test(
        request.url(),
      )
    ) {
      forbiddenRequests.push(request.url());
    }
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  await page.goto("/");
  await expect(
    page.getByRole("link", { name: /register|apply|sign in|dashboard/i }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /register|apply|sign in|dashboard/i }),
  ).toHaveCount(0);
  expect(forbiddenRequests).toEqual([]);
  expect(browserErrors).toEqual([]);
});

test("menu links reach every retained page and can be dismissed", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  const dialog = page.getByRole("dialog", { name: "Site navigation" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("link", { name: "Attributions" }).click();
  await expect(page).toHaveURL(/\/attributions$/);
  await expect(dialog).toHaveCount(0);

  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    dialog.getByRole("button", { name: "Close navigation" }).first(),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("link", { name: "Attributions" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Close navigation" }).first(),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
});

test("mobile and reduced-motion views preserve the public content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/faq");

  await expect(page.getByRole("heading", { name: "FAQ" })).toBeVisible();
  await page
    .locator("summary")
    .filter({ hasText: "What is Knight Hacks?" })
    .click();
  await expect(page.getByText(/massive hackathon/)).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test("production image enforces the archive route policy", async ({
  request,
}) => {
  for (const path of ["/register", "/Success", "/dashboard/profile"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(410);
    await expect(response.text()).resolves.toContain("This event has ended");
  }

  expect((await request.get("/not-a-real-archive-page")).status()).toBe(404);
});
