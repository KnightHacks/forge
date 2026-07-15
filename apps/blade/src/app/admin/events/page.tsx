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
  description: "Manage Knight Hacks club events and integrations.",
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
    canEdit:
      permissions.IS_OFFICER === true || permissions.EDIT_CLUB_EVENT === true,
    canRead:
      permissions.IS_OFFICER === true ||
      permissions.READ_CLUB_EVENT === true ||
      permissions.EDIT_CLUB_EVENT === true,
    canReadResponses:
      permissions.IS_OFFICER === true ||
      permissions.READ_FORM_RESPONSES === true,
    isOfficer: permissions.IS_OFFICER === true,
  };
  const parsed = parseAdminEventSearchParams(await searchParams);
  const input = {
    ...parsed.input,
    view:
      parsed.input.view === "tags" && access.canEdit
        ? ("tags" as const)
        : parsed.input.view === "calendar"
          ? ("calendar" as const)
          : ("list" as const),
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

  const [result, tags, roleChoices, channels, detailRow, attendees] =
    await Promise.all([
      api.event.listAdminEvents(eventQueryInput(input)),
      api.event.listEventTags(),
      api.event.listAudienceRoles(),
      access.canEdit
        ? api.event.listDiscordChannels().catch(() => [])
        : Promise.resolve([]),
      parsed.selectedEventId
        ? api.event
            .getAdminEvent({ eventId: parsed.selectedEventId })
            .catch(() => null)
        : Promise.resolve(null),
      parsed.selectedEventId
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
  const data = eventRowsToAdminData({
    input,
    channels,
    ...(input.view === "list" && "pagination" in result
      ? { pagination: result.pagination }
      : {}),
    roles: roleChoices,
    rows: result.rows,
    tags: tagItems,
  });
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
        data={data}
        detail={detail}
        input={input}
        tags={tagItems}
      />
    </HydrateClient>
  );
}
