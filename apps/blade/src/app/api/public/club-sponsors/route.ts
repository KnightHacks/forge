import { NextResponse } from "next/server";

import { asc, desc, eq } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Hackathon,
  HackathonSponsor,
  Sponsor,
} from "@forge/db/schemas/knight-hacks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const SPONSOR_TIER_ORDER = ["gold", "silver", "bronze", "other"] as const;

type PublicSponsorTier = (typeof SPONSOR_TIER_ORDER)[number];

interface PublicClubSponsor {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl: string;
  tier: PublicSponsorTier;
}

interface PublicSponsorHackathon {
  id: string;
  name: string;
  displayName: string;
  startDate: string;
}

function getTierRank(tier: PublicSponsorTier) {
  return SPONSOR_TIER_ORDER.indexOf(tier);
}

async function getLatestHackathonWithSponsors(): Promise<{
  hackathon: PublicSponsorHackathon | null;
  sponsors: PublicClubSponsor[];
}> {
  const rows = await db
    .select({
      hackathonId: Hackathon.id,
      hackathonName: Hackathon.name,
      hackathonDisplayName: Hackathon.displayName,
      hackathonStartDate: Hackathon.startDate,
      sponsorId: Sponsor.id,
      sponsorName: Sponsor.name,
      logoUrl: Sponsor.logoUrl,
      websiteUrl: Sponsor.websiteUrl,
      tier: HackathonSponsor.tier,
    })
    .from(HackathonSponsor)
    .innerJoin(Hackathon, eq(HackathonSponsor.hackathonId, Hackathon.id))
    .innerJoin(Sponsor, eq(HackathonSponsor.sponsorId, Sponsor.id))
    .orderBy(desc(Hackathon.startDate), asc(Sponsor.name));

  const latestHackathonId = rows[0]?.hackathonId;

  if (!latestHackathonId) {
    return {
      hackathon: null,
      sponsors: [],
    };
  }

  const sponsors = rows
    .filter((row) => row.hackathonId === latestHackathonId)
    .map((row) => ({
      id: row.sponsorId,
      name: row.sponsorName,
      logoUrl: row.logoUrl,
      websiteUrl: row.websiteUrl,
      tier: row.tier,
    }))
    .sort((first, second) => {
      const tierSort = getTierRank(first.tier) - getTierRank(second.tier);

      if (tierSort !== 0) return tierSort;

      return first.name.localeCompare(second.name);
    });

  const firstRow = rows.find((row) => row.hackathonId === latestHackathonId);

  return {
    hackathon: firstRow
      ? {
          id: firstRow.hackathonId,
          name: firstRow.hackathonName,
          displayName: firstRow.hackathonDisplayName,
          startDate: firstRow.hackathonStartDate.toISOString(),
        }
      : null,
    sponsors,
  };
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET() {
  try {
    const { hackathon, sponsors } = await getLatestHackathonWithSponsors();

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        hackathon,
        sponsors,
      },
      {
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        error: "Failed to load club sponsors.",
        hackathon: null,
        sponsors: [],
      },
      {
        status: 500,
        headers: CORS_HEADERS,
      },
    );
  }
}
