import type { JOB_BOARD } from "@forge/consts";
import type { CareerJobListing } from "@forge/validators";

import type { ParsedLocation } from "./locations";
import { classifyCategory, classifyTrack } from "./classify";
import {
  isForeignLocation,
  parseLocation,
  splitLocationTexts,
  workArrangement,
} from "./locations";
import { cleanApplyUrl, companyKey, identityKeys } from "./normalize";

export type ListingRejection =
  | "invalid_listing"
  | "invalid_apply_url"
  | "not_student_role"
  | "non_us";

export interface PreparedListing {
  externalId: string;
  identityKeys: [string, ...string[]];
  track: JOB_BOARD.JobTrack;
  category: JOB_BOARD.JobCategory;
  companyLabel: string;
  companyKey: string;
  title: string;
  applyUrl: string;
  description: string | null;
  compensation: string | null;
  postedAt: Date | null;
  workArrangement: JOB_BOARD.JobWorkArrangement | null;
  locations: ParsedLocation[];
  sourceUrl: string;
  sourceData: Record<string, unknown>;
}

/** Applies every job rule that needs no database. */
export function prepareListing(
  listing: CareerJobListing,
  source: { provider: string; boardKey: string },
):
  | { ok: true; listing: PreparedListing }
  | { ok: false; reason: ListingRejection } {
  const applyUrl = cleanApplyUrl(listing.applyUrl);
  if (!applyUrl) return { ok: false, reason: "invalid_apply_url" };
  // A label with no ASCII letters or digits leaves no key to group or filter by.
  const key = companyKey(listing.companyLabel);
  if (!key) return { ok: false, reason: "invalid_listing" };

  const track = classifyTrack(listing.title, listing.track);
  if (!track) return { ok: false, reason: "not_student_role" };

  const locationTexts = splitLocationTexts(listing.locationTexts);
  // Mixed lists keep their U.S. entries; only an all-foreign listing is dropped.
  const usTexts = locationTexts.filter((text) => !isForeignLocation(text));
  if (locationTexts.length > 0 && usTexts.length === 0) {
    return { ok: false, reason: "non_us" };
  }

  const description = listing.description?.trim() ?? "";
  const compensation = listing.compensation?.trim() ?? "";
  return {
    ok: true,
    listing: {
      externalId: listing.externalId,
      identityKeys: identityKeys({
        ...source,
        applyUrl,
        externalId: listing.externalId,
      }),
      track,
      category: classifyCategory(listing.title, description),
      companyLabel: listing.companyLabel,
      companyKey: key,
      title: listing.title,
      applyUrl,
      description: description || null,
      compensation: compensation || null,
      postedAt: listing.postedAt ?? null,
      workArrangement: workArrangement(usTexts),
      locations: usTexts.map(parseLocation),
      sourceUrl: listing.sourceUrl,
      sourceData: listing.sourceData,
    },
  };
}
