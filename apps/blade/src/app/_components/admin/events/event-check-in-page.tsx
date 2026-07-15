"use client";

import type {
  CheckInMemberChoice,
  CheckInRequest,
  CheckInResult,
} from "./event-check-in-panel";
import type { CheckInEventGroups } from "./types";
import { api } from "~/trpc/react";
import { EventCheckInPanel } from "./event-check-in-panel";

export function EventCheckInPage({
  checkIn,
  groups,
  searchMembers,
}: {
  checkIn?: (input: CheckInRequest) => Promise<CheckInResult>;
  groups: CheckInEventGroups;
  searchMembers?: (query: string) => Promise<CheckInMemberChoice[]>;
}) {
  const utils = api.useUtils();
  const checkInMember = api.event.checkInMember.useMutation();

  async function defaultSearchMembers(query: string) {
    const result = await utils.event.searchCheckInMembers.fetch({
      limit: 20,
      query,
    });
    return result.map((member) => ({
      discordUsername: member.discordUsername,
      email: member.email,
      id: member.memberId,
      name: member.name,
      userId: member.userId,
    }));
  }

  async function defaultCheckIn(input: CheckInRequest): Promise<CheckInResult> {
    const result = await checkInMember.mutateAsync(
      "memberId" in input
        ? {
            eventId: input.eventId,
            memberId: input.memberId,
          }
        : {
            allowRepeat: input.allowRepeat,
            eventId: input.eventId,
            qrPayload: input.qrPayload,
          },
    );
    switch (result.status) {
      case "checked_in":
        return {
          member: result.member,
          message:
            "allowRepeat" in input && input.allowRepeat
              ? `Repeat check-in recorded · ${result.pointsAwarded} points.`
              : `Checked in · ${result.pointsAwarded} points.`,
          state: "success",
        };
      case "already_checked_in":
        return {
          member: result.member,
          message: "Already checked in.",
          state: "already_checked_in",
        };
      case "dues_required":
        return {
          member: result.member,
          message: "Dues are required for this event.",
          state: "error",
        };
      case "role_required":
        return {
          member: result.member,
          message: "This member is not eligible for the event.",
          state: "error",
        };
      case "member_not_found":
        return { message: "Member not found.", state: "error" };
      default:
        return {
          message: "Scan a valid member QR code.",
          state: "error",
        };
    }
  }

  return (
    <main
      data-testid="event-check-in-workspace"
      data-check-in-layout="streamlined"
      className="min-h-[calc(100dvh-4rem)] min-w-0 pb-0 sm:container sm:space-y-6 sm:pb-16 sm:pt-8"
    >
      <header className="px-4 pb-3 pt-4 sm:p-0">
        <p className="hidden text-sm font-medium text-primary sm:block">
          Administration
        </p>
        <h1 className="text-2xl font-semibold sm:mt-1 sm:text-4xl">
          Event check-in
        </h1>
      </header>

      <EventCheckInPanel
        groups={groups}
        checkIn={checkIn ?? defaultCheckIn}
        searchMembers={searchMembers ?? defaultSearchMembers}
      />
    </main>
  );
}
