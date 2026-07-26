import { expect, test } from "playwright/test";

import { PERMISSIONS } from "@forge/consts";
import { eq, inArray } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import {
  EmailSend,
  EmailSendEvent,
  EmailSendRecipient,
  EmailTemplate,
  EmailTemplateRevision,
  Member,
} from "@forge/db/schemas/knight-hacks";

const ADMIN_ID = "00000000-0000-4000-8000-000000000861";
const MEMBER_USER_ID = "00000000-0000-4000-8000-000000000862";
const MEMBER_ID = "00000000-0000-4000-8000-000000000863";
const ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000864";
const TEAM_ROLE_ID = "00000000-0000-4000-8000-000000000865";
const FIXTURE_USER_IDS = [ADMIN_ID, MEMBER_USER_ID];
const FIXTURE_ROLE_IDS = [ADMIN_ROLE_ID, TEAM_ROLE_ID];

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
  const sends = await db
    .select({ id: EmailSend.id })
    .from(EmailSend)
    .where(eq(EmailSend.createdBy, ADMIN_ID));
  const sendIds = sends.map(({ id }) => id);
  if (sendIds.length > 0) {
    await db
      .delete(EmailSendEvent)
      .where(inArray(EmailSendEvent.sendId, sendIds));
    await db
      .delete(EmailSendRecipient)
      .where(inArray(EmailSendRecipient.sendId, sendIds));
    await db.delete(EmailSend).where(inArray(EmailSend.id, sendIds));
  }

  const templates = await db
    .select({ id: EmailTemplate.id })
    .from(EmailTemplate)
    .where(eq(EmailTemplate.createdBy, ADMIN_ID));
  const templateIds = templates.map(({ id }) => id);
  if (templateIds.length > 0) {
    await db
      .delete(EmailTemplateRevision)
      .where(inArray(EmailTemplateRevision.templateId, templateIds));
    await db
      .delete(EmailTemplate)
      .where(inArray(EmailTemplate.id, templateIds));
  }

  await db.delete(Member).where(eq(Member.id, MEMBER_ID));
  await db
    .delete(Permissions)
    .where(inArray(Permissions.userId, FIXTURE_USER_IDS));
  await db.delete(Roles).where(inArray(Roles.id, FIXTURE_ROLE_IDS));
  await db.delete(User).where(inArray(User.id, FIXTURE_USER_IDS));
}

test.describe("Email Portal critical flow", () => {
  test.beforeAll(async () => {
    await cleanupFixtures();
    await db.insert(User).values([
      {
        discordUserId: "email-portal-admin-e2e",
        email: "email-portal-admin@example.test",
        id: ADMIN_ID,
        name: "Email Portal Admin",
      },
      {
        discordUserId: "email-portal-recipient-e2e",
        email: "email-portal-recipient@example.test",
        id: MEMBER_USER_ID,
        name: "Email Portal Recipient",
      },
    ]);
    await db.insert(Roles).values([
      {
        discordRoleId: "email-portal-admin-role-e2e",
        id: ADMIN_ROLE_ID,
        name: "Email Portal E2E",
        permissions: permissionBitstring("EMAIL_PORTAL"),
      },
      {
        discordRoleId: "email-portal-team-role-e2e",
        emailAudienceEnabled: true,
        id: TEAM_ROLE_ID,
        name: "Email Team E2E",
        permissions: permissionBitstring(),
      },
    ]);
    await db.insert(Permissions).values([
      { roleId: ADMIN_ROLE_ID, userId: ADMIN_ID },
      { roleId: TEAM_ROLE_ID, userId: MEMBER_USER_ID },
    ]);
    await db.insert(Member).values({
      age: 24,
      dateCreated: "2026-07-25",
      discordUser: "email-portal-recipient-e2e",
      dob: "2001-02-03",
      email: "email-portal-recipient@example.test",
      firstName: "Synthetic",
      gender: "Prefer not to answer",
      gradDate: "2027-05-02",
      id: MEMBER_ID,
      lastName: "Recipient",
      levelOfStudy: "Undergraduate University (3+ year)",
      major: "Computer Science",
      phoneNumber: "407-555-0863",
      raceOrEthnicity: "Prefer not to answer",
      school: "University of Central Florida",
      shirtSize: "M",
      timeCreated: "12:00:00",
      userId: MEMBER_USER_ID,
    });
  });

  test.afterAll(async () => {
    await cleanupFixtures();
  });

  test("TC-061 creates, publishes, schedules, and cancels without network delivery", async ({
    page,
  }) => {
    await page.goto(
      `/api/e2e/signin?userId=${ADMIN_ID}&callbackURL=/admin/email?tab=templates`,
    );

    await expect(
      page.getByRole("heading", { name: "Email Portal" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "New template" }).click();
    await page.getByLabel("Template name").fill("E2E Welcome");
    await page.getByRole("tab", { name: "Code" }).click();
    await page.getByLabel("Template source").fill(`
      import { Html, Text } from "@react-email/components";
      export default <Html><Text>Hello <Merge field="recipient.firstName" fallback="friend" /></Text></Html>;
    `);
    await page.getByRole("button", { name: "Save draft" }).click();
    await page.getByRole("button", { name: "Preview template" }).click();
    await expect(page.getByText("Hello Synthetic")).toBeVisible();
    await page.getByRole("button", { name: "Publish" }).click();

    await page.getByRole("tab", { name: "Compose" }).click();
    await page.getByLabel("Subject").fill("Scheduled E2E welcome");
    await page
      .getByLabel("Email template")
      .selectOption({ label: "E2E Welcome" });
    await page.getByLabel("Current members").check();
    await page.getByLabel("Schedule for").fill("2026-12-01T12:00");
    await page.getByRole("button", { name: "Preview audience" }).click();

    const confirmation = page.getByRole("dialog", {
      name: "Confirm scheduled email",
    });
    await expect(confirmation.getByText("1 unique recipient")).toBeVisible();
    await confirmation.getByRole("button", { name: "Schedule email" }).click();

    await page.getByRole("tab", { name: "Sends" }).click();
    const send = page.getByRole("row", { name: /Scheduled E2E welcome/ });
    await expect(send).toContainText("Scheduled");
    await send.getByRole("button", { name: "Cancel" }).click();
    await expect(send).toContainText("Cancelled");
  });
});
