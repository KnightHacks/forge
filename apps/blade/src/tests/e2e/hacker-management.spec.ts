import { expect, test } from "playwright/test";

import { PERMISSIONS } from "@forge/consts";
import { eq, inArray } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import {
  Hackathon,
  Hacker,
  HackerAttendee,
} from "@forge/db/schemas/knight-hacks";

const ADMIN_ID = "00000000-0000-4000-8000-000000000901";
const ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000902";
const HACKATHON_ID = "00000000-0000-4000-8000-000000000903";
const HACKER_ONE = "00000000-0000-4000-8000-000000000904";
const HACKER_TWO = "00000000-0000-4000-8000-000000000905";
const ATTENDEE_ONE = "00000000-0000-4000-8000-000000000906";
const ATTENDEE_TWO = "00000000-0000-4000-8000-000000000907";
const ENDED_HACKATHON = "00000000-0000-4000-8000-000000000908";
const ENDED_ATTENDEE = "00000000-0000-4000-8000-000000000909";

function permissionBitstring(...keys: PERMISSIONS.PermissionKey[]) {
  const maxIndex = Math.max(
    ...Object.values(PERMISSIONS.PERMISSION_DATA).map(({ idx }) => idx),
  );
  const bits = Array.from({ length: maxIndex + 1 }, () => "0");
  for (const key of keys) {
    bits[PERMISSIONS.PERMISSION_DATA[key].idx] = "1";
  }
  return bits.join("");
}

async function cleanupFixtures() {
  await db
    .delete(HackerAttendee)
    .where(inArray(HackerAttendee.id, [ATTENDEE_ONE, ATTENDEE_TWO]));
  await db.delete(Hacker).where(inArray(Hacker.id, [HACKER_ONE, HACKER_TWO]));
  await db
    .delete(Hackathon)
    .where(inArray(Hackathon.id, [HACKATHON_ID, ENDED_HACKATHON]));
  await db.delete(Permissions).where(eq(Permissions.userId, ADMIN_ID));
  await db.delete(Roles).where(eq(Roles.id, ADMIN_ROLE_ID));
  await db.delete(User).where(eq(User.id, ADMIN_ID));
}

/**
 * The roster's critical path: an officer reaches it, sees applicants, and can
 * build a selection.
 *
 * Deliberately does **not** send anything. This hackathon has no status emails
 * configured, so the readiness gate is active — which makes the spec safe to
 * run repeatedly and also proves the gate is visible rather than a server-side
 * secret. Sending is covered by the DB-backed guard tests, where a disposable
 * database means no real address is ever involved.
 */
