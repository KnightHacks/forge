import { eq } from "drizzle-orm";

import { db } from "../src/client";
import { inspectHackerSdkIntegrity } from "../src/hacker-sdk/preflight";
import { User } from "../src/schemas/auth";
import { Hacker, HackerAttendee } from "../src/schemas/knight-hacks";

const [hackerRows, attendees] = await Promise.all([
  db
    .select({
      hackerId: Hacker.id,
      resolvedUserId: User.id,
      userId: Hacker.userId,
    })
    .from(Hacker)
    .leftJoin(User, eq(User.id, Hacker.userId)),
  db
    .select({
      attendeeId: HackerAttendee.id,
      hackerId: HackerAttendee.hackerId,
      hackathonId: HackerAttendee.hackathonId,
    })
    .from(HackerAttendee),
]);

const report = inspectHackerSdkIntegrity(
  hackerRows.map((hacker) => ({
    hackerId: hacker.hackerId,
    userExists: hacker.resolvedUserId !== null,
    userId: hacker.userId,
  })),
  attendees,
);

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.canMigrate) process.exitCode = 1;
