import type { EmailAudienceDefinition } from "@forge/validators";

/**
 * Development review campaigns may only start from the team roster, so the
 * seed selection differs from a normal campaign.
 */
export function defaultAudienceKey(developmentReviewCampaign: boolean) {
  return developmentReviewCampaign ? "team_members" : "current_members";
}

/**
 * Audience keys a restored compose draft may keep. Development review mode
 * drops everything except the team preset and explicit roles, and an empty
 * result falls back to the default selection.
 */
export function restoreDraftAudiences(
  selectedAudiences: readonly string[],
  developmentReviewCampaign: boolean,
) {
  const restored = developmentReviewCampaign
    ? selectedAudiences.filter(
        (key) => key === "team_members" || key.startsWith("role:"),
      )
    : selectedAudiences;
  return restored.length > 0
    ? restored
    : [defaultAudienceKey(developmentReviewCampaign)];
}

/**
 * Adding a hackathon's "all" key clears its per-status keys, and adding a
 * per-status key clears that hackathon's "all" key.
 */
export function toggleAudienceSelection(
  current: ReadonlySet<string>,
  key: string,
) {
  const next = new Set(current);
  if (next.has(key)) next.delete(key);
  else {
    if (key.endsWith(":all")) {
      const prefix = key.slice(0, -3);
      for (const value of next) {
        if (value.startsWith(prefix)) next.delete(value);
      }
    } else if (key.startsWith("hack:")) {
      const [, hackathonId] = key.split(":");
      next.delete(`hack:${hackathonId}:all`);
    }
    next.add(key);
  }
  return next;
}

export function audienceDefinitions(
  selected: ReadonlySet<string>,
): EmailAudienceDefinition[] {
  const result: EmailAudienceDefinition[] = [];
  for (const key of selected) {
    if (
      key === "current_members" ||
      key === "alumni" ||
      key === "team_members"
    ) {
      result.push({ kind: key });
      continue;
    }
    if (key.startsWith("role:")) {
      const roleId = key.slice("role:".length);
      if (roleId) result.push({ kind: "role", roleId });
      continue;
    }
    const [, hackathonId, status] = key.split(":");
    if (!hackathonId) continue;
    const existing = result.find(
      (item): item is Extract<EmailAudienceDefinition, { kind: "hackathon" }> =>
        item.kind === "hackathon" && item.hackathonId === hackathonId,
    );
    if (status === "all") {
      if (existing) existing.statuses = undefined;
      else result.push({ hackathonId, kind: "hackathon" });
      continue;
    }
    if (existing?.statuses) {
      existing.statuses.push(
        status as NonNullable<typeof existing.statuses>[number],
      );
    } else if (!existing) {
      result.push({
        hackathonId,
        kind: "hackathon",
        statuses: [
          status as NonNullable<
            Extract<EmailAudienceDefinition, { kind: "hackathon" }>["statuses"]
          >[number],
        ],
      });
    }
  }
  return result;
}
