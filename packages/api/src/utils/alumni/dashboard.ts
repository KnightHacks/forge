export type AlumniDashboardMode = "alumni" | "current" | "needs_confirmation";

interface AlumniStatusInput {
  alumniConfirmedAt: Date | string | null;
  gradDate: Date | string;
}

function dateOnly(value: Date | string) {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : value.slice(0, 10);
}

export function getAlumniDashboardMode(
  member: AlumniStatusInput,
  now = new Date(),
): AlumniDashboardMode {
  if (dateOnly(member.gradDate) >= now.toISOString().slice(0, 10)) {
    return "current";
  }

  return member.alumniConfirmedAt ? "alumni" : "needs_confirmation";
}

interface BulletinLifecycle {
  archivedAt: Date | string | null;
  displayOrder: number;
  expiresAt: Date | string | null;
  publishAt: Date | string | null;
  state: "archived" | "draft" | "published";
}

function time(value: Date | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function listActiveBulletinPosts<T extends BulletinLifecycle>(
  posts: readonly T[],
  now = new Date(),
) {
  const nowTime = now.getTime();
  return posts
    .filter(
      (post) =>
        post.state === "published" &&
        post.archivedAt === null &&
        (post.publishAt === null || time(post.publishAt) <= nowTime) &&
        (post.expiresAt === null || time(post.expiresAt) > nowTime),
    )
    .sort((left, right) => left.displayOrder - right.displayOrder);
}

interface RecapAttendance {
  eventName: string;
  eventType: string;
  startAt: Date | string;
  tagName: string;
}

interface RecapMember {
  dateCreated: Date | string;
  gradDate: Date | string;
  points: number;
}

function semesterFor(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const month = date.getUTCMonth();
  const term = month <= 3 ? "Spring" : month <= 6 ? "Summer" : "Fall";
  return {
    key: `${date.getUTCFullYear()}-${term === "Spring" ? 1 : term === "Summer" ? 2 : 3}`,
    label: `${term} ${date.getUTCFullYear()}`,
    sort:
      date.getUTCFullYear() * 10 +
      (term === "Spring" ? 1 : term === "Summer" ? 2 : 3),
  };
}

function mostFrequent<T>(
  values: readonly T[],
  tieBreaker: (left: T, right: T) => number,
) {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);

  return [...counts].sort(
    ([leftValue, leftCount], [rightValue, rightCount]) =>
      rightCount - leftCount || tieBreaker(leftValue, rightValue),
  )[0]?.[0];
}

export function buildAlumniRecap({
  attendances,
  member,
}: {
  attendances: readonly RecapAttendance[];
  member: RecapMember;
}) {
  const clubAttendances = attendances
    .filter((attendance) => attendance.eventType !== "hackathon")
    .sort((left, right) => time(left.startAt) - time(right.startAt));
  const result: {
    classOf: number;
    clubEventCount?: number;
    firstClubEvent?: { name: string; occurredAt: string };
    lifetimePoints?: number;
    memberSince: number;
    mostActiveSemester?: string;
    mostAttendedTag?: string;
  } = {
    classOf: Number(dateOnly(member.gradDate).slice(0, 4)),
    memberSince: Number(dateOnly(member.dateCreated).slice(0, 4)),
  };

  if (member.points > 0) result.lifetimePoints = member.points;
  if (clubAttendances.length === 0) return result;

  result.clubEventCount = clubAttendances.length;
  const first = clubAttendances[0];
  if (first) {
    result.firstClubEvent = {
      name: first.eventName,
      occurredAt:
        first.startAt instanceof Date
          ? first.startAt.toISOString()
          : first.startAt,
    };
  }

  const semesters = new Map<
    string,
    { count: number; label: string; sort: number }
  >();
  for (const attendance of clubAttendances) {
    const semester = semesterFor(attendance.startAt);
    const existing = semesters.get(semester.key);
    semesters.set(semester.key, {
      count: (existing?.count ?? 0) + 1,
      label: semester.label,
      sort: semester.sort,
    });
  }
  result.mostActiveSemester = [...semesters.values()].sort(
    (left, right) => right.count - left.count || right.sort - left.sort,
  )[0]?.label;
  result.mostAttendedTag = mostFrequent(
    clubAttendances.map((attendance) => attendance.tagName),
    (left, right) => left.localeCompare(right),
  );

  return result;
}

const officerOrder = [
  {
    email: "president@knighthacks.org",
    office: "President",
  },
  {
    email: "vp@knighthacks.org",
    office: "Vice President",
  },
  {
    email: "secretary@knighthacks.org",
    office: "Secretary",
  },
  {
    email: "treasurer@knighthacks.org",
    office: "Treasurer",
  },
] as const;

interface OfficerAssignment {
  discordUserId: string | null;
  name: string;
  profilePictureUrl: string | null;
  roleName: string;
  userId: string;
}

export function listCurrentAlumniOfficers(
  assignments: readonly OfficerAssignment[],
) {
  return officerOrder.flatMap(({ email, office }) =>
    assignments
      .filter((assignment) => assignment.roleName === office)
      .map((assignment) => ({
        discordUserId: assignment.discordUserId,
        email,
        name: assignment.name,
        office,
        profilePictureUrl: assignment.profilePictureUrl,
        userId: assignment.userId,
      })),
  );
}