test.describe("Hacker management critical flow", () => {
  test.beforeAll(async () => {
    await cleanupFixtures();
    await db.insert(User).values({
      discordUserId: "hacker-admin-e2e",
      email: "hacker-admin@example.test",
      id: ADMIN_ID,
      name: "Hacker Admin",
    });
    await db.insert(Roles).values({
      discordRoleId: "990000000000000921",
      id: ADMIN_ROLE_ID,
      name: "Hacker Admins",
      permissions: permissionBitstring("IS_OFFICER"),
    });
    await db
      .insert(Permissions)
      .values({ roleId: ADMIN_ROLE_ID, userId: ADMIN_ID });

    await db.insert(Hackathon).values({
      applicationDeadline: new Date("2026-09-01T00:00:00Z"),
      applicationOpen: new Date("2026-08-01T00:00:00Z"),
      confirmationDeadline: new Date("2026-09-15T00:00:00Z"),
      displayName: "E2E Hackathon",
      endDate: new Date("2026-10-03T00:00:00Z"),
      id: HACKATHON_ID,
      name: "e2e-hackathon",
      startDate: new Date("2026-10-01T00:00:00Z"),
      theme: "End to end",
    });
    // A hackathon that is over. Its roster stays readable and its status
    // changes must not be reachable — an officer looking up last year's numbers
    // should not be able to mail those applicants again.
    await db.insert(Hackathon).values({
      applicationDeadline: new Date("2019-09-01T00:00:00Z"),
      applicationOpen: new Date("2019-08-01T00:00:00Z"),
      confirmationDeadline: new Date("2019-09-15T00:00:00Z"),
      displayName: "E2E Past Hackathon",
      endDate: new Date("2019-10-03T00:00:00Z"),
      id: ENDED_HACKATHON,
      name: "e2e-past-hackathon",
      startDate: new Date("2019-10-01T00:00:00Z"),
      theme: "Already over",
    });

    const hacker = (id: string, suffix: string) => ({
      age: 20,
      discordUser: `e2e-${suffix}`,
      dob: "2006-01-01",
      email: `e2e-${suffix}@example.test`,
      firstName: "Edge",
      gradDate: "2030-05-01",
      id,
      lastName: suffix,
      levelOfStudy: "Undergraduate University (3+ year)" as const,
      phoneNumber: "0000000000",
      school: "University of Central Florida" as const,
      shirtSize: "M" as const,
      survey1: "",
      survey2: "",
      userId: ADMIN_ID,
    });
    await db
      .insert(Hacker)
      .values([hacker(HACKER_ONE, "alpha"), hacker(HACKER_TWO, "beta")]);
    await db.insert(HackerAttendee).values([
      {
        hackathonId: HACKATHON_ID,
        hackerId: HACKER_ONE,
        id: ATTENDEE_ONE,
        status: "pending",
      },
      {
        hackathonId: HACKATHON_ID,
        hackerId: HACKER_TWO,
        id: ATTENDEE_TWO,
        status: "pending",
      },
      {
        hackathonId: ENDED_HACKATHON,
        hackerId: HACKER_ONE,
        id: ENDED_ATTENDEE,
        status: "accepted",
      },
    ]);
  });

  test.afterAll(async () => {
    await cleanupFixtures();
  });

  test("TC-001/TC-015 lists applicants and builds an amendable selection", async ({
    page,
  }) => {
    await page.goto(
      `/api/e2e/signin?userId=${ADMIN_ID}&callbackURL=${encodeURIComponent(
        `/admin/hackers?hackathon=${HACKATHON_ID}`,
      )}`,
    );

    await expect(page.getByRole("heading", { name: "Hackers" })).toBeVisible();

    // TC-001: both applicants, and only this hackathon's — the second
    // hackathon's applicant must not appear.
    await expect(page.getByText("Edge alpha")).toBeVisible();
    await expect(page.getByText("Edge beta")).toBeVisible();
    await expect(page.getByText("Other gamma")).toHaveCount(0);

    // TC-015: select one, then amend.
    await page.getByRole("checkbox", { name: "Select Edge alpha" }).click();
    await expect(page.getByText("1 selected")).toBeVisible();

    await page.getByRole("checkbox", { name: "Select Edge beta" }).click();
    await expect(page.getByText("2 selected")).toBeVisible();

    // Deselecting one leaves the other — the amendability that makes a
    // correction possible without starting over.
    await page.getByRole("checkbox", { name: "Select Edge alpha" }).click();
    await expect(page.getByText("1 selected")).toBeVisible();
  });

  // AC-006: the gate is visible AND the actions are actually disabled. A banner
  // on its own still leaves the click-then-error surprise.
  //
  // This replaces an assertion that outlived its UI — it looked for a per-row
  // "Accepted" button that moved into the detail dialog during the redesign, and
  // pointed at a hackathon whose end date is in the future, so it could never
  // have tested the read-only gate it named.
  test("AC-006 keeps an ended hackathon readable but read-only", async ({
    page,
  }) => {
    await page.goto(
      `/api/e2e/signin?userId=${ADMIN_ID}&callbackURL=${encodeURIComponent(
        `/admin/hackers?hackathon=${ENDED_HACKATHON}`,
      )}`,
    );

    // Readable: the applicant is still listed.
    await expect(page.getByText("Edge alpha")).toBeVisible();
    await expect(page.getByText("Ended — read-only.")).toBeVisible();

    // Read-only: selecting still works, but nothing can be sent.
    await page.getByRole("checkbox", { name: "Select Edge alpha" }).click();
    await expect(page.getByText("1 selected")).toBeVisible();
    // `exact`, because the status tab beside it is also called "Waitlisted" —
    // the tab stays live (filtering an ended hackathon is fine), the action does
    // not, and that is the distinction this test exists to hold.
    await expect(
      page.getByRole("button", { exact: true, name: "Waitlisted" }),
    ).toBeDisabled();

    // And the same gate holds inside the detail dialog, which is where the
    // per-applicant actions live now.
    await page.getByText("Edge alpha").click();
    await expect(
      page
        .getByRole("button", { name: "Remove blacklist" })
        .or(page.getByRole("button", { name: "Blacklist applicant" })),
    ).toBeDisabled();
  });

  test("TC-002 filters the roster by status", async ({ page }) => {
    await page.goto(
      `/api/e2e/signin?userId=${ADMIN_ID}&callbackURL=${encodeURIComponent(
        `/admin/hackers?hackathon=${HACKATHON_ID}`,
      )}`,
    );

    await expect(page.getByText("Edge alpha")).toBeVisible();

    // Filtering to a status nobody holds empties the table rather than
    // silently ignoring the filter.
    await page
      .getByRole("button", { name: /^Accepted/ })
      .first()
      .click();
    await expect(
      page.getByText("No applicants match these filters."),
    ).toBeVisible();
  });
});
