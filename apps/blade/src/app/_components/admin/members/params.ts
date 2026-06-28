import type { AdminMemberListInput } from "@forge/validators";
import { adminMemberIdSchema, adminMemberListSchema } from "@forge/validators";

export type AdminMemberSearchParams = Record<
  string,
  string | string[] | undefined
>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function list(value: string | string[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function numberList(value: string | string[] | undefined) {
  return list(value)
    .map(Number)
    .filter((item) => Number.isInteger(item));
}

export function parseAdminMemberSearchParams(params: AdminMemberSearchParams) {
  const raw = {
    companies: list(params.company),
    duesStatuses: list(params.dues),
    genders: list(params.gender),
    graduationYears: numberList(params.gradYear),
    guildVisibilities: list(params.visibility),
    joinedFrom: first(params.joinedFrom),
    joinedTo: first(params.joinedTo),
    levelsOfStudy: list(params.level),
    majors: list(params.major),
    page: Number(first(params.page) ?? 1),
    pageSize: Number(first(params.pageSize) ?? 25),
    query: first(params.q) ?? "",
    racesOrEthnicities: list(params.race),
    schools: list(params.school),
    sortDirection: first(params.direction) ?? "desc",
    sortField: first(params.sort) ?? "joined",
  };
  const parsed = adminMemberListSchema.safeParse(raw);
  const selectedMember = adminMemberIdSchema.safeParse({
    memberId: first(params.member),
  });

  return {
    input: parsed.success ? parsed.data : adminMemberListSchema.parse({}),
    selectedMemberId: selectedMember.success
      ? selectedMember.data.memberId
      : null,
  };
}

export function buildAdminMemberSearchParams(
  input: AdminMemberListInput,
  selectedMemberId?: string | null,
) {
  const params = new URLSearchParams();
  if (input.query) params.set("q", input.query);
  if (input.page !== 1) params.set("page", String(input.page));
  if (input.pageSize !== 25) params.set("pageSize", String(input.pageSize));
  if (input.sortField !== "joined") params.set("sort", input.sortField);
  if (input.sortDirection !== "desc") {
    params.set("direction", input.sortDirection);
  }

  const append = (key: string, values: readonly (number | string)[]) => {
    for (const value of values) params.append(key, String(value));
  };
  append("dues", input.duesStatuses);
  append("school", input.schools);
  append("major", input.majors);
  append("level", input.levelsOfStudy);
  append("gradYear", input.graduationYears);
  append("company", input.companies);
  append("visibility", input.guildVisibilities);
  append("gender", input.genders);
  append("race", input.racesOrEthnicities);
  if (input.joinedFrom) params.set("joinedFrom", input.joinedFrom);
  if (input.joinedTo) params.set("joinedTo", input.joinedTo);
  if (selectedMemberId) params.set("member", selectedMemberId);

  return params;
}
