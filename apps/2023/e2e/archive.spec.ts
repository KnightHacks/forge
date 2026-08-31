import { expect, test } from "playwright/test";

const forbiddenRequest =
  /firebase|firestore|googleapis|firebaseio|knighthacks-api|clerk|trpc/i;

test("renders the public archive without historical workflow controls", async ({
  page,
}) => {
  const legacyRequests: string[] = [];
  page.on("request", (request) => {
    if (forbiddenRequest.test(request.url()))
      legacyRequests.push(request.url());
  });

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Choose Your Own Adventure" }),
  ).toBeVisible();
  await expect(page.getByText("October 6-8, 2023")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /register|apply|sign in|dashboard/i }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /register|apply|sign in|dashboard/i }),
  ).toHaveCount(0);
  expect(legacyRequests).toEqual([]);
});

test("preserves the public FAQ and locally owned sponsor artwork", async ({
  page,
}) => {
  await page.goto("/");

  const secondQuestion = page.getByRole("button", {
    name: "How long is Knight Hacks?",
  });
  await secondQuestion.click();
  await expect(secondQuestion).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText(/36-hour hackathon/)).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Siemens Energy logo" }),
  ).toHaveAttribute("src", "/assets/siemens.png");
});

test("keeps the social graphic route static and secretless", async ({
  page,
}) => {
  const legacyRequests: string[] = [];
  page.on("request", (request) => {
    if (forbiddenRequest.test(request.url()))
      legacyRequests.push(request.url());
  });

  await page.goto("/social");

  await expect(
    page.getByRole("heading", { name: "Social Media Graphics" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Download Post" }),
  ).toHaveAttribute("href", "/post.png");
  await expect(
    page.getByRole("link", { name: "Download Story" }),
  ).toHaveAttribute("href", "/story.png");
  expect(legacyRequests).toEqual([]);
});

test("production image enforces the archive route policy", async ({
  request,
}) => {
  for (const path of ["/auth", "/register", "/dashboard", "/application"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(410);
    await expect(response.text()).resolves.toContain("This event has ended");
  }

  expect((await request.get("/not-a-real-archive-page")).status()).toBe(404);
});

test("mobile archive has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");

  const dimensions = await page.locator("body").evaluate((body) => ({
    clientWidth: body.clientWidth,
    scrollWidth: body.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  await expect(page.getByRole("heading", { name: "Sponsors" })).toBeVisible();
});
