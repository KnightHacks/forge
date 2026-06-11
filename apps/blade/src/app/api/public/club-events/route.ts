import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { and, asc, eq, gt, isNull } from "@forge/db";
import { db } from "@forge/db/client";
import { Event } from "@forge/db/schemas/knight-hacks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

interface PublicClubEvent {
  id: string;
  name: string;
  tag: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  location: string;
}

const DEFAULT_EVENT_LIMIT = 24;
const MAX_EVENT_LIMIT = 60;

function getEventLimit(request: NextRequest) {
  const requestedLimit = Number.parseInt(
    request.nextUrl.searchParams.get("limit") ?? "",
    10,
  );

  if (!Number.isFinite(requestedLimit)) return DEFAULT_EVENT_LIMIT;

  return Math.min(Math.max(requestedLimit, 1), MAX_EVENT_LIMIT);
}

async function getUpcomingClubEvents(
  limit: number,
): Promise<PublicClubEvent[]> {
  const rows = await db
    .select({
      id: Event.id,
      name: Event.name,
      tag: Event.tag,
      description: Event.description,
      startDateTime: Event.start_datetime,
      endDateTime: Event.end_datetime,
      location: Event.location,
    })
    .from(Event)
    .where(
      and(
        gt(Event.start_datetime, new Date()),
        eq(Event.isOperationsCalendar, false),
        isNull(Event.hackathonId),
      ),
    )
    .orderBy(asc(Event.start_datetime))
    .limit(limit);

  return rows.map((event) => ({
    ...event,
    startDateTime: event.startDateTime.toISOString(),
    endDateTime: event.endDateTime.toISOString(),
  }));
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(request: NextRequest) {
  try {
    const events = await getUpcomingClubEvents(getEventLimit(request));

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        events,
      },
      {
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        error: "Failed to load club events.",
        events: [],
      },
      {
        status: 500,
        headers: CORS_HEADERS,
      },
    );
  }
}
