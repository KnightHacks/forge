import type { Locator, Page } from "playwright/test";
import { expect, test } from "playwright/test";

import { DISCORD, PERMISSIONS } from "@forge/consts";
import { eq, inArray, or } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import { FormSectionRoles, FormSections } from "@forge/db/schemas/knight-hacks";
import { ROLE_UNLINK_CONFIRMATION } from "@forge/validators";

const ADMIN_PATH = "/admin/roles";
const CONFIGURE_USER_ID = "00000000-0000-4000-8000-000000000901";
const ASSIGN_USER_ID = "00000000-0000-4000-8000-000000000902";
const OFFICER_USER_ID = "00000000-0000-4000-8000-000000000903";
const UNAUTHORIZED_USER_ID = "00000000-0000-4000-8000-000000000904";
const CONFIGURE_ROLE_ID = "00000000-0000-4000-8000-000000000911";
const ASSIGN_ROLE_ID = "00000000-0000-4000-8000-000000000912";
const OFFICER_ROLE_ID = "00000000-0000-4000-8000-000000000913";
const FILTER_ROLE_ID = "00000000-0000-4000-8000-000000000914";
const SECOND_FILTER_ROLE_ID = "00000000-0000-4000-8000-000000000915";
const MISSING_ROLE_ID = "00000000-0000-4000-8000-000000000916";
const DEPENDENT_ROLE_ID = "00000000-0000-4000-8000-000000000917";
const CONFLICT_ROLE_ID = "00000000-0000-4000-8000-000000000918";
const SYNC_ROLE_ID = "00000000-0000-4000-8000-000000000919";
const FORM_SECTION_ID = "00000000-0000-4000-8000-000000000951";
const STATIC_ADMIN_DISCORD_ROLE_ID = "990000000000000001";
const CREATED_DISCORD_ROLE_ID = "990000000000000003";
const MANAGED_DISCORD_ROLE_ID = "990000000000000004";
const CONFLICT_DISCORD_ROLE_ID = "990000000000000005";
const SYNC_DISCORD_ROLE_ID = "990000000000000006";
const MISSING_DISCORD_ROLE_ID = "990000000000009999";
const managedDiscordRoleIds = [
  "role-configure-e2e",
  "role-assign-e2e",
  STATIC_ADMIN_DISCORD_ROLE_ID,
  "role-filter-e2e",
  "role-second-filter-e2e",
  MISSING_DISCORD_ROLE_ID,
  "role-dependent-e2e",
  "role-conflict-stored-e2e",
  SYNC_DISCORD_ROLE_ID,
  "990000000000000002",
  CREATED_DISCORD_ROLE_ID,
];
const adminUserIds = [
  CONFIGURE_USER_ID,
  ASSIGN_USER_ID,
  OFFICER_USER_ID,
  UNAUTHORIZED_USER_ID,
];
const targetUsers = Array.from({ length: 30 }, (_, index) => ({
  discordUserId:
    index === 29
      ? "role-discord-fail-e2e"
      : `role-target-${index.toString().padStart(2, "0")}`,
  email: `role-target-${index.toString().padStart(2, "0")}@example.test`,
  id: `00000000-0000-4000-8000-${String(920 + index).padStart(12, "0")}`,
  name: `Role Target ${index.toString().padStart(2, "0")}`,
}));
const syncUsers = [
  {
    discordUserId: "role-sync-member-add-e2e",
    email: "role-sync-add@example.test",
    id: "00000000-0000-4000-8000-000000000952",
    name: "Role Sync Add",
  },
  {
    discordUserId: "role-sync-absent-stale-e2e",
    email: "role-sync-stale@example.test",
    id: "00000000-0000-4000-8000-000000000953",
    name: "Role Sync Stale",
  },
  {
    discordUserId: "role-sync-member-duplicate-e2e",
    email: "role-sync-duplicate@example.test",
    id: "00000000-0000-4000-8000-000000000954",
    name: "Role Sync Duplicate",
  },
  {
    discordUserId: "role-sync-member-unchanged-e2e",
    email: "role-sync-unchanged@example.test",
    id: "00000000-0000-4000-8000-000000000955",
    name: "Role Sync Unchanged",
  },
  {
    discordUserId: "role-sync-absent-unchanged-e2e",
    email: "role-sync-absent@example.test",
    id: "00000000-0000-4000-8000-000000000956",
    name: "Role Sync Absent",
  },
  {
    discordUserId: "role-sync-not-found-e2e",
    email: "role-sync-not-found@example.test",
    id: "00000000-0000-4000-8000-000000000957",
    name: "Role Sync Not Found",
  },
  {
    discordUserId: "role-sync-error-e2e",
    email: "role-sync-error@example.test",
    id: "00000000-0000-4000-8000-000000000958",
    name: "Role Sync Error",
  },
];
const accessCreationUser = {
  discordUserId: "role-create-member-e2e",
  email: "role-create-member@example.test",
  id: "00000000-0000-4000-8000-000000000959",
  name: "Role Access Creation Member",
};
const testUserIds = [
  ...adminUserIds,
  ...targetUsers.map((user) => user.id),
  ...syncUsers.map((user) => user.id),
  accessCreationUser.id,
];

