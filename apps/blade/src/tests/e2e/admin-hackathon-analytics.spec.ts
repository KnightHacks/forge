import type { Page } from "playwright/test";
import { expect, test } from "playwright/test";

import type {
  InsertEvent,
  InsertHacker,
  InsertHackerAttendee,
} from "@forge/db/schemas/knight-hacks";
import { PERMISSIONS } from "@forge/consts";
import { inArray } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import {
  Event,
  Hackathon,
  Hacker,
  HackerAttendee,
  HackerEventAttendee,
} from "@forge/db/schemas/knight-hacks";

const PATH = "/admin/analytics?scope=hackathon";
const USER_ID = "60000000-0000-4000-8000-000000000001";
const ROLE_ID = "60000000-0000-4000-8000-000000000002";
const HACK_ID = "60000000-0000-4000-8000-000000000003";
const COMPARISON_HACK_ID = "60000000-0000-4000-8000-000000000043";
const HACKER_USER_IDS = Array.from(
  { length: 6 },
  (_, index) =>
    `60000000-0000-4000-8000-${String(10 + index).padStart(12, "0")}`,
);
const HACKER_IDS = Array.from(
  { length: 6 },
  (_, index) =>
    `60000000-0000-4000-8000-${String(20 + index).padStart(12, "0")}`,
);
const ATTENDEE_IDS = Array.from(
  { length: 6 },
  (_, index) =>
    `60000000-0000-4000-8000-${String(30 + index).padStart(12, "0")}`,
);
const EVENT_IDS = [
  "60000000-0000-4000-8000-000000000040",
  "60000000-0000-4000-8000-000000000041",
];

function permissionBitstring(...keys: PERMISSIONS.PermissionKey[]) {
  const maxIndex = Math.max(
    ...Object.values(PERMISSIONS.PERMISSION_DATA).map(({ idx }) => idx),
  );
  const bits = Array.from({ length: maxIndex + 1 }, () => "0");
  keys.forEach((key) => {
    bits[PERMISSIONS.PERMISSION_DATA[key].idx] = "1";
  });
  return bits.join("");
}

async function cleanup() {
  await db
    .delete(Hackathon)
    .where(inArray(Hackathon.id, [HACK_ID, COMPARISON_HACK_ID]));
  await db.delete(Permissions).where(inArray(Permissions.userId, [USER_ID]));
  await db.delete(User).where(inArray(User.id, [USER_ID, ...HACKER_USER_IDS]));
  await db.delete(Roles).where(inArray(Roles.id, [ROLE_ID]));
}

