export interface LegacyHackerRecord {
  hackerId: string;
  userExists: boolean;
  userId: string;
}

export interface LegacyHackerAttendeeRecord {
  attendeeId: string;
  hackerId: string;
  hackathonId: string;
}

export type HackerSdkPreflightIssueCode =
  | "DUPLICATE_APPLICATION"
  | "MISSING_HACKER"
  | "MISSING_USER";

export interface HackerSdkPreflightReport {
  canMigrate: boolean;
  issues: {
    attendeeIds: string[];
    code: HackerSdkPreflightIssueCode;
    hackerIds: string[];
    hackathonId?: string;
    message: string;
    userId?: string;
  }[];
}

export function inspectHackerSdkIntegrity(
  hackers: readonly LegacyHackerRecord[],
  attendees: readonly LegacyHackerAttendeeRecord[],
): HackerSdkPreflightReport {
  const hackerById = new Map(
    hackers.map((hacker) => [hacker.hackerId, hacker]),
  );
  const issues: HackerSdkPreflightReport["issues"] = [];

  for (const hacker of hackers) {
    if (hacker.userExists) continue;
    issues.push({
      attendeeIds: attendees
        .filter((attendee) => attendee.hackerId === hacker.hackerId)
        .map((attendee) => attendee.attendeeId),
      code: "MISSING_USER",
      hackerIds: [hacker.hackerId],
      message: `Hacker ${hacker.hackerId} references missing user ${hacker.userId}.`,
      userId: hacker.userId,
    });
  }

  for (const attendee of attendees) {
    if (hackerById.has(attendee.hackerId)) continue;
    issues.push({
      attendeeIds: [attendee.attendeeId],
      code: "MISSING_HACKER",
      hackerIds: [attendee.hackerId],
      hackathonId: attendee.hackathonId,
      message: `Attendee ${attendee.attendeeId} references missing hacker ${attendee.hackerId}.`,
    });
  }

  const applications = new Map<
    string,
    {
      attendeeIds: string[];
      hackerIds: string[];
      hackathonId: string;
      userId: string;
    }
  >();
  for (const attendee of attendees) {
    const hacker = hackerById.get(attendee.hackerId);
    if (!hacker) continue;
    const key = `${hacker.userId}:${attendee.hackathonId}`;
    const current = applications.get(key) ?? {
      attendeeIds: [],
      hackerIds: [],
      hackathonId: attendee.hackathonId,
      userId: hacker.userId,
    };
    current.attendeeIds.push(attendee.attendeeId);
    current.hackerIds.push(attendee.hackerId);
    applications.set(key, current);
  }
  for (const application of applications.values()) {
    if (application.attendeeIds.length < 2) continue;
    issues.push({
      attendeeIds: application.attendeeIds,
      code: "DUPLICATE_APPLICATION",
      hackerIds: [...new Set(application.hackerIds)],
      hackathonId: application.hackathonId,
      message: `User ${application.userId} has ${application.attendeeIds.length} applications for hackathon ${application.hackathonId}.`,
      userId: application.userId,
    });
  }

  return { canMigrate: issues.length === 0, issues };
}