function permissionBitstring(...keys: PERMISSIONS.PermissionKey[]) {
  const bits = Array.from(
    { length: Object.keys(PERMISSIONS.PERMISSION_DATA).length },
    () => "0",
  );
  for (const key of keys) {
    const permission = PERMISSIONS.PERMISSION_DATA[key];
    if (!permission) throw new Error(`Unknown permission ${key}`);
    bits[permission.idx] = "1";
  }
  return bits.join("");
}

async function cleanupE2EData() {
  await db
    .delete(FormSectionRoles)
    .where(eq(FormSectionRoles.sectionId, FORM_SECTION_ID));
  await db.delete(FormSections).where(eq(FormSections.id, FORM_SECTION_ID));
  const roleRows = await db
    .select({ id: Roles.id })
    .from(Roles)
    .where(inArray(Roles.discordRoleId, managedDiscordRoleIds));
  const roleIds = roleRows.map((role) => role.id);
  if (roleIds.length > 0) {
    await db
      .delete(Permissions)
      .where(
        or(
          inArray(Permissions.roleId, roleIds),
          inArray(Permissions.userId, testUserIds),
        ),
      );
    await db.delete(Roles).where(inArray(Roles.id, roleIds));
  } else {
    await db
      .delete(Permissions)
      .where(inArray(Permissions.userId, testUserIds));
  }
  await db.delete(User).where(inArray(User.id, testUserIds));
}

async function seedE2EData() {
  await cleanupE2EData();
  const firstTarget = targetUsers[0];
  const secondTarget = targetUsers[1];
  const thirdTarget = targetUsers[2];
  const fourthTarget = targetUsers[3];
  const fifthTarget = targetUsers[4];
  if (
    !firstTarget ||
    !secondTarget ||
    !thirdTarget ||
    !fourthTarget ||
    !fifthTarget
  ) {
    throw new Error("Role-management E2E target fixtures are missing.");
  }
  await db.insert(Roles).values([
    {
      discordRoleId: "role-configure-e2e",
      id: CONFIGURE_ROLE_ID,
      name: "Configure only E2E",
      permissions: permissionBitstring("CONFIGURE_ROLES"),
    },
    {
      discordRoleId: "role-assign-e2e",
      id: ASSIGN_ROLE_ID,
      name: "Assign only E2E",
      permissions: permissionBitstring("ASSIGN_ROLES"),
    },
    {
      discordRoleId: STATIC_ADMIN_DISCORD_ROLE_ID,
      id: OFFICER_ROLE_ID,
      name: "Role Management E2E",
      permissions: permissionBitstring("IS_OFFICER"),
      teamHexcodeColor: "#6d28d9",
    },
    {
      discordRoleId: "role-filter-e2e",
      id: FILTER_ROLE_ID,
      name: "Existing Filter E2E",
      permissions: permissionBitstring(),
    },
    {
      discordRoleId: "role-second-filter-e2e",
      id: SECOND_FILTER_ROLE_ID,
      name: "Second Filter E2E",
      permissions: permissionBitstring(),
    },
    {
      discordRoleId: MISSING_DISCORD_ROLE_ID,
      id: MISSING_ROLE_ID,
      name: "Stored Missing E2E",
      permissions: permissionBitstring(),
    },
    {
      discordRoleId: "role-dependent-e2e",
      id: DEPENDENT_ROLE_ID,
      name: "Dependent Role E2E",
      permissions: permissionBitstring(),
    },
    {
      discordRoleId: "role-conflict-stored-e2e",
      id: CONFLICT_ROLE_ID,
      name: "case conflict e2e",
      permissions: permissionBitstring(),
    },
    {
      discordRoleId: SYNC_DISCORD_ROLE_ID,
      id: SYNC_ROLE_ID,
      name: "Stale Sync Name E2E",
      permissions: permissionBitstring(),
      teamHexcodeColor: "#111111",
    },
  ]);
  await db.insert(User).values([
    {
      discordUserId: "role-configure-user-e2e",
      email: "role-configure@example.test",
      id: CONFIGURE_USER_ID,
      name: "Configure User E2E",
    },
    {
      discordUserId: "role-assign-user-e2e",
      email: "role-assign@example.test",
      id: ASSIGN_USER_ID,
      name: "Assign User E2E",
    },
    {
      discordUserId: "role-officer-user-e2e",
      email: "role-officer@example.test",
      id: OFFICER_USER_ID,
      name: "Role Officer E2E",
    },
    {
      discordUserId: "role-unauthorized-user-e2e",
      email: "role-unauthorized@example.test",
      id: UNAUTHORIZED_USER_ID,
      name: "Role Unauthorized E2E",
    },
    ...targetUsers,
    ...syncUsers,
    accessCreationUser,
  ]);
  const stale = syncUsers[1];
  const duplicate = syncUsers[2];
  const unchanged = syncUsers[3];
  const notFound = syncUsers[5];
  if (!stale || !duplicate || !unchanged || !notFound) {
    throw new Error("Role-management sync fixtures are missing.");
  }
  await db.insert(Permissions).values([
    { roleId: CONFIGURE_ROLE_ID, userId: CONFIGURE_USER_ID },
    { roleId: ASSIGN_ROLE_ID, userId: ASSIGN_USER_ID },
    { roleId: OFFICER_ROLE_ID, userId: OFFICER_USER_ID },
    { roleId: FILTER_ROLE_ID, userId: firstTarget.id },
    { roleId: FILTER_ROLE_ID, userId: secondTarget.id },
    { roleId: SECOND_FILTER_ROLE_ID, userId: firstTarget.id },
    { roleId: SECOND_FILTER_ROLE_ID, userId: thirdTarget.id },
    { roleId: MISSING_ROLE_ID, userId: fourthTarget.id },
    { roleId: DEPENDENT_ROLE_ID, userId: fifthTarget.id },
    { roleId: SYNC_ROLE_ID, userId: stale.id },
    { roleId: SYNC_ROLE_ID, userId: duplicate.id },
    { roleId: SYNC_ROLE_ID, userId: duplicate.id },
    { roleId: SYNC_ROLE_ID, userId: unchanged.id },
    { roleId: SYNC_ROLE_ID, userId: notFound.id },
  ]);
  await db.insert(FormSections).values({
    id: FORM_SECTION_ID,
    name: "Role management dependency E2E",
  });
  await db.insert(FormSectionRoles).values({
    roleId: DEPENDENT_ROLE_ID,
    sectionId: FORM_SECTION_ID,
  });
}

