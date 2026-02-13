/* eslint-disable no-console */
/**
 * ONE-TIME BOOTSTRAP SCRIPT
// This script creates a superadmin role with all permissions and assigns it to a user.
// Use this to bootstrap the first admin user who can then manage roles through the UI.
// Usage:
//   pnpm --filter @forge/db with-env tsx scripts/bootstrap-superadmin.ts <role-id> <user-id>
// Example:
//   pnpm --filter @forge/db with-env tsx scripts/bootstrap-superadmin.ts 1321955700540309645 238081392481665025
// Arguments:
//   discord-role-id: The Discord role ID to link to (e.g., an Admin role in your Discord server)
//   discord-user-id: The Discord user ID of the person to grant superadmin access
*/
import { eq } from "drizzle-orm";

import { PERMISSIONS } from "@forge/consts";

import { db } from "../src/client";
import { Permissions, Roles } from "../src/schemas/auth";

async function bootstrapSuperadmin() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error("Error: Invalid arguments");
    console.error("\nUsage:");
    console.error(
      "  pnpm --filter @forge/db with-env tsx scripts/bootstrap-superadmin.ts <role-id> <user-id>",
    );
    console.error("\nExample:");
    console.error(
      "  pnpm --filter @forge/db with-env tsx scripts/bootstrap-superadmin.ts 1321955700540309645 238081392481665025",
    );
    process.exit(1);
  }

  const [discordRoleId, discordUserId] = args;

  console.log("Starting superadmin bootstrap...\n");

  // Create superadmin permission string (all permissions set to "1")
  const permissionsCount = Object.keys(PERMISSIONS.PERMISSIONS).length;
  const allPermissions = "1".repeat(permissionsCount);

  console.log(
    `Permission string (${permissionsCount} permissions): ${allPermissions}`,
  );
  console.log(`   All permissions enabled:\n`);
  Object.entries(PERMISSIONS.PERMISSIONS).forEach(([key, index]) => {
    console.log(`   [${index}] ${key}`);
  });
  console.log("");

  try {
    // Check if the Discord role is already linked
    if (!discordRoleId) {
      console.error("Error: Discord role ID is required");
      process.exit(1);
    }

    const existingRole = await db.query.Roles.findFirst({
      where: (t, { eq }) => eq(t.discordRoleId, discordRoleId),
    });

    let roleId: string;

    if (existingRole) {
      console.log(
        `Discord role ${discordRoleId} is already linked to role: ${existingRole.name}`,
      );
      console.log(`   Updating permissions to superadmin level...\n`);

      // Update existing role with all permissions
      await db
        .update(Roles)
        .set({
          name: "Superadmin",
          permissions: allPermissions,
        })
        .where(eq(Roles.discordRoleId, discordRoleId));

      roleId = existingRole.id;
      console.log(`Updated role: ${existingRole.name} -> Superadmin`);
    } else {
      console.log(
        `Creating new Superadmin role linked to Discord role ${discordRoleId}...\n`,
      );

      // Insert new role
      const [newRole] = await db
        .insert(Roles)
        .values({
          name: "Superadmin",
          discordRoleId: discordRoleId,
          permissions: allPermissions,
        })
        .returning();

      if (!newRole) {
        throw new Error("Failed to create role");
      }

      roleId = newRole.id;
      console.log(`Created Superadmin role with ID: ${roleId}`);
    }

    // Find the user by Discord user ID
    if (!discordUserId) {
      console.error("Error: Discord user ID is required");
      process.exit(1);
    }

    const user = await db.query.User.findFirst({
      where: (t, { eq }) => eq(t.discordUserId, discordUserId),
    });

    if (!user) {
      console.error(`\nError: No user found with Discord ID: ${discordUserId}`);
      console.error(
        `   Make sure the user has logged into Blade at least once.`,
      );
      process.exit(1);
    }

    console.log(`\nFound user: ${user.name ?? "Unknown"} (ID: ${user.id})`);

    // Check if permission already exists
    const existingPermission = await db.query.Permissions.findFirst({
      where: (t, { and, eq }) =>
        and(eq(t.userId, user.id), eq(t.roleId, roleId)),
    });

    if (existingPermission) {
      console.log(`\nUser already has this role assigned.`);
      console.log(`✅ Bootstrap complete - no changes needed.\n`);
      process.exit(0);
    }

    // Grant the role to the user
    await db.insert(Permissions).values({
      roleId: roleId,
      userId: user.id,
    });

    console.log(`\nGranted Superadmin role to user ${user.name}`);
    console.log(
      `\nBootstrap complete! User ${user.name} now has full superadmin access.`,
    );
    console.log(`   They can now manage roles through the Blade UI.\n`);
  } catch (error) {
    console.error("\nError during bootstrap:");
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

await bootstrapSuperadmin();
