import { randomUUID } from "node:crypto";

import { FORMS, GUILD } from "@forge/consts";
import { guildListProfilesInputSchema } from "@forge/validators";

import { GuildDirectory } from "~/app/_components/guild-directory";
import { api } from "~/trpc/server";

type SearchParams = Record<string, string | string[] | undefined>;

function values(params: SearchParams, key: string) {
  const value = params[key];
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).filter(Boolean);
}

function unique<Value>(items: readonly Value[]) {
  return [...new Set(items)];
}

export default async function GuildPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const seed = randomUUID();
  const memberStatuses = unique(
    values(params, "status").filter(
      (status): status is GUILD.GuildTag =>
        status === "current" || status === "alumni",
    ),
  );
  const graduationYears = unique(
    values(params, "year")
      .map(Number)
      .filter((year) => Number.isInteger(year) && year >= 1900 && year <= 2100),
  );
  const memberSinceYears = unique(
    values(params, "joined")
      .map(Number)
      .filter((year) => Number.isInteger(year) && year >= 1900 && year <= 2100),
  );
  const resumeParam = values(params, "resume")[0];
  const teamParam = values(params, "team")[0];
  const query = values(params, "q")[0]?.trim().slice(0, 80);
  const listInput = guildListProfilesInputSchema.parse({
    seed,
    query: query && query.length > 0 ? query : undefined,
    memberStatuses,
    graduationYears,
    memberSinceYears,
    schools: unique(
      values(params, "school").filter(
        (school): school is (typeof FORMS.SCHOOLS)[number] =>
          FORMS.SCHOOLS.includes(school as (typeof FORMS.SCHOOLS)[number]),
      ),
    ),
    majors: unique(
      values(params, "major").filter((major): major is FORMS.Major =>
        FORMS.MAJORS.includes(major as FORMS.Major),
      ),
    ),
    opportunityStatuses: unique(
      values(params, "opportunity").filter(
        (status): status is GUILD.GuildOpportunityStatus =>
          GUILD.GUILD_OPPORTUNITY_STATUS_OPTIONS.includes(
            status as GUILD.GuildOpportunityStatus,
          ),
      ),
    ),
    resumeAvailable:
      resumeParam === "yes" ? true : resumeParam === "no" ? false : undefined,
    teamMembersOnly: teamParam === "yes",
  });
  const { cursor: _cursor, limit: _limit, seed: _seed, ...filters } = listInput;

  const [initialPage, filterOptions] = await Promise.all([
    api.guild.listProfiles(listInput),
    api.guild.getFilterOptions(),
  ]);

  return (
    <GuildDirectory
      key={seed}
      filterOptions={filterOptions}
      initialFilters={filters}
      initialPage={initialPage}
      seed={seed}
    />
  );
}
