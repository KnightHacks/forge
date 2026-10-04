import type { Page } from "playwright/test";
import { expect, test } from "playwright/test";

import type { HackerParticipantOutput } from "@forge/hacker-sdk";

test.afterEach(async ({ page }) => {
  expect(await page.pageErrors()).toEqual([]);
});

// Run against a local KHIX server: pnpm --filter=@forge/2026 e2e
// Only the browser's SDK requests are replaced; routing and the map are real.
const fixtures: {
  [Procedure in
    | "getSession"
    | "getPublicHackathon"
    | "getDashboard"
    | "getSchedule"
    | "getMapConfiguration"
    | "getJudging"]: HackerParticipantOutput<Procedure>;
} = {
  getSession: {
    authenticated: true,
    displayName: "Map Explorer",
    expiresAt: "2026-12-01T00:00:00Z",
  },
  getPublicHackathon: {
    agreements: [],
    applicationDeadline: "2026-10-01T00:00:00Z",
    applicationOpen: "2026-01-01T00:00:00Z",
    applicationUrl: null,
    confirmationCapacity: null,
    confirmationDeadline: "2026-10-01T00:00:00Z",
    displayName: "Knight Hacks IX",
    endDate: "2026-10-26T00:00:00Z",
    id: "11111111-1111-4111-8111-111111111111",
    name: "Knight Hacks IX",
    startDate: "2026-10-23T00:00:00Z",
    theme: "khix",
    timezone: "America/New_York",
  },
  getDashboard: {
    allowedActions: [],
    application: {
      checkedInAt: null,
      classId: null,
      className: null,
      confirmedAt: "2026-09-01T00:00:00Z",
      firstTime: false,
      isVip: false,
      profileRevision: 1,
      status: "confirmed",
      submittedAt: "2026-08-01T00:00:00Z",
      survey1: null,
      survey2: null,
    },
    isMinorAtHackStart: false,
    profile: {
      country: "United States of America",
      discordUser: "map-explorer",
      dob: "2000-01-01",
      email: "map@example.com",
      firstName: "Map",
      foodAllergies: null,
      gender: "Prefer not to answer",
      githubProfileUrl: null,
      gradDate: "2027-05-01",
      lastName: "Explorer",
      levelOfStudy: "Undergraduate University (3+ year)",
      linkedinProfileUrl: null,
      major: "Computer Science",
      phoneNumber: "555-0100",
      raceOrEthnicity: "Prefer not to answer",
      revision: 1,
      school: "University of Central Florida",
      shirtSize: "M",
      websiteUrl: null,
    },
    resume: null,
  },
  getSchedule: { events: [] },
  getMapConfiguration: { restrictionsEnabled: false, rooms: [] },
  getJudging: {
    appointments: [],
    claimsOpen: false,
    emergency: false,
    feedback: [],
    project: null,
    published: false,
    serverNow: "2026-10-01T00:00:00Z",
    timezone: "America/New_York",
    unscheduled: [],
  },
};

async function mockParticipant(page: Page, mapReady?: Promise<void>) {
  const responses = new Map<string, unknown>(Object.entries(fixtures));
  const calls = new Map<string, number>();
  await page.route("**/api/hacker-sdk/trpc/**", async (route) => {
    const url = new URL(route.request().url());
    const procedures = url.pathname.split("/").at(-1)?.split(",") ?? [];
    for (const procedure of procedures)
      calls.set(procedure, (calls.get(procedure) ?? 0) + 1);
    if (
      procedures.includes("getMapConfiguration") &&
      (calls.get("getMapConfiguration") ?? 0) > 1
    )
      await mapReady;
    const results = procedures.map((procedure) => {
      if (!responses.has(procedure))
        throw new Error(`Unexpected SDK procedure: ${procedure}`);
      // A batched response is atomic. Retry room policy separately so dashboard
      // data can render while the later policy response is deliberately held.
      if (
        mapReady &&
        procedure === "getMapConfiguration" &&
        calls.get(procedure) === 1
      )
        return {
          error: {
            code: -32603,
            message: "Room policy is loading",
            data: { domain: { code: "NETWORK_ERROR", retryable: true } },
          },
        };
      return { result: { data: responses.get(procedure) } };
    });
    await route.fulfill({
      json: url.searchParams.has("batch") ? results : results[0],
    });
  });
  return calls;
}

test("HEC101 redirects with its query and shows the unavailable-plan fallback", async ({
  page,
}) => {
  await mockParticipant(page);
  await page.goto("/map?location=HEC101&source=guide");
  await expect(page).toHaveURL(
    /\/dashboard\/map\?location=HEC101&source=guide$/,
  );
  await expect(page.locator('[data-building-id="hec"]')).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(
    page.getByText(
      "L3Harris Engineering Center · 101. Indoor plan unavailable. Showing the building.",
    ),
  ).toBeVisible();
  await expect(page.locator("[data-floor-geometry]")).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("khix-indoor-location")),
  ).toBeNull();
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(
    page.getByText(
      "L3Harris Engineering Center · 101. Indoor plan unavailable. Showing the building.",
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});

