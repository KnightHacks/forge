// tests/auth.setup.ts
import path from "path";
import { fileURLToPath } from "url";
import { chromium, expect, test as setup } from "@playwright/test";

setup("authenticate", async () => {
  // --- paths ---
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const storagePath = path.join(__dirname, "../playwright/.auth/user.json");

  // --- Your desired mocked session (exact shape) ---
  const mockSession = {
    user: {
      id: "220616e1-d14e-47bb-9bf8-9ea7a3eda3e7",
      discordUserId: "548640112033005589",
      name: "b0bdabu1lder",
      email: "lwbobda@gmail.com",
      emailVerified: null,
      image: "00609501642a3675a943b0f0396420bb",
    },
    sessionToken: "a0cd8ead-a5cf-477b-b7ef-9d15eab9e58f",
    userId: "220616e1-d14e-47bb-9bf8-9ea7a3eda3e7",
    expires: "2025-10-03T22:28:53.229Z",
  } as const;

  // Convert ISO expires -> epoch seconds for cookie
  const expiresEpoch =
    Math.floor(new Date(mockSession.expires).getTime() / 1000) || // from ISO
    Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // fallback 30d

  // Use non-__Secure cookie for http://localhost
  const cookieName = "next-auth.session-token"; // DB strategy expects a random token here

  // --- Build browser context with the signed-in cookie ---
  const browser = await chromium.launch();
  const context = await browser.newContext();

  // 1) Set cookie so server-side/session detection (via cookie) can proceed
  await context.addCookies([
    {
      name: cookieName,
      value: mockSession.sessionToken, // DB-style session token
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      expires: expiresEpoch,
    },
  ]);

  // 2) Stub the client-side session fetch to return your exact object
  await context.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockSession),
    });
  });

  // (Optional) If your app calls providers, you can stub it too:
  // await context.route("**/api/auth/providers", (route) =>
  //   route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  // );

  // Persist for your test run
  await context.storageState({ path: storagePath });

  const page = await context.newPage();
  await page.goto("http://localhost:3000/dashboard");

  // Sanity check: adjust to something your dashboard reliably shows for authed users
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
