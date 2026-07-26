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
      `/api/e2e/signin?userId=${ADMIN_ID}&callbackURL=${encodeURIComponent(
        "/admin/email?tab=templates",
      )}`,
    );

    await expect(
      page.getByRole("heading", { name: "Email Portal" }),
    ).toBeVisible();
    await page.goto("/admin/email");
    await expect(
      page.getByRole("tab", { name: "Compose", selected: true }),
    ).toBeVisible();
    await page.getByLabel("Subject").fill("Draft survives template editing");
    await page.getByRole("button", { name: /Plain text/ }).click();
    await page
      .getByLabel("Message")
      .fill("This unfinished body should survive a tab change.");
    await page.getByRole("tab", { name: "Templates" }).click();
    await page.getByRole("button", { name: "New template" }).click();
    await page.getByLabel("Template name").fill("E2E Welcome");
    await page.getByRole("tab", { name: "Code" }).click();
    await page.getByLabel("Template source").focus();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.insertText(`
      import { Html, Text } from "@react-email/components";
      export default <Html><Text>Hello <Merge field="recipient.firstName" fallback="friend" /></Text></Html>;
    `);
    await page.getByRole("button", { name: "Save draft" }).click();
    const template = page.getByRole("article", {
      name: "E2E Welcome template",
    });
    await template.getByRole("button", { name: "Preview template" }).click();
    await expect(page.getByText("Hello Dylan")).toBeVisible();
    await template.getByRole("button", { name: "Publish" }).click();

    await page.getByRole("tab", { name: "Compose" }).click();
    await expect(page.getByLabel("Subject")).toHaveValue(
      "Draft survives template editing",
    );
    await expect(page.getByLabel("Message")).toHaveValue(
      "This unfinished body should survive a tab change.",
    );
    await page.getByRole("button", { name: /React Email template/ }).click();
    await page.getByLabel("Subject").fill("Scheduled E2E welcome");
    await page
      .getByLabel("Email template")
      .selectOption({ label: "E2E Welcome" });
    await page.getByLabel("Current members").check();
    await page
      .getByLabel("Search selected audience")
      .fill("Synthetic Recipient");
    const syntheticRecipient = page.getByLabel(
      /Synthetic Recipient.*email-portal-recipient@example\.test/,
    );
    await expect(syntheticRecipient).toBeChecked();
    await syntheticRecipient.uncheck();
    await page.getByLabel("Schedule for").fill("2026-12-01T12:00");
    await page.getByRole("button", { name: "Preview audience" }).click();

    const confirmation = page.getByRole("dialog", {
      name: "Confirm scheduled email",
    });
    await expect(
      confirmation.getByText(/^\d+ unique recipients?$/),
    ).toBeVisible();
    await expect(confirmation.getByText("1 deselected")).toBeVisible();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: ".playwright-results/email-portal-confirmation-desktop.png",
    });
    await confirmation.getByRole("button", { name: "Schedule email" }).click();

    await page.getByRole("tab", { name: "Sends" }).click();
    const send = page.getByRole("row", { name: /Scheduled E2E welcome/ });
    await expect(send).toHaveAttribute("aria-label", /scheduled$/);
    await send
      .getByRole("button", { name: "View details for Scheduled E2E welcome" })
      .click();
    const details = page.getByRole("dialog", {
      name: "Scheduled E2E welcome",
    });
    await expect(details.getByText(/Sent by Email Portal Admin/)).toBeVisible();
    await expect(details.getByText("Message body")).toBeVisible();
    await expect(
      details.getByText("email-portal-recipient@example.test"),
    ).toHaveCount(0);
    await details.getByRole("button", { name: "Close" }).click();
    await send.getByRole("button", { name: "Cancel" }).click();
    await expect(send).toHaveAttribute("aria-label", /cancelled$/);
    await page.setViewportSize({ height: 844, width: 390 });
    await page.screenshot({
      fullPage: true,
      path: ".playwright-results/email-portal-sends-mobile.png",
    });
  });
});