test("a room link waits for policy, highlights its floor, and respects later navigation", async ({
  page,
}) => {
  let releaseMap: () => void = () => undefined;
  const mapReady = new Promise<void>((resolve) => {
    releaseMap = () => {
      resolve();
    };
  });
  const calls = await mockParticipant(page, mapReady);
  await page.clock.install();
  await page.addInitScript(() => {
    localStorage.setItem(
      "khix-indoor-location",
      JSON.stringify({ buildingId: "ba1", room: "135" }),
    );
  });
  await page.goto("/dashboard/map?location=ENG1224");
  await expect(
    page.getByRole("region", { name: "Loading venue map" }),
  ).toBeVisible();
  await expect(page.locator("[data-floor-geometry]")).toHaveCount(0);
  await expect.poll(() => calls.get("getMapConfiguration")).toBe(2);
  releaseMap();
  await expect(page.getByRole("button", { name: "Floor 2" })).toHaveAttribute(
    "data-active",
    "true",
  );
  await expect(page.locator('[data-room-id="224"]')).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(page.getByText("Showing Engineering I · 224.")).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("khix-indoor-location")),
  ).toBe(JSON.stringify({ buildingId: "ba1", room: "135" }));
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.locator('[data-room-id="224"]')).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await page.getByRole("button", { name: "Floor 1" }).click();
  const policyCalls = calls.get("getMapConfiguration") ?? 0;
  await page.clock.fastForward(31_000);
  await expect
    .poll(() => calls.get("getMapConfiguration"))
    .toBeGreaterThan(policyCalls);
  await expect(page.getByRole("button", { name: "Floor 1" })).toHaveAttribute(
    "data-active",
    "true",
  );
  await expect(
    page.locator('[data-room-id][data-selected="true"]'),
  ).toHaveCount(0);
  await expect(page.getByText("Showing Engineering I · 224.")).toHaveCount(0);
});

test("a delayed campus map fits its viewport and supports wheel zoom", async ({
  page,
}) => {
  let releaseMap: () => void = () => undefined;
  const mapReady = new Promise<void>((resolve) => {
    releaseMap = () => {
      resolve();
    };
  });
  const calls = await mockParticipant(page, mapReady);
  await page.goto("/map?location=HEC101");
  await expect(
    page.getByRole("region", { name: "Loading venue map" }),
  ).toBeVisible();
  await expect.poll(() => calls.get("getMapConfiguration")).toBe(2);
  releaseMap();
  const map = page.getByRole("img", {
    name: "Interactive map of the Knight Hacks IX venue at UCF",
  });
  await expect(map).toBeVisible();
  await expect
    .poll(async () =>
      map.evaluate((svg) => {
        const values = (svg.getAttribute("viewBox") ?? "")
          .split(" ")
          .map(Number);
        const bounds = svg.getBoundingClientRect();
        return Math.abs(
          (values[2] ?? 0) / (values[3] ?? 0) - bounds.width / bounds.height,
        );
      }),
    )
    .toBeLessThan(0.01);
  const before = await map.getAttribute("viewBox");
  await map.hover();
  await page.mouse.wheel(0, -160);
  await expect(map).not.toHaveAttribute("viewBox", before ?? "");
});

for (const location of ["", "?location=", "?location=UNKNOWN101"]) {
  test(`the campus overview handles ${location || "no location"}`, async ({
    page,
  }) => {
    await mockParticipant(page);
    await page.goto(`/dashboard/map${location}`);
    await expect(
      page.getByRole("button", {
        name: "L3Harris Engineering Center",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator("[data-floor-geometry]")).toHaveCount(0);
    await expect(
      page.locator('[data-building-id][data-selected="true"]'),
    ).toHaveCount(0);
    if (location.includes("UNKNOWN")) {
      await expect(
        page.getByText(
          "Location not recognized. Choose a building on the map.",
        ),
      ).toBeVisible();
    }
  });
}

test("the Map navigation link clears the target and browser Back restores it", async ({
  page,
}) => {
  await mockParticipant(page);
  await page.goto("/dashboard/map?location=ENG1224");
  await expect(page.getByRole("button", { name: "Floor 2" })).toHaveAttribute(
    "data-active",
    "true",
  );
  await page.getByRole("link", { name: "Map", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/map$/);
  await expect(page.locator("[data-floor-geometry]")).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/location=ENG1224$/);
  await expect(page.locator('[data-room-id="224"]')).toHaveAttribute(
    "data-selected",
    "true",
  );
});

test("a direct mobile link keeps an edge room within the map viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await mockParticipant(page);
  await page.goto("/map?location=BA2205G");
  const room = page.locator('[data-room-id="205G"]');
  await expect(room).toHaveAttribute("data-selected", "true");
  await expect(room).toBeInViewport({ ratio: 0.5 });
});

test("an unmapped room falls back to its building and duplicate targets use the first value", async ({
  page,
}) => {
  await mockParticipant(page);
  await page.goto("/map?location=ENG2999");
  await expect(page.locator('[data-building-id="ucf-91"]')).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(
    page.getByText(
      "Engineering II · 999. Room not mapped. Showing the building.",
    ),
  ).toBeVisible();
  await expect(page.locator("[data-floor-geometry]")).toHaveCount(0);
  await page.goto("/map?location=ENG1224&location=HEC101");
  await expect(page).toHaveURL(/location=ENG1224&location=HEC101$/);
  await expect(page.locator('[data-room-id="224"]')).toHaveAttribute(
    "data-selected",
    "true",
  );
});
