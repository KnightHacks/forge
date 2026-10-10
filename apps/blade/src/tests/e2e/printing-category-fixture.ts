import { randomUUID } from "node:crypto";

import { db } from "@forge/db/client";
import {
  Hacker,
  HackerAttendee,
  HackerProfile,
  PrintJob,
} from "@forge/db/schemas/knight-hacks";

/** Sixty requests exercise bounded scrolling, long descriptions, and categories. */
export async function seedPrintingCategories(
  hackathonId: string,
  userId: string,
) {
  const profileId = randomUUID();
  const hackerId = randomUUID();
  const attendeeId = randomUUID();
  const fields = {
    userId,
    firstName: "Ada",
    lastName: "Printer",
    email: "printing@example.test",
    discordUser: "ada-printer",
    dob: "2004-02-29",
    gradDate: "2027-05-01",
    country: "United States of America" as const,
    gender: "Prefer not to answer" as const,
    levelOfStudy: "Undergraduate University (3+ year)" as const,
    major: "Computer Science" as const,
    raceOrEthnicity: "Prefer not to answer" as const,
    school: "University of Central Florida",
    shirtSize: "M" as const,
    phoneNumber: "4075550100",
  };
  await db
    .insert(Hacker)
    .values({ ...fields, id: hackerId, age: 22, survey1: "", survey2: "" });
  await db.insert(HackerProfile).values({ ...fields, id: profileId });
  await db.insert(HackerAttendee).values({
    id: attendeeId,
    hackathonId,
    hackerId,
    profileId,
    status: "checkedin",
  });
  const uncategorizedId = randomUUID();
  await db.insert(PrintJob).values(
    Array.from({ length: 60 }, (_, i) => ({
      id: i === 0 ? uncategorizedId : randomUUID(),
      hackathonId,
      hackerAttendeeId: attendeeId,
      description:
        i === 0
          ? "Legacy model needing a category"
          : i % 3 === 0
            ? "A small mounting bracket for our hackathon robot with a long description about placement, tolerances, material, and fit."
            : "A personal decorative model",
      category:
        i === 0
          ? null
          : i % 3 === 0
            ? ("project" as const)
            : ("personal" as const),
      createdAt: new Date(Date.UTC(2026, 9, 10, 12, i)),
    })),
  );
  return uncategorizedId;
}
