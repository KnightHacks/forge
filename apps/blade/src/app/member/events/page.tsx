import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MemberEventsDashboard } from "~/app/_components/member/member-events-dashboard";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  description: "View upcoming Knight Hacks events and attendance history.",
  title: "Blade | Events",
};

export default async function MemberEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string | string[] }>;
}) {
  const params = await searchParams;
  const selectedEventId =
    typeof params.selected === "string" ? params.selected : null;
  const session = await auth();
  if (!session) {
    const callbackURL = `/member/events${selectedEventId ? `?selected=${encodeURIComponent(selectedEventId)}` : ""}`;
    redirect(
      `/api/auth/signin?provider=discord&callbackURL=${encodeURIComponent(callbackURL)}`,
    );
  }

  const [eventRows, attendanceRows, feedbackRows] = await Promise.all([
    api.event.listMemberEvents(),
    api.event.listMemberAttendance(),
    api.event.listMyFeedback(),
  ]);
  return (
    <MemberEventsDashboard
      attendance={attendanceRows}
      events={eventRows}
      selectedEventId={selectedEventId}
      feedback={feedbackRows
        .filter(
          (
            feedback,
          ): feedback is Exclude<
            typeof feedback,
            { status: "not_applicable" }
          > => "dueAt" in feedback,
        )
        .map((feedback) => ({
          ...feedback,
          dueAt: feedback.dueAt.toISOString(),
          ...(feedback.status === "completed"
            ? { submittedAt: feedback.submittedAt.toISOString() }
            : {}),
        }))}
    />
  );
}
