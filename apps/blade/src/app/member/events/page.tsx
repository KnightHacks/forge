import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MemberEventsDashboard } from "~/app/_components/member/member-events-dashboard";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  description: "View upcoming Knight Hacks events and attendance history.",
  title: "Blade | Events",
};

export default async function MemberEventsPage() {
  const session = await auth();
  if (!session) redirect("/");

  const [eventRows, attendanceRows, feedbackRows] = await Promise.all([
    api.event.listMemberEvents(),
    api.event.listMemberAttendance(),
    api.event.listMyFeedback(),
  ]);
  return (
    <HydrateClient>
      <MemberEventsDashboard
        attendance={attendanceRows}
        events={eventRows}
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
    </HydrateClient>
  );
}
