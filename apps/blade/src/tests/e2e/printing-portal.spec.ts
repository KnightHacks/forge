import { expect, test } from "playwright/test";

import type { PRINTING } from "@forge/consts";

const portalUrl = "http://localhost:3007";
const id = "00000000-0000-4000-8000-000000000001";
const date = "2026-10-10T12:00:00.000Z";
const queuedPrintJob = {
  id,
  createdAt: date,
  statusChangedAt: date,
  description: "A model with a variable print duration",
  status: "received",
  statusNote: null,
  estimatedReadyAt: "2099-01-01T12:00:00.000Z",
  position: 1,
  files: [],
};
const profile = {
  discordUser: "ada-printer",
  country: "United States of America",
  dob: "2004-02-29",
  email: "hacker@example.test",
  firstName: "Ada",
  lastName: "Printer",
  foodAllergies: null,
  gender: "Woman",
  githubProfileUrl: null,
  gradDate: "2027-05-01",
  levelOfStudy: "Undergraduate University (3+ year)",
  linkedinProfileUrl: null,
  major: "Computer Science",
  phoneNumber: "4075550100",
  raceOrEthnicity: "Prefer not to answer",
  school: "University of Central Florida",
  shirtSize: "M",
  websiteUrl: null,
  revision: 1,
};