async function signInAs(page: Page, userId: string, callbackURL = ADMIN_PATH) {
  await page.goto(
    `/api/e2e/signin?userId=${encodeURIComponent(userId)}&callbackURL=${encodeURIComponent(callbackURL)}`,
  );
}

async function waitForOverlay(locator: Locator) {
  await expect
    .poll(() =>
      locator.evaluate((element) => getComputedStyle(element).opacity),
    )
    .toBe("1");
}

async function expectAlignedControls(...controls: Locator[]) {
  await expect
    .poll(() =>
      Promise.all(
        controls.map((control) =>
          control.evaluateAll((elements) =>
            Math.max(
              ...elements.map(
                (element) => element.getBoundingClientRect().height,
              ),
            ),
          ),
        ),
      ),
    )
    .toEqual(controls.map(() => 44));
}

async function callTRPCMutation(page: Page, procedure: string, input: unknown) {
  const response = await page.request.post(`/api/trpc/${procedure}`, {
    data: { json: input },
    headers: { "x-trpc-source": "role-management-playwright" },
  });
  return {
    body: (await response.json()) as unknown,
    status: response.status(),
  };
}

function serializedTRPCBody(body: unknown) {
  return JSON.stringify(body);
}

function trpcResult<T>(body: unknown) {
  return (body as { result: { data: { json: T } } }).result.data.json;
}

