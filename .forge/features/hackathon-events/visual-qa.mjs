import { chromium } from "playwright";

const baseURL = process.env.BLADE_VISUAL_BASE_URL ?? "http://localhost:3100";
const userId = "788d99f1-3b16-4edb-8482-683d052fed56";
const output = new URL("./visuals/", import.meta.url).pathname;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { height: 1000, width: 1440 } });
await page.goto(
  `${baseURL}/api/e2e/signin?userId=${userId}&callbackURL=${encodeURIComponent("/admin/hackathon-events")}`,
);
await page.getByRole("heading", { name: "Hackathon Events" }).waitFor();
await page.getByText("Loading events…").first().waitFor({ state: "hidden" });
await page.screenshot({
  fullPage: true,
  path: `${output}hack-list-desktop.png`,
});

await page.getByRole("link", { name: "Calendar" }).click();
await page
  .getByRole("link", { name: "Calendar" })
  .waitFor({ state: "visible" });
await page.getByRole("button", { exact: true, name: "Month" }).waitFor();
await page.screenshot({
  fullPage: true,
  path: `${output}hack-calendar-desktop.png`,
});
await page
  .locator('.fc-daygrid-day[data-date="2026-08-05"]')
  .click({ position: { x: 24, y: 70 } });
await page.waitForTimeout(250);
await page.screenshot({
  fullPage: true,
  path: `${output}hack-day-desktop.png`,
});

await page.getByRole("link", { name: "Tags" }).click();
await page.getByRole("heading", { name: "Event tags" }).waitFor();
await page.screenshot({
  fullPage: true,
  path: `${output}hack-tags-desktop.png`,
});
await page.getByRole("button", { name: "Import previous tags" }).click();
await page
  .getByRole("dialog", { name: "Import previous hackathon tags" })
  .waitFor();
await page.getByText("Loading previous tags…").waitFor({ state: "hidden" });
await page.waitForTimeout(250);
await page.screenshot({
  fullPage: true,
  path: `${output}hack-tag-import-desktop.png`,
});
await page.getByRole("button", { name: "Cancel" }).click();

await page.setViewportSize({ height: 844, width: 390 });
await page.getByRole("link", { name: "List" }).click();
await page.waitForURL(/view=list/);
await page.getByText("Loading events…").first().waitFor({ state: "hidden" });
await page.waitForTimeout(250);
await page.screenshot({
  fullPage: true,
  path: `${output}hack-list-mobile.png`,
});
await page.getByRole("link", { name: "Calendar" }).click();
await page.waitForURL(/view=calendar/);
await page.getByLabel("Calendar day").waitFor();
await page.screenshot({
  fullPage: true,
  path: `${output}hack-calendar-mobile.png`,
});

await page.setViewportSize({ height: 1000, width: 1440 });
await page.goto(`${baseURL}/admin/events?view=list`);
await page.getByRole("heading", { name: "Event management" }).waitFor();
await page.screenshot({
  fullPage: true,
  path: `${output}club-list-desktop.png`,
});
await page.getByRole("link", { name: "Calendar" }).click();
await page.getByRole("button", { exact: true, name: "Month" }).waitFor();
await page.screenshot({
  fullPage: true,
  path: `${output}club-calendar-desktop.png`,
});
await page.locator(".fc-timeGridDay-button").click();
await page.waitForTimeout(250);
await page.screenshot({
  fullPage: true,
  path: `${output}club-day-desktop.png`,
});

await browser.close();