test.describe("printing portal availability", () => {
  test.setTimeout(90_000);
  test.beforeAll(async () => {
    // Optional second app: run `pnpm --filter=@forge/2026 dev` for these checks.
    const available = await fetch(`${portalUrl}/sponsors/shinies.svg`, {
      signal: AbortSignal.timeout(3_000),
    })
      .then((response) => response.ok)
      .catch(() => false);
    test.skip(!available, "Start the KH IX development server on port 3007.");
  });
  for (const width of [1440, 320]) {
    test(`blocks closed requests and preserves an open draft at ${width}px`, async ({
      page,
    }, testInfo) => {
      let isOpen = false;
      let hasExistingJob = false;
      let category: PRINTING.PrintJobCategory | null = null;
      let submits = 0;
      let uploads = 0;
      await page.setViewportSize({ width, height: 1000 });
      await page.route("**/api/hacker-sdk/**", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith("/printing/upload")) {
          uploads++;
          await route.fulfill({
            json: { fileId: id, fileName: "part.stl", size: 20 },
          });
          return;
        }
        const procedures = url.pathname.split("/").at(-1)?.split(",") ?? [];
        const output = procedures.map((procedure) => {
          let data: unknown;
          switch (procedure) {
            case "getSession":
              data = {
                authenticated: true,
                displayName: "Ada",
                expiresAt: "2099-01-01T00:00:00.000Z",
              };
              break;
            case "getPublicHackathon":
              data = {
                agreements: [],
                applicationDeadline: date,
                applicationOpen: "2026-08-01T00:00:00.000Z",
                applicationUrl: null,
                confirmationCapacity: null,
                confirmationDeadline: date,
                displayName: "Knight Hacks IX",
                endDate: "2026-10-12T00:00:00.000Z",
                id,
                name: "khix",
                startDate: date,
                theme: "Shinies",
                timezone: "America/New_York",
              };
              break;
            case "getDashboard":
              data = {
                allowedActions: [],
                application: {
                  checkedInAt: date,
                  classId: null,
                  className: null,
                  confirmedAt: date,
                  firstTime: true,
                  isVip: false,
                  profileRevision: 1,
                  status: "checkedin",
                  submittedAt: date,
                  survey1: null,
                  survey2: null,
                },
                isMinorAtHackStart: false,
                profile,
                resume: null,
              };
              break;
            case "listPrintJobs":
              data = {
                jobs: hasExistingJob ? [{ ...queuedPrintJob, category }] : [],
                queue: {
                  isOpen,
                  estimatedWaitMinutes: 60,
                  printMinutes: 60,
                  waitingCount: hasExistingJob ? 1 : 0,
                },
              };
              break;
            case "getJudging":
              data = {
                claimsOpen: false,
                published: false,
                emergency: false,
                serverNow: date,
                timezone: "America/New_York",
                project: null,
                appointments: [],
                unscheduled: [],
                feedback: [],
              };
              break;
            case "updatePrintJobCategory":
              category = "project";
              data = { ...queuedPrintJob, category };
              break;
            case "submitPrintJob":
              submits++;
              data = {};
              break;
            default:
              throw new Error(`Unexpected portal call: ${procedure}`);
          }
          return { result: { data } };
        });
        await route.fulfill({ json: output });
      });
      await page.goto(`${portalUrl}/dashboard/printing`);
      const newPrint = page.getByRole("button", {
        name: "New print",
        exact: true,
      });
      await expect(
        page.getByText("Printing opens soon", { exact: true }),
      ).toBeVisible();
      const availability = page.getByRole("complementary", {
        name: "Printing availability",
      });
      await expect(availability).toContainText(
        "New requests are currently closed. Please check back soon.",
      );
      await expect(availability).toBeInViewport({ ratio: 1 });
      await expect(availability).toContainText(
        "Print times vary depending on the model.",
      );
      await expect(availability).not.toContainText("Each print takes");
      await expect(
        page.getByText(
          "Choose New print to send your model to the Shinies team.",
        ),
      ).toHaveCount(0);
      await expect(newPrint).toBeDisabled();
      await page.screenshot({
        animations: "disabled",
        path: testInfo.outputPath("hacker-printing-closed.png"),
        fullPage: true,
      });
      hasExistingJob = true;
      await page.reload();
      await expect(
        page.getByText("Choose a category for this print.", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("radio", { name: "Hackathon project", exact: true })
        .check();
      await page
        .getByRole("button", { name: "Save category", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Change category" }),
      ).toBeVisible();
      await expect(newPrint).toBeDisabled();
      isOpen = true;
      await expect(newPrint).toBeEnabled({ timeout: 25_000 });
      await expect(availability).toContainText("Printing is open");
      await expect(availability).not.toContainText("Printing opens soon");
      await expect(availability).not.toContainText("A new print:");
      await expect(
        page.getByText("Next in line", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText(/Ready around|any minute now/)).toHaveCount(
        0,
      );
      await page.screenshot({
        animations: "disabled",
        path: testInfo.outputPath("hacker-printing-open.png"),
        fullPage: true,
      });
      await newPrint.click();
      await page.getByLabel("What should we print?").fill("A small bracket");
      await page.locator('input[type="file"]').setInputFiles({
        name: "part.stl",
        mimeType: "model/stl",
        buffer: Buffer.from("solid part\nendsolid part"),
      });
      const submit = page.getByRole("button", { name: "Send to the printer" });
      await expect(submit).toBeDisabled();
      await page
        .getByRole("dialog")
        .getByRole("radio", { name: "Personal print", exact: true })
        .check();
      await expect(submit).toBeEnabled();
      isOpen = false;
      await expect(submit).toBeDisabled({ timeout: 25_000 });
      await expect(
        page
          .getByRole("alert")
          .filter({ hasText: "Printing is currently unavailable" }),
      ).toBeVisible();
      await expect(page.locator('input[type="file"]')).toBeDisabled();
      await expect(page.getByLabel("What should we print?")).toHaveValue(
        "A small bracket",
      );
      await page.screenshot({
        animations: "disabled",
        path: testInfo.outputPath("hacker-printing-draft-paused.png"),
        fullPage: true,
      });
      await expect(
        page.getByRole("radio", { name: "Personal print", exact: true }),
      ).toBeChecked();
      expect(uploads).toBe(1);
      expect(submits).toBe(0);
      isOpen = true;
      await expect(submit).toBeEnabled({ timeout: 25_000 });
    });
  }
});
