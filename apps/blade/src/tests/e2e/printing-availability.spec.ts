import { randomUUID } from "node:crypto";
import { expect, test } from "playwright/test";

import { PERMISSIONS } from "@forge/consts";
import { eq } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import {
  Hackathon,
  PrintingConfiguration,
  PrintJob,
} from "@forge/db/schemas/knight-hacks";

import { seedPrintingCategories } from "./printing-category-fixture";

let uncategorizedId: string;
const adminId = randomUUID();
const roleId = randomUUID();
const hackathonId = randomUUID();

test.beforeAll(async () => {
  const bits = Array.from(
    {
      length:
        Math.max(
          ...Object.values(PERMISSIONS.PERMISSION_DATA).map(({ idx }) => idx),
        ) + 1,
    },
    () => "0",
  );
  bits[PERMISSIONS.PERMISSION_DATA.PRINTING_QUEUE.idx] = "1";
  await db.insert(User).values({
    id: adminId,
    name: "Printer Crew",
    discordUserId: "printing-e2e-admin",
  });
  await db.insert(Roles).values({
    id: roleId,
    name: "Printer crew",
    discordRoleId: "printing-e2e-role",
    permissions: bits.join(""),
  });
  await db.insert(Permissions).values({ userId: adminId, roleId });
  await db.insert(Hackathon).values({
    id: hackathonId,
    name: "printing-availability-e2e",
    displayName: "Knight Hacks IX",
    theme: "Printing",
    startDate: new Date("2026-10-09"),
    endDate: new Date("2026-10-12"),
    applicationOpen: new Date("2026-08-01"),
    applicationDeadline: new Date("2026-09-01"),
    confirmationDeadline: new Date("2026-10-01"),
  });
  uncategorizedId = await seedPrintingCategories(hackathonId, adminId);
});

test.afterAll(async () => {
  await db.delete(Hackathon).where(eq(Hackathon.id, hackathonId));
  await db.delete(Permissions).where(eq(Permissions.userId, adminId));
  await db.delete(Roles).where(eq(Roles.id, roleId));
  await db.delete(User).where(eq(User.id, adminId));
});

for (const width of [1440, 320]) {
  test(`opens and closes printing at ${width}px`, async ({
    page,
  }, testInfo) => {
    await db
      .update(PrintJob)
      .set({
        category: null,
        status: "received",
        statusNote: null,
        estimatedReadyAt: null,
      })
      .where(eq(PrintJob.id, uncategorizedId));
    await db
      .delete(PrintingConfiguration)
      .where(eq(PrintingConfiguration.hackathonId, hackathonId));
    await page.setViewportSize({ width, height: 900 });
    await page.goto(
      `/api/e2e/signin?userId=${adminId}&callbackURL=${encodeURIComponent(`/admin/printing?hackathon=${hackathonId}`)}`,
    );
    const first = page
      .getByRole("list", { name: "Queue results" })
      .getByRole("button")
      .first();
    await expect(first).toContainText("Hackathon project");
    await page
      .getByRole("button")
      .filter({ hasText: "Legacy model needing a category" })
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      "Hackathon projects take priority",
    );
    await page.getByLabel("Print category", { exact: true }).click();
    await page
      .getByRole("option", { name: "Hackathon project", exact: true })
      .click();
    await page.screenshot({
      path: testInfo.outputPath("printing-category-dialog.png"),
      animations: "disabled",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Save category and notify" })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(first).toContainText("Legacy model needing a category");
    await expect(page.getByLabel("Queue order")).toContainText(
      "20 hackathon projects",
    );
    await first.click();
    await page
      .getByRole("combobox", { name: "New status", exact: true })
      .click();
    await page.getByRole("option", { name: "Printing", exact: true }).click();
    const startPrinting = page.getByRole("button", {
      name: "Start printing and notify",
    });
    await expect(startPrinting).toBeDisabled();
    await page.getByLabel("Hours", { exact: true }).fill("1");
    await page.getByLabel("Minutes", { exact: true }).fill("30");
    await expect(page.getByRole("dialog")).toContainText(
      "exceeds the 60-minute session limit",
    );
    await expect(page.locator('input[type="datetime-local"]')).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath("printing-duration-form.png"),
      fullPage: false,
      animations: "disabled",
    });
    await startPrinting.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(first.getByRole("timer")).toContainText("remaining");
    await page.reload();
    await expect(first.getByRole("timer")).toContainText("remaining");
    await first.click();
    await expect(page.getByLabel("Hours", { exact: true })).toHaveValue("1");
    await expect(page.getByLabel("Minutes", { exact: true })).toHaveValue("30");
    await expect(page.getByLabel("Print timer")).toContainText(
      "Estimated finish",
    );
    await page.screenshot({
      path: testInfo.outputPath("printing-running-timer.png"),
      fullPage: false,
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Close", exact: true }).click();
    const control = page.getByRole("switch", { name: "Accept new print jobs" });
    await expect(control).not.toBeChecked();
    await control.click();
    // The first mutation also compiles the tRPC route in the development server.
    await expect(control).toBeChecked({ timeout: 30_000 });
    await page.reload();
    await expect(control).toBeChecked();
    await control.click();
    await expect(control).not.toBeChecked();
    await expect(
      page.getByText("Printing closed", { exact: true }),
    ).toBeVisible();
    const [stored] = await db
      .select()
      .from(PrintingConfiguration)
      .where(eq(PrintingConfiguration.hackathonId, hackathonId));
    expect(stored?.isOpen).toBe(false);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("printing-closed.png"),
      fullPage: true,
    });
  });
}
