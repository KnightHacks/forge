import type { Metadata } from "next";
import { redirect } from "next/navigation";

import type {
  MemberAttendanceItem,
  MemberEventItem,
} from "~/app/_components/member/member-events-dashboard";
import { MemberEventsDashboard } from "~/app/_components/member/member-events-dashboard";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  description: "View upcoming Knight Hacks events and attendance history.",
  title: "Blade | Events",
};

const FALLBACK_TAG_COLOR = "#CCA4F4";

export default async function MemberEventsPage() {
  const session = await auth();
  if (!session) redirect("/");

  const [eventRows, attendanceRows] = await Promise.all([
    api.event.listMemberEvents(),
    api.event.listMemberAttendance(),
  ]);
  const colorByTag = new Map(
    eventRows.map((event) => [event.tag, event.tagColor]),
  );
  const events: MemberEventItem[] = eventRows.map((event) => ({
    audience: event.audience,
    description: event.description,
    endDateTime: event.endAt,
    id: event.id,
    internal: event.internal,
    location: event.location,
    locked: event.locked,
    name: event.name,
    startDateTime: event.startAt,
    tag: event.tag,
    tagColor: event.tagColor,
  }));
  const attendance: MemberAttendanceItem[] = attendanceRows.map((record) => ({
    attendanceId: record.attendanceId,
    checkedInAt: record.checkedInAt,
    estimated: record.pointsAwardedEstimated,
    eventId: record.eventId,
    eventName: record.name,
    pointsAwarded: record.pointsAwarded,
    startDateTime: record.startAt,
    tag: record.tag,
    tagColor:
      "tagColor" in record && typeof record.tagColor === "string"
        ? record.tagColor
        : (colorByTag.get(record.tag) ?? FALLBACK_TAG_COLOR),
  }));

  return (
    <HydrateClient>
      <MemberEventsDashboard attendance={attendance} events={events} />
    </HydrateClient>
  );
}