async function seed() {
  await cleanup();
  await db.insert(Roles).values({
    discordRoleId: "hack-analytics-e2e",
    id: ROLE_ID,
    name: "Hack analytics E2E",
    permissions: permissionBitstring(
      "IS_OFFICER",
      "READ_HACK_DATA",
      "READ_HACKERS",
    ),
  });
  await db.insert(User).values([
    {
      discordUserId: "hack-analytics-officer-e2e",
      email: "hack-analytics-officer@example.test",
      emailVerified: true,
      id: USER_ID,
      image: null,
      name: "Hack Analytics Officer",
    },
    ...HACKER_USER_IDS.map((id, index) => ({
      discordUserId: `hack-analytics-hacker-${index}`,
      email: `hack-analytics-hacker-${index}@example.test`,
      emailVerified: true,
      id,
      image: null,
      name: `Hack Analytics Hacker ${index}`,
    })),
  ]);
  await db.insert(Permissions).values({ roleId: ROLE_ID, userId: USER_ID });

  const now = new Date();
  const start = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  await db.insert(Hackathon).values({
    applicationDeadline: new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000),
    applicationOpen: new Date(start.getTime() - 60 * 24 * 60 * 60 * 1000),
    confirmationDeadline: new Date(start.getTime() - 2 * 24 * 60 * 60 * 1000),
    displayName: "Knight Hacks Analytics E2E",
    endDate: end,
    id: HACK_ID,
    name: "hack-analytics-e2e",
    startDate: start,
    theme: "E2E",
  });
  // R-22 fixture: a prior hackathon whose deadline offsets (days from its own
  // application open) land within a day of the current hackathon's — 53/58
  // above vs 54/59 here — so the comparison markers plot right next to the
  // current ones and would visually stack without the label-collision fix.
  const priorStart = new Date(start.getTime() - 365 * 24 * 60 * 60 * 1000);
  const priorOpen = new Date(priorStart.getTime() - 60 * 24 * 60 * 60 * 1000);
  await db.insert(Hackathon).values({
    applicationDeadline: new Date(
      priorOpen.getTime() + 54 * 24 * 60 * 60 * 1000,
    ),
    applicationOpen: priorOpen,
    confirmationDeadline: new Date(
      priorOpen.getTime() + 59 * 24 * 60 * 60 * 1000,
    ),
    displayName: "R-22 Prior Deadlines Fixture",
    endDate: new Date(priorStart.getTime() + 24 * 60 * 60 * 1000),
    id: COMPARISON_HACK_ID,
    name: "hack-analytics-e2e-prior",
    startDate: priorStart,
    theme: "E2E",
  });
  await db.insert(Hacker).values(
    HACKER_IDS.map((id, index) => {
      const firstName = [
        "Avery",
        "Blair",
        "Casey",
        "Drew",
        "Emery",
        "Finley",
      ].at(index);
      const userId = HACKER_USER_IDS[index];
      if (!firstName || !userId)
        throw new Error("Invalid hacker fixture index");
      return {
        age: 18 + index,
        country: "United States of America",
        discordUser: `hack-analytics-hacker-${index}`,
        dob: `${2007 - index}-02-03`,
        email: `hack-analytics-hacker-${index}@example.test`,
        firstName,
        foodAllergies: index % 2 === 0 ? "Peanuts" : null,
        gender: index % 2 === 0 ? "Woman" : "Man",
        gradDate: `${now.getUTCFullYear() + 1 + (index % 4)}-05-02`,
        id,
        lastName: "Hacker",
        levelOfStudy:
          index < 2
            ? "Undergraduate University (2 year - community college or similar)"
            : "Undergraduate University (3+ year)",
        major: "Computer Science",
        phoneNumber: `407-555-${String(2200 + index)}`,
        raceOrEthnicity: index % 2 === 0 ? "Asian" : "White",
        school: "University of Central Florida",
        shirtSize: index % 2 === 0 ? "M" : "L",
        survey1: "Build with friends",
        survey2: "Learn something new",
        userId,
      } satisfies InsertHacker;
    }),
  );
  await db.insert(HackerAttendee).values(
    ATTENDEE_IDS.map((id, index) => {
      const hackerId = HACKER_IDS[index];
      if (!hackerId) throw new Error("Invalid attendee fixture index");
      return {
        checkedInAt:
          index < 3 ? new Date(start.getTime() + index * 20 * 60 * 1000) : null,
        hackerId,
        hackathonId: HACK_ID,
        id,
        isFirstTime: index % 2 === 0,
        points: 60 - index * 10,
        status:
          index < 3
            ? "checkedin"
            : index === 3
              ? "confirmed"
              : index === 4
                ? "accepted"
                : "pending",
        timeApplied: new Date(
          start.getTime() - (20 - index) * 24 * 60 * 60 * 1000,
        ),
        timeConfirmed:
          index < 4 ? new Date(start.getTime() - 24 * 60 * 60 * 1000) : null,
      } satisfies InsertHackerAttendee;
    }),
  );
  await db.insert(Event).values(
    EVENT_IDS.map(
      (id, index) =>
        ({
          creationKey: `60000000-0000-4000-8000-00000000005${index}`,
          creationPayloadHash: "a".repeat(64),
          description: "Hack analytics event fixture",
          end_datetime: new Date(
            start.getTime() + (index + 2) * 60 * 60 * 1000,
          ),
          hackathonId: HACK_ID,
          id,
          legacy: false,
          location: "Student Union",
          name: index === 0 ? "Hackathon Lunch" : "Sponsor Workshop",
          points: 10,
          purpose: "event",
          roles: [],
          start_datetime: new Date(
            start.getTime() + (index + 1) * 60 * 60 * 1000,
          ),
          tag: index === 0 ? "Food" : "Workshop",
          tagColor: index === 0 ? "#22C55E" : "#8B5CF6",
        }) satisfies InsertEvent,
    ),
  );
  await db.insert(HackerEventAttendee).values(
    EVENT_IDS.flatMap((eventId, eventIndex) =>
      ATTENDEE_IDS.slice(0, 4 - eventIndex).map((hackerAttId, index) => ({
        checkedInAt: new Date(
          start.getTime() +
            (eventIndex + 1) * 60 * 60 * 1000 +
            index * 5 * 60 * 1000,
        ),
        eventId,
        hackerAttId,
        hackathonId: HACK_ID,
        isInitialAttendance: true,
        pointsAwarded: 10,
      })),
    ),
  );
}

