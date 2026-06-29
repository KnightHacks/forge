import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import type { AdminEventSearchParams } from "~/app/_components/admin/events/params";
import { canAccessEventAdmin } from "~/app/_components/admin/access";
import { EventAdminDashboard } from "~/app/_components/admin/events/event-admin-dashboard";
import {
  buildAdminEventSearchParams,
  defaultAdminCalendarWindow,
  parseAdminEventSearchParams,
} from "~/app/_components/admin/events/params";
import {
  eventQueryInput,
  eventRowsToAdminData,
  eventRowToDetail,
} from "~/app/_components/admin/events/server-adapters";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  description: "Manage Knight Hacks club events, check-in, and integrations.",
  title: "Blade | Event Management",
};

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<AdminEventSearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await api.roles.getPermissions();
  if (!canAccessEventAdmin(permissions)) redirect(MEMBER_DASHBOARD_PATH);

  const access = {
    canCheckIn:
      permissions.IS_OFFICER === true ||
      permissions.CHECKIN_CLUB_EVENT === true,
    canEdit:
      permissions.IS_OFFICER === true || permissions.EDIT_CLUB_EVENT === true,
    canRead:
      permissions.IS_OFFICER === true ||
      permissions.READ_CLUB_EVENT === true ||
      permissions.EDIT_CLUB_EVENT === true,
    isOfficer: permissions.IS_OFFICER === true,
  };
  const parsed = parseAdminEventSearchParams(await searchParams);
  const input = {
    ...parsed.input,
    view:
      parsed.input.view === "check-in" && access.canCheckIn
        ? ("check-in" as const)
        : parsed.input.view === "tags" && access.canEdit
          ? ("tags" as const)
          : access.canRead
            ? parsed.input.view === "calendar"
              ? ("calendar" as const)
              : ("list" as const)
            : ("check-in" as const),
  };

  if (input.view !== parsed.input.view) {
    redirect(`/admin/events?view=${input.view}`);
  }

  if (
    input.view === "calendar" &&
    (!input.calendarStart || !input.calendarEnd)
  ) {
    const params = buildAdminEventSearchParams(
      {
        ...input,
        ...defaultAdminCalendarWindow(),
      },
      parsed.selectedEventId,
    );
    redirect(`/admin/events?${params.toString()}`);
  }

  const shouldList =
    access.canRead && (input.view === "list" || input.view === "calendar");
  const [
    result,
    tags,
    roleChoices,
    channels,
    checkInEvents,
    detailRow,
    attendees,
  ] = await Promise.all([
    shouldList
      ? api.event.listAdminEvents(eventQueryInput(input))
      : Promise.resolve(null),
    access.canRead ? api.event.listEventTags() : Promise.resolve([]),
    access.canRead ? api.event.listAudienceRoles() : Promise.resolve([]),
    access.canEdit
      ? api.event.listDiscordChannels().catch(() => [])
      : Promise.resolve([]),
    access.canCheckIn && input.view === "check-in"
      ? api.event.listCheckInEvents({ olderSearch: "" })
      : Promise.resolve(null),
    access.canRead && parsed.selectedEventId
      ? api.event
          .getAdminEvent({ eventId: parsed.selectedEventId })
          .catch(() => null)
      : Promise.resolve(null),
    access.canRead && parsed.selectedEventId
      ? api.event
          .listAttendees({ eventId: parsed.selectedEventId })
          .then((rows) => ({ error: false, rows }))
          .catch(() => ({ error: true, rows: [] }))
      : Promise.resolve({ error: false, rows: [] }),
  ]);

  const tagItems = tags.map((tag) => ({
    active: tag.active,
    color: tag.color,
    defaultPoints: tag.defaultPoints,
    id: tag.id,
    name: tag.name,
  }));
  const data = result
    ? eventRowsToAdminData({
        input,
        channels,
        ...(input.view === "list" && "pagination" in result
          ? { pagination: result.pagination }
          : {}),
        roles: roleChoices,
        rows: result.rows,
        tags: tagItems,
      })
    : null;
  const detail = detailRow
    ? eventRowToDetail({
        attendees: attendees.rows,
        attendeesError: attendees.error,
        channels,
        roles: roleChoices,
        row: detailRow,
      })
    : null;

  return (
    <HydrateClient>
      <EventAdminDashboard
        key={JSON.stringify(input)}
        access={access}
        channels={channels}
        checkInEvents={checkInEvents}
        data={data}
        detail={detail}
        input={input}
        tags={tagItems}
      />
    </HydrateClient>
  );
}
