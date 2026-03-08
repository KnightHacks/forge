import { PERMISSIONS } from "@forge/consts";
import * as authSchema from "@forge/db/schemas/auth";
import type { InsertEvent, InsertMember } from "@forge/db/schemas/knight-hacks";
import { Event, Member } from "@forge/db/schemas/knight-hacks";

import { getTestDb } from "./db";

/**
 * Creates a test user in the database.
 */
export async function createTestUser(
  overrides?: Partial<typeof authSchema.User.$inferInsert>,
) {
  const testDb = getTestDb();

  const [user] = await testDb
    .insert(authSchema.User)
    .values({
      discordUserId: `test_${Date.now()}_${Math.random()}`,
      name: "Test User",
      email: "test@example.com",
      ...overrides,
    })
    .returning();

  if (!user) throw new Error("Failed to create test user");
  return user;
}

/**
 * Creates a test role in the database.
 */
export async function createTestRole(
  overrides?: Partial<typeof authSchema.Roles.$inferInsert>,
) {
  const testDb = getTestDb();

  const permissionsCount = Object.keys(PERMISSIONS.PERMISSIONS).length;
  const defaultPermissions = "0".repeat(permissionsCount);

  const [role] = await testDb
    .insert(authSchema.Roles)
    .values({
      name: `Test Role ${Date.now()}_${Math.random().toString(36).slice(2)}`,
      discordRoleId: `test_role_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      permissions: defaultPermissions,
      ...overrides,
    })
    .returning();

  if (!role) throw new Error("Failed to create test role");
  return role;
}

/**
 * Creates a test member in the database.
 */
export async function createTestMember(
  userId: string,
  overrides?: Partial<InsertMember>,
) {
  const testDb = getTestDb();

  const now = new Date();
  const dob = new Date(now.getFullYear() - 20, 0, 1); // 20 years old
  const gradDate = new Date(now.getFullYear() + 2, 5, 1); // 2 years from now

  const [member] = await testDb
    .insert(Member)
    .values({
      userId,
      firstName: "Test",
      lastName: "Member",
      discordUser: `testmember_${Date.now()}`,
      age: 20,
      email: `testmember_${Date.now()}@example.com`,
      school: "University of Central Florida",
      levelOfStudy: "Undergraduate",
      major: "Computer Science",
      dob,
      gradDate,
      shirtSize: "M",
      ...overrides,
    })
    .returning();

  if (!member) throw new Error("Failed to create test member");
  return member;
}

/**
 * Creates a test event in the database.
 */
export async function createTestEvent(overrides?: Partial<InsertEvent>) {
  const testDb = getTestDb();

  const now = new Date();
  const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

  const [event] = await testDb
    .insert(Event)
    .values({
      name: "Test Event",
      description: "A test event",
      startDate,
      endDate,
      location: "Test Location",
      discordId: `test_event_${Date.now()}`,
      googleCalendarId: null,
      isHackathonEvent: false,
      requiresDues: false,
      ...overrides,
    })
    .returning();

  if (!event) throw new Error("Failed to create test event");
  return event;
}

/**
 * Grants a role to a user.
 */
export async function grantRole(userId: string, roleId: string) {
  const testDb = getTestDb();

  const [permission] = await testDb
    .insert(authSchema.Permissions)
    .values({
      userId,
      roleId,
    })
    .returning();

  if (!permission) throw new Error("Failed to grant role");
  return permission;
}