async function signIn(page: Page) {
  await page.goto(
    `/api/e2e/signin?userId=${encodeURIComponent(USER_ID)}&callbackURL=${encodeURIComponent(PATH)}`,
  );
}

test.describe("admin Hackathon Analytics", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeAll(seed);
  test.afterAll(cleanup);

  test("renders all sections, arrivals, demographics, leaderboard, and reports responsively", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signIn(page);
    await expect(
      page.getByRole("main").getByText("Hackathon intelligence"),
    ).toBeVisible();
    await expect(page.getByText("Knight Hacks Analytics E2E")).toBeVisible();
    await expect(page.getByText("Organizer action brief")).toBeVisible();

    const comparison = page.getByRole("combobox", {
      name: "Comparison hackathon",
    });
    await comparison.click();
    await page.getByRole("option", { name: "No comparison" }).click();
    await expect(comparison).toContainText("No comparison");
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(comparison).not.toContainText("No comparison");

    const analyticsSections = page.getByLabel("Analytics sections");
    await analyticsSections
      .getByRole("link", { name: "Applications", exact: true })
      .click();
    await expect(page.getByText("Application pace")).toBeVisible();
    await expect(page.getByText("Funnel conversion quality")).toBeVisible();
    await expect(page.getByText(/committed/i)).toHaveCount(0);
    await analyticsSections
      .getByRole("link", { name: "Events", exact: true })
      .click();
    await expect(page.getByText("Points leaderboard")).toBeVisible();
    await expect(page.getByText("Popular event tags")).toBeVisible();
    await expect(page.getByText("Avery Hacker")).toBeVisible();
    await page
      .getByRole("button", { name: "Avery Hacker", exact: true })
      .click();
    const hackerProfile = page.getByRole("dialog");
    await expect(hackerProfile).toBeVisible();
    await expect(
      hackerProfile.getByRole("heading", { name: "Avery Hacker" }),
    ).toBeVisible();
    await hackerProfile.getByRole("button", { name: "Close" }).click();
    await page.getByRole("combobox", { name: "Individual event" }).click();
    await page.getByRole("option", { name: "Hackathon Lunch" }).click();
    await expect(page.getByText("Hackathon Lunch arrivals")).toBeVisible();
    await page.getByRole("button", { name: "By class" }).click();
    const arrivalsPanel = page
      .getByRole("heading", { name: "Hackathon Lunch arrivals" })
      .locator("..")
      .locator("..");
    await expect(
      arrivalsPanel.getByRole("columnheader", { name: "Class", exact: true }),
    ).toBeVisible();
    const classChart = arrivalsPanel.getByRole("img", {
      name: /arrivals by interval/,
    });
    if ((await classChart.count()) > 0) {
      const chartBox = await classChart.first().boundingBox();
      const barBox = await classChart
        .first()
        .locator("div")
        .first()
        .boundingBox();
      expect(chartBox).not.toBeNull();
      expect(barBox).not.toBeNull();
      if (chartBox && barBox)
        expect(barBox.height).toBeLessThanOrEqual(chartBox.height);
    }

    await analyticsSections
      .getByRole("link", { name: "Live operations", exact: true })
      .click();
    await expect(page.getByText("Operator load")).toBeVisible();
    await expect(page.getByText("Event load")).toBeVisible();
    await expect(page.getByText("Class load")).toBeVisible();
    await expect(page.getByText("Attempt-time cohorts")).toBeVisible();

    await analyticsSections
      .getByRole("link", { name: "Audience", exact: true })
      .click();
    await expect(page.getByText(/two-year and three-plus/)).toBeVisible();
    await expect(
      page.getByRole("img", { name: /Composition of/ }),
    ).toBeVisible();
    const priorityDemographics = page.getByLabel("Priority demographics");
    for (const demographic of [
      "Gender",
      "Race / ethnicity",
      "Age group",
      "Class year (inferred)",
      "Level of study",
      "Major",
    ]) {
      await priorityDemographics
        .getByRole("button", { name: demographic, exact: true })
        .click();
      await expect(
        page.getByRole("heading", {
          name: `${demographic} composition`,
        }),
      ).toBeVisible();
    }
    await page.getByRole("button", { name: "Engagement" }).click();
    const engagementPanel = page
      .getByRole("heading", { name: "Major engagement" })
      .locator("xpath=ancestor::section");
    await expect(engagementPanel.locator("svg.recharts-surface")).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Event reach" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Point coverage" }),
    ).toBeVisible();
    await page
      .getByRole("textbox", { name: "Search audience categories" })
      .fill("no matching segment");
    await expect(
      page.getByText("No demographic categories match this search."),
    ).toBeVisible();
    await page
      .getByRole("textbox", { name: "Search audience categories" })
      .fill("");

    await analyticsSections
      .getByRole("link", { name: "Reports", exact: true })
      .click();
    await expect(
      page.getByText("MLH / UCF institutional summary"),
    ).toBeVisible();
    await expect(page.getByText("Sponsor-safe report")).toBeVisible();
    await expect(page.getByText("Recruiter resume bundle")).toBeVisible();

    await page.setViewportSize({ height: 900, width: 320 });
    await page.reload();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("keeps overlapping current/prior deadline labels on the application pace chart distinguishable (R-22)", async ({
    page,
  }) => {
    await signIn(page);
    await page.getByRole("combobox", { name: "Comparison hackathon" }).click();
    await page
      .getByRole("option", { name: "vs. R-22 Prior Deadlines Fixture" })
      .click();
    await page
      .getByLabel("Analytics sections")
      .getByRole("link", { name: "Applications", exact: true })
      .click();

    const currentLabel = page.getByText("App deadline", { exact: true });
    const priorLabel = page.getByText("Prior app", { exact: true });
    await expect(currentLabel).toBeVisible();
    await expect(priorLabel).toBeVisible();

    const currentBox = await currentLabel.boundingBox();
    const priorBox = await priorLabel.boundingBox();
    expect(currentBox).not.toBeNull();
    expect(priorBox).not.toBeNull();
    if (currentBox && priorBox) {
      const verticallySeparated =
        currentBox.y + currentBox.height <= priorBox.y ||
        priorBox.y + priorBox.height <= currentBox.y;
      expect(verticallySeparated).toBe(true);
    }

    // The accessible table alternative next to the chart still identifies
    // the comparison series.
    await expect(
      page.getByRole("columnheader", { name: "Comparison cumulative" }),
    ).toBeVisible();
  });
});