test.describe("role management", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async () => {
    await seedE2EData();
  });

  test.afterAll(async () => {
    await cleanupE2EData();
  });

  test("enforces configure and assignment capabilities", async ({ page }) => {
    await page.goto(ADMIN_PATH);
    await expect(page).toHaveURL(/\/$/);
    const unauthenticated = await callTRPCMutation(page, "roles.createLink", {
      discordRoleId: "990000000000000002",
      permissions: [],
    });
    expect(unauthenticated.status).toBe(401);

    await signInAs(page, UNAUTHORIZED_USER_ID);
    await expect(page).toHaveURL(/\/member\/dashboard$/);
    const forbidden = await callTRPCMutation(page, "roles.createLink", {
      discordRoleId: "990000000000000002",
      permissions: [],
    });
    expect(forbidden.status).toBe(403);

    await signInAs(page, CONFIGURE_USER_ID);
    await expect(
      page.getByRole("heading", { name: "Role management" }),
    ).toBeVisible();
    const configureSections = page.getByLabel("Role management sections");
    await expect(
      configureSections.getByRole("link", { name: "Roles", exact: true }),
    ).toBeVisible();
    await expect(
      configureSections.getByRole("link", {
        name: "Assignments",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Create role" }),
    ).toBeVisible();
    const configureCannotAssign = await callTRPCMutation(
      page,
      "roles.batchAssign",
      {
        action: "grant",
        roleIds: [FILTER_ROLE_ID],
        userIds: [targetUsers[0]?.id],
      },
    );
    expect(configureCannotAssign.status).toBe(403);

    await signInAs(page, ASSIGN_USER_ID);
    await expect(
      page.getByRole("heading", { name: "Blade users" }),
    ).toBeVisible();
    const assignmentSections = page.getByLabel("Role management sections");
    await expect(
      assignmentSections.getByRole("link", {
        name: "Assignments",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      assignmentSections.getByRole("link", { name: "Roles", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Create role" })).toHaveCount(
      0,
    );
    const assignCannotConfigure = await callTRPCMutation(
      page,
      "roles.createLink",
      {
        discordRoleId: "990000000000000002",
        permissions: [],
      },
    );
    expect(assignCannotConfigure.status).toBe(403);
  });

  test("aligns both desktop search toolbars and omits the email column", async ({
    page,
  }) => {
    await signInAs(page, OFFICER_USER_ID);
    await expectAlignedControls(
      page.getByLabel("Search linked roles"),
      page.getByRole("button", { name: "Search", exact: true }),
      page.getByRole("button", { name: "Filters", exact: true }),
    );

    await page
      .getByLabel("Role management sections")
      .getByRole("link", { name: "Assignments", exact: true })
      .click();
    await expectAlignedControls(
      page.getByLabel("Search Blade users"),
      page.getByRole("button", { name: "Search", exact: true }),
      page.getByRole("button", { name: "Assigned roles", exact: true }),
    );
    await expect(
      page.getByRole("columnheader", { name: "Email", exact: true }),
    ).toHaveCount(0);
  });

  test("creates, assigns, edits, syncs, revokes, and unlinks a cosmetic role", async ({
    browser,
    page,
  }) => {
    await signInAs(page, OFFICER_USER_ID);
    await page.screenshot({
      path: ".playwright-results/admin-roles-desktop.png",
    });
    await page.getByRole("button", { name: "Create role" }).click();
    const createDialog = page.getByRole("dialog");
    await expect(createDialog).toBeVisible();
    await createDialog
      .getByRole("button", { name: /Purple Cosmetic E2E/ })
      .click();
    await createDialog.getByRole("button", { name: "Create role" }).click();
    await expect(page.getByText("Role linked and synchronized.")).toBeVisible();
    const createdRow = page
      .getByRole("row")
      .filter({ hasText: "Purple Cosmetic E2E" });
    await expect(createdRow).toContainText("Cosmetic");

    await page
      .getByLabel("Role management sections")
      .getByRole("link", { name: "Assignments", exact: true })
      .click();
    await expect(page).toHaveURL(/view=assignments/);
    await page.screenshot({
      path: ".playwright-results/admin-role-assignments-desktop.png",
    });
    const search = page.getByRole("textbox", { name: "Search Blade users" });
    await search.fill("target-00");
    await search.press("Enter");
    await expect(page).toHaveURL(/userQuery=target-00/);
    const targetRow = page
      .getByRole("row")
      .filter({ hasText: "Role Target 00" });
    await targetRow.getByRole("checkbox").click();
    await page.getByLabel("Select role Purple Cosmetic E2E").click();
    await page.getByRole("button", { name: "Grant" }).click();
    await page.getByRole("button", { name: "Confirm grant" }).click();
    await expect(page.getByText(/Batch complete\. 1 succeeded/)).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: "Role Target 00" }),
    ).toContainText("Purple Cosmetic E2E");

    const cosmeticContext = await browser.newContext();
    const cosmeticPage = await cosmeticContext.newPage();
    await signInAs(cosmeticPage, targetUsers[0]?.id ?? "");
    await expect(cosmeticPage).toHaveURL(/\/member\/dashboard$/);
    await cosmeticContext.close();

    await targetRow.getByRole("checkbox").click();
    await page.getByRole("button", { name: "Revoke" }).click();
    await page.getByRole("button", { name: "Confirm revoke" }).click();
    await expect(page.getByText(/Batch complete\. 1 succeeded/)).toBeVisible();

    await page
      .getByLabel("Role management sections")
      .getByRole("link", { name: "Roles", exact: true })
      .click();
    const accessRow = page
      .getByRole("row")
      .filter({ hasText: "Purple Cosmetic E2E" });
    await expect(accessRow).toContainText("Cosmetic");
    await accessRow.getByRole("button", { name: "Configure" }).click();
    await expect(page).toHaveURL(/role=[0-9a-f-]{36}/);
    const detail = page.getByRole("dialog");
    await expect(detail.getByText("Purple Cosmetic E2E")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("dialog")).toBeVisible();
    await waitForOverlay(page.getByRole("dialog"));
    await page.screenshot({
      path: ".playwright-results/admin-role-detail-desktop.png",
    });
    await page
      .getByRole("dialog")
      .getByLabel(/Read Members/)
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Save permissions" })
      .click();
    await expect(page.getByText("Role permissions saved.")).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Sync now" })
      .click();
    await expect(page.getByText(/Sync complete:/)).toBeVisible();

    const unlinkDialog = page.getByRole("dialog");
    await unlinkDialog.getByRole("button", { name: "Unlink role" }).click();
    await unlinkDialog
      .getByRole("textbox", { name: /Type I am absolutely sure/ })
      .fill(ROLE_UNLINK_CONFIRMATION);
    await unlinkDialog
      .getByRole("button", { name: "Unlink Blade role" })
      .click();
    await expect(
      page.getByText("Blade role unlinked. Discord was left unchanged."),
    ).toBeVisible();
    await expect(page.getByText("Purple Cosmetic E2E")).toHaveCount(0);

    const relink = await callTRPCMutation(page, "roles.createLink", {
      discordRoleId: CREATED_DISCORD_ROLE_ID,
      permissions: [],
    });
    expect(relink.status).toBe(200);
  });

  test("filters Discord discovery and validates manual previews and permission controls", async ({
    page,
  }) => {
    await signInAs(page, OFFICER_USER_ID);
    await page.getByRole("button", { name: "Create role" }).click();
    const dialog = page.getByRole("dialog");

    await expect(
      dialog.getByRole("button", { name: /Design E2E/ }),
    ).toBeVisible();
    await expect(dialog.getByText("Managed Integration E2E")).toHaveCount(0);
    await expect(dialog.getByText("@everyone", { exact: true })).toHaveCount(0);
    await expect(
      dialog.getByText(STATIC_ADMIN_DISCORD_ROLE_ID, { exact: true }),
    ).toHaveCount(0);

    const permissionCount = Object.keys(PERMISSIONS.PERMISSION_DATA).length;
    await dialog.getByRole("button", { name: "Select all" }).click();
    await expect(
      dialog.getByText(`${permissionCount} permissions selected`),
    ).toBeVisible();
    await dialog.getByLabel("Search permissions").fill("configure roles");
    await expect(
      dialog.getByText("Configure Roles", { exact: true }),
    ).toBeVisible();
    await expect(dialog.getByText("Read Members", { exact: true })).toHaveCount(
      0,
    );
    await dialog.getByRole("button", { name: "Clear all" }).click();
    await expect(dialog.getByText("0 permissions selected")).toBeVisible();
    await dialog.getByLabel("Search permissions").fill("officer");
    await dialog.getByLabel(/Officer/).click();
    await expect(
      dialog.getByText("Officer access is unrestricted"),
    ).toBeVisible();

    await dialog.getByRole("button", { name: "Enter role ID" }).click();
    const manualId = dialog.getByRole("textbox", {
      name: "Discord role ID",
    });
    await manualId.fill("bad-id");
    await expect(
      dialog.getByText("Enter a valid 17–20 digit Discord role ID."),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Create role" }),
    ).toBeDisabled();

    await manualId.fill("990000000000000002");
    await expect(dialog.getByText("Design E2E", { exact: true })).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Create role" }),
    ).toBeEnabled();

    await manualId.fill(MISSING_DISCORD_ROLE_ID);
    await expect(
      dialog.getByText("That Discord role could not be found."),
    ).toBeVisible();
    await manualId.fill(MANAGED_DISCORD_ROLE_ID);
    await expect(
      dialog.getByText("That Discord role cannot be linked in Blade."),
    ).toBeVisible();
    await manualId.fill(DISCORD.KNIGHTHACKS_GUILD);
    await expect(
      dialog.getByText("That Discord role cannot be linked in Blade."),
    ).toBeVisible();
    await manualId.fill(STATIC_ADMIN_DISCORD_ROLE_ID);
    await expect(
      dialog.getByText("That Discord role is already linked."),
    ).toBeVisible();
    await manualId.fill(CONFLICT_DISCORD_ROLE_ID);
    await expect(
      dialog.getByText("A linked role already uses that Discord role name."),
    ).toBeVisible();
  });

  test("creates an access role from Discord metadata and synchronizes existing members immediately", async ({
    page,
  }) => {
    await signInAs(page, OFFICER_USER_ID);
    const response = await callTRPCMutation(page, "roles.createLink", {
      discordRoleId: "990000000000000002",
      permissions: ["READ_MEMBERS", "READ_CLUB_DATA"],
    });
    expect(response.status).toBe(200);
    const result = trpcResult<{
      created: { id: string };
      sync: { summary: { added: number; failed: number } };
    }>(response.body);
    expect(result.sync.summary).toMatchObject({ added: 1, failed: 0 });

    const [role] = await db
      .select({
        discordRoleId: Roles.discordRoleId,
        name: Roles.name,
        permissions: Roles.permissions,
        teamHexcodeColor: Roles.teamHexcodeColor,
      })
      .from(Roles)
      .where(eq(Roles.id, result.created.id));
    expect(role).toEqual({
      discordRoleId: "990000000000000002",
      name: "Design E2E",
      permissions: permissionBitstring("READ_MEMBERS", "READ_CLUB_DATA"),
      teamHexcodeColor: "#2563eb",
    });
    const assignments = await db
      .select({ roleId: Permissions.roleId, userId: Permissions.userId })
      .from(Permissions)
      .where(eq(Permissions.roleId, result.created.id));
    expect(assignments).toEqual([
      { roleId: result.created.id, userId: accessCreationUser.id },
    ]);

    await page.goto(`${ADMIN_PATH}?role=${result.created.id}`);
    await expect(
      page.getByRole("dialog").getByText("Design E2E"),
    ).toBeVisible();
    await expect(
      page.getByRole("dialog").getByText("Access", { exact: true }),
    ).toBeVisible();
  });

  test("persists assignment search, AND filters, pagination, and every page size in the URL", async ({
    page,
  }) => {
    await signInAs(
      page,
      OFFICER_USER_ID,
      `${ADMIN_PATH}?view=assignments&userQuery=Role%20Target`,
    );
    await expect(
      page.getByText("Showing 1-25 of 30 users").first(),
    ).toBeVisible();
    await expect(page.getByText("Page 1 of 2").first()).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(
      page.getByText("Showing 26-30 of 30 users").first(),
    ).toBeVisible();
    await expect(page.getByText("Role Target 29").first()).toBeVisible();
    const search = page.getByRole("textbox", { name: "Search Blade users" });
    await search.fill("target");
    await search.press("Enter");
    await expect
      .poll(() => new URL(page.url()).searchParams.get("page"))
      .toBeNull();

    for (const pageSize of [50, 100, 250, 500, 25] as const) {
      await page.getByLabel("Per page").click();
      await page
        .getByRole("option", { name: String(pageSize), exact: true })
        .click();
      await expect
        .poll(() => new URL(page.url()).searchParams.get("page"))
        .toBeNull();
      await expect
        .poll(() => new URL(page.url()).searchParams.get("pageSize"))
        .toBe(pageSize === 25 ? null : String(pageSize));
      await expect(page.getByText("Role Target 00").first()).toBeVisible();
    }

    await page.getByRole("button", { name: "Assigned roles" }).click();
    const filters = page.getByRole("dialog");
    await filters.getByText("Existing Filter E2E", { exact: true }).click();
    await filters.getByText("Second Filter E2E", { exact: true }).click();
    await filters.getByRole("button", { name: "Apply filter" }).click();
    await expect
      .poll(() => new URL(page.url()).searchParams.getAll("userRole").length)
      .toBe(2);
    const filteredUrl = page.url();
    expect(new URL(filteredUrl).searchParams.getAll("userRole").sort()).toEqual(
      [FILTER_ROLE_ID, SECOND_FILTER_ROLE_ID].sort(),
    );
    await expect(
      page.getByText("Showing 1-1 of 1 users").first(),
    ).toBeVisible();
    await expect(page.getByText("Role Target 00").first()).toBeVisible();
    await expect(page.getByText("Role Target 01")).toHaveCount(0);

    await page.reload();
    await expect(page).toHaveURL(filteredUrl);
    await expect(
      page.getByText("Showing 1-1 of 1 users").first(),
    ).toBeVisible();
    await page.goto(filteredUrl);
    await expect(page.getByText("Role Target 00").first()).toBeVisible();

    await page.goto(`${ADMIN_PATH}?view=roles&role=not-a-uuid`);
    await expect(
      page.getByRole("heading", { name: "Role management" }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("sync reconciles metadata, missing, stale, duplicate, skipped, and failed members", async ({
    page,
  }) => {
    await signInAs(page, OFFICER_USER_ID);
    const response = await callTRPCMutation(page, "roles.syncRole", {
      roleId: SYNC_ROLE_ID,
    });
    expect(response.status).toBe(200);
    const result = trpcResult<{
      role: { name: string; teamHexcodeColor: string | null };
      summary: {
        added: number;
        failed: number;
        removed: number;
        skipped: number;
      };
    }>(response.body);
    expect(result.role).toMatchObject({
      name: "Synchronized Role E2E",
      teamHexcodeColor: "#16a34a",
    });
    expect(result.summary).toMatchObject({
      added: 1,
      failed: 1,
      removed: 2,
      skipped: 1,
    });

    const [storedRole] = await db
      .select({ name: Roles.name, teamHexcodeColor: Roles.teamHexcodeColor })
      .from(Roles)
      .where(eq(Roles.id, SYNC_ROLE_ID));
    expect(storedRole).toEqual({
      name: "Synchronized Role E2E",
      teamHexcodeColor: "#16a34a",
    });
    const assignments = await db
      .select({ userId: Permissions.userId })
      .from(Permissions)
      .where(eq(Permissions.roleId, SYNC_ROLE_ID));
    const assignmentCount = (userId: string) =>
      assignments.filter((row) => row.userId === userId).length;
    expect(assignmentCount(syncUsers[0]?.id ?? "")).toBe(1);
    expect(assignmentCount(syncUsers[1]?.id ?? "")).toBe(0);
    expect(assignmentCount(syncUsers[2]?.id ?? "")).toBe(1);
    expect(assignmentCount(syncUsers[3]?.id ?? "")).toBe(1);
    expect(assignmentCount(syncUsers[4]?.id ?? "")).toBe(0);
    expect(assignmentCount(syncUsers[5]?.id ?? "")).toBe(1);
    expect(assignmentCount(syncUsers[6]?.id ?? "")).toBe(0);
  });

  test("reports partial Discord batch failures and changes only successful pairs", async ({
    page,
  }) => {
    await signInAs(
      page,
      OFFICER_USER_ID,
      `${ADMIN_PATH}?view=assignments&userQuery=Role%20Target%202`,
    );
    const successful = page
      .getByRole("row")
      .filter({ hasText: "Role Target 28" });
    const failed = page.getByRole("row").filter({ hasText: "Role Target 29" });
    await successful.getByRole("checkbox").click();
    await failed.getByRole("checkbox").click();
    await page.getByLabel("Select role Existing Filter E2E").click();
    await expect(page.getByText("2 user-role pairs")).toBeVisible();
    await page.getByRole("button", { name: "Grant" }).click();
    await expect(page.getByText("2 users × 1 roles =")).toBeVisible();
    await page.getByRole("button", { name: "Confirm grant" }).click();
    await expect(
      page.getByText(
        "Batch finished with failures. 1 succeeded, 0 skipped, 1 failed.",
      ),
    ).toBeVisible();

    const rows = await db
      .select({ roleId: Permissions.roleId, userId: Permissions.userId })
      .from(Permissions)
      .where(eq(Permissions.roleId, FILTER_ROLE_ID));
    expect(rows.some((row) => row.userId === targetUsers[28]?.id)).toBe(true);
    expect(rows.some((row) => row.userId === targetUsers[29]?.id)).toBe(false);
  });

  test("revokes every duplicate Blade row only after Discord succeeds", async ({
    page,
  }) => {
    const successfulUser = targetUsers[0];
    const skippedUser = targetUsers[28];
    const failedUser = targetUsers[29];
    if (!successfulUser || !skippedUser || !failedUser) {
      throw new Error("Batch revoke fixtures are missing.");
    }
    await db.insert(Permissions).values([
      { roleId: FILTER_ROLE_ID, userId: successfulUser.id },
      { roleId: FILTER_ROLE_ID, userId: failedUser.id },
    ]);
    await signInAs(page, OFFICER_USER_ID);
    const response = await callTRPCMutation(page, "roles.batchAssign", {
      action: "revoke",
      roleIds: [FILTER_ROLE_ID],
      userIds: [successfulUser.id, skippedUser.id, failedUser.id],
    });
    expect(response.status).toBe(200);
    const result = trpcResult<{
      failed: unknown[];
      skipped: unknown[];
      succeeded: unknown[];
    }>(response.body);
    expect(result.succeeded).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
    expect(result.failed).toHaveLength(1);

    const assignments = await db
      .select({ userId: Permissions.userId })
      .from(Permissions)
      .where(eq(Permissions.roleId, FILTER_ROLE_ID));
    expect(
      assignments.filter((row) => row.userId === successfulUser.id),
    ).toHaveLength(0);
    expect(
      assignments.filter((row) => row.userId === skippedUser.id),
    ).toHaveLength(0);
    expect(
      assignments.filter((row) => row.userId === failedUser.id),
    ).toHaveLength(1);
  });

  test("rejects conflicts and malformed unlinking without changing persisted role data", async ({
    page,
  }) => {
    await signInAs(page, OFFICER_USER_ID);
    const before = await db.select({ id: Roles.id }).from(Roles);

    for (const discordRoleId of [
      STATIC_ADMIN_DISCORD_ROLE_ID,
      CONFLICT_DISCORD_ROLE_ID,
    ]) {
      const duplicate = await callTRPCMutation(page, "roles.createLink", {
        discordRoleId,
        permissions: [],
      });
      expect(duplicate.status).toBe(409);
      expect(serializedTRPCBody(duplicate.body)).toContain("CONFLICT");
    }
    const afterConflicts = await db.select({ id: Roles.id }).from(Roles);
    expect(afterConflicts).toHaveLength(before.length);

    const wrongPhrase = await callTRPCMutation(page, "roles.unlinkRole", {
      confirmation: "I am sort of sure",
      roleId: DEPENDENT_ROLE_ID,
    });
    expect(wrongPhrase.status).toBe(400);
    const dependencyConflict = await callTRPCMutation(
      page,
      "roles.unlinkRole",
      {
        confirmation: ROLE_UNLINK_CONFIRMATION,
        roleId: DEPENDENT_ROLE_ID,
      },
    );
    expect(dependencyConflict.status).toBe(409);
    expect(serializedTRPCBody(dependencyConflict.body)).toContain(
      "still used by another Blade feature",
    );
    const [dependentRole] = await db
      .select({ id: Roles.id })
      .from(Roles)
      .where(eq(Roles.id, DEPENDENT_ROLE_ID));
    const [dependency] = await db
      .select({ roleId: FormSectionRoles.roleId })
      .from(FormSectionRoles)
      .where(eq(FormSectionRoles.roleId, DEPENDENT_ROLE_ID));
    expect(dependentRole?.id).toBe(DEPENDENT_ROLE_ID);
    expect(dependency?.roleId).toBe(DEPENDENT_ROLE_ID);
  });

  test("diagnoses missing Discord roles while allowing safe Blade-only unlink", async ({
    page,
  }) => {
    await signInAs(
      page,
      OFFICER_USER_ID,
      `${ADMIN_PATH}?role=${MISSING_ROLE_ID}`,
    );
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Stored Missing E2E")).toBeVisible();
    await expect(dialog.getByText("Discord role missing")).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Sync now" }),
    ).toBeDisabled();
    await dialog.getByLabel(/Read Members/).click();
    await expect(
      dialog.getByRole("button", { name: "Save permissions" }),
    ).toBeDisabled();

    const update = await callTRPCMutation(page, "roles.updatePermissions", {
      permissions: ["READ_MEMBERS"],
      roleId: MISSING_ROLE_ID,
    });
    expect(update.status).toBe(404);
    const sync = await callTRPCMutation(page, "roles.syncRole", {
      roleId: MISSING_ROLE_ID,
    });
    expect(sync.status).toBe(404);
    const assign = await callTRPCMutation(page, "roles.batchAssign", {
      action: "grant",
      roleIds: [MISSING_ROLE_ID],
      userIds: [targetUsers[3]?.id],
    });
    expect(assign.status).toBe(400);

    const unlink = await callTRPCMutation(page, "roles.unlinkRole", {
      confirmation: ROLE_UNLINK_CONFIRMATION,
      roleId: MISSING_ROLE_ID,
    });
    expect(unlink.status).toBe(200);
    const roleRows = await db
      .select({ id: Roles.id })
      .from(Roles)
      .where(eq(Roles.id, MISSING_ROLE_ID));
    const assignmentRows = await db
      .select({ id: Permissions.id })
      .from(Permissions)
      .where(eq(Permissions.roleId, MISSING_ROLE_ID));
    expect(roleRows).toHaveLength(0);
    expect(assignmentRows).toHaveLength(0);
  });

  test("preserves the final assigned role administrator at the API boundary", async ({
    page,
  }) => {
    await signInAs(page, OFFICER_USER_ID);
    const roleRows = await db
      .select({ id: Roles.id, permissions: Roles.permissions })
      .from(Roles);
    const officerIndex = PERMISSIONS.PERMISSIONS.IS_OFFICER;
    const configureIndex = PERMISSIONS.PERMISSIONS.CONFIGURE_ROLES;
    const adminRoleIds = roleRows
      .filter(
        (role) =>
          (officerIndex != null && role.permissions.at(officerIndex) === "1") ||
          (configureIndex != null &&
            role.permissions.at(configureIndex) === "1"),
      )
      .map((role) => role.id);
    const originalAssignments = await db
      .select()
      .from(Permissions)
      .where(inArray(Permissions.roleId, adminRoleIds));
    const officerAssignment = originalAssignments.find(
      (row) => row.roleId === OFFICER_ROLE_ID && row.userId === OFFICER_USER_ID,
    );
    if (!officerAssignment) {
      throw new Error("Officer assignment fixture is missing.");
    }

    await db
      .delete(Permissions)
      .where(inArray(Permissions.roleId, adminRoleIds));
    await db.insert(Permissions).values(officerAssignment);
    try {
      const update = await callTRPCMutation(page, "roles.updatePermissions", {
        permissions: ["READ_MEMBERS"],
        roleId: OFFICER_ROLE_ID,
      });
      expect(update.status).toBe(409);
      expect(serializedTRPCBody(update.body)).toContain(
        "remove the final role administrator",
      );

      const unlink = await callTRPCMutation(page, "roles.unlinkRole", {
        confirmation: ROLE_UNLINK_CONFIRMATION,
        roleId: OFFICER_ROLE_ID,
      });
      expect(unlink.status).toBe(409);
      expect(serializedTRPCBody(unlink.body)).toContain(
        "final assigned role administrator",
      );
      const preservedAssignments = await db
        .select({ id: Permissions.id })
        .from(Permissions)
        .where(eq(Permissions.roleId, OFFICER_ROLE_ID));
      expect(preservedAssignments).toHaveLength(1);
    } finally {
      await db
        .delete(Permissions)
        .where(inArray(Permissions.roleId, adminRoleIds));
      if (originalAssignments.length > 0) {
        await db.insert(Permissions).values(originalAssignments);
      }
    }
  });

  test("keeps roles and assignment controls contained at 320px", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { height: 740, width: 320 },
    });
    const page = await context.newPage();
    await signInAs(page, OFFICER_USER_ID);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
    await page.screenshot({
      path: ".playwright-results/admin-roles-mobile-list.png",
    });

    await page.getByRole("button", { name: "Create role" }).click();
    const createDialog = page.getByRole("dialog");
    await expect(createDialog).toBeVisible();
    await waitForOverlay(createDialog);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
    await page.screenshot({
      path: ".playwright-results/admin-roles-mobile-create.png",
    });
    await page.keyboard.press("Escape");

    await page
      .getByLabel("Role management sections")
      .getByRole("link", { name: "Assignments", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Blade users" }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
    await page.screenshot({
      path: ".playwright-results/admin-role-assignments-mobile.png",
    });
    await context.close();
  });
});
