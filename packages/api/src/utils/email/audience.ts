import { createHash } from "node:crypto";

import type { EmailAudienceDefinition } from "@forge/validators";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type HackerStatus =
  | "accepted"
  | "checkedin"
  | "confirmed"
  | "denied"
  | "pending"
  | "waitlisted"
  | "withdrawn";

interface AudienceMember {
  email: string;
  firstName?: string;
  graduationDate: string;
  id: string;
  mlhConsent?: boolean;
  name: string;
  roleIds?: string[];
  roleNames: string[];
}

interface AudienceHacker {
  email: string;
  firstName?: string;
  hackathonDisplayName?: string;
  hackathonId: string;
  hackathonName?: string;
  id: string;
  name: string;
  status: HackerStatus;
}

interface ProviderState {
  email: string;
  status: "blocklisted" | "enabled" | "unsubscribed";
}

interface UserWithoutMember {
  email?: string | null;
  name?: string | null;
  roleIds?: string[];
  roleNames: string[];
  userId: string;
}

interface AudienceInput {
  currentDate: string;
  definitions: EmailAudienceDefinition[];
  hackers: AudienceHacker[];
  members: AudienceMember[];
  providerStates: ProviderState[];
  teamRoleIds?: string[];
  usersWithoutMember?: UserWithoutMember[];
}

interface Match {
  email: string;
  hacker?: AudienceHacker;
  member?: AudienceMember;
  roleUser?: UserWithoutMember;
  reason: string;
  sourceId: string;
  sourceType: "hacker" | "member" | "user";
}

interface CanonicalRecipient {
  attributes: {
    hacker?: { status: HackerStatus };
    hackathon?: { displayName?: string; name?: string };
    member?: { graduationYear: number };
    recipient: {
      email: string;
      firstName: string;
      name: string;
    };
    team: { roleNames: string[] };
  };
  email: string;
  matchReasons: string[];
  sourceIds: string[];
}

export function normalizeRecipientEmail(value: string): string {
  return value.trim().toLowerCase();
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isDevelopmentReviewAudienceDefinition(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every((definition: unknown) => {
    if (
      typeof definition !== "object" ||
      definition === null ||
      Array.isArray(definition)
    ) {
      return false;
    }
    const record = definition as Record<string, unknown>;
    if (record.kind === "team_members") {
      return Object.keys(record).length === 1;
    }
    return (
      record.kind === "role" &&
      Object.keys(record).length === 2 &&
      typeof record.roleId === "string" &&
      UUID_PATTERN.test(record.roleId)
    );
  });
}

export function applyManualRecipientExclusions<T extends { email: string }>(
  recipients: T[],
  requestedEmails: string[],
) {
  const requested = new Set(requestedEmails.map(normalizeRecipientEmail));
  const excludedEmails = new Set(
    recipients
      .filter(({ email }) => requested.has(normalizeRecipientEmail(email)))
      .map(({ email }) => normalizeRecipientEmail(email)),
  );
  return {
    excludedEmails,
    included: recipients.filter(
      ({ email }) => !excludedEmails.has(normalizeRecipientEmail(email)),
    ),
  };
}

function isCurrentMember(member: AudienceMember, currentDate: string) {
  return member.graduationDate >= currentDate;
}

function selected(
  definitions: EmailAudienceDefinition[],
  kind: EmailAudienceDefinition["kind"],
) {
  return definitions.some((definition) => definition.kind === kind);
}

function memberMatches(input: AudienceInput): Match[] {
  const result: Match[] = [];
  const teamRoles = new Set(input.teamRoleIds ?? []);
  const selectedRoleIds = new Set(
    input.definitions
      .filter(
        (
          definition,
        ): definition is Extract<EmailAudienceDefinition, { kind: "role" }> =>
          definition.kind === "role",
      )
      .map(({ roleId }) => roleId),
  );
  for (const member of input.members) {
    if (
      selected(input.definitions, "current_members") &&
      isCurrentMember(member, input.currentDate)
    ) {
      result.push({
        email: member.email,
        member,
        reason: "current_members",
        sourceId: member.id,
        sourceType: "member",
      });
    }
    if (
      selected(input.definitions, "alumni") &&
      !isCurrentMember(member, input.currentDate)
    ) {
      result.push({
        email: member.email,
        member,
        reason: "alumni",
        sourceId: member.id,
        sourceType: "member",
      });
    }
    if (
      selected(input.definitions, "team_members") &&
      (member.roleIds ?? []).some((roleId) => teamRoles.has(roleId))
    ) {
      result.push({
        email: member.email,
        member,
        reason: "team_members",
        sourceId: member.id,
        sourceType: "member",
      });
    }
    for (const roleId of member.roleIds ?? []) {
      if (!selectedRoleIds.has(roleId)) continue;
      result.push({
        email: member.email,
        member,
        reason: `role:${roleId}`,
        sourceId: member.id,
        sourceType: "member",
      });
    }
  }
  return result;
}

function roleUserMatches(input: AudienceInput): Match[] {
  const selectedRoleIds = new Set(
    input.definitions
      .filter(
        (
          definition,
        ): definition is Extract<EmailAudienceDefinition, { kind: "role" }> =>
          definition.kind === "role",
      )
      .map(({ roleId }) => roleId),
  );
  return (input.usersWithoutMember ?? []).flatMap((roleUser) => {
    const email = roleUser.email;
    if (!email) return [];
    return (roleUser.roleIds ?? [])
      .filter((roleId) => selectedRoleIds.has(roleId))
      .map(
        (roleId): Match => ({
          email,
          reason: `role:${roleId}`,
          roleUser,
          sourceId: roleUser.userId,
          sourceType: "user",
        }),
      );
  });
}

function hackerMatches(input: AudienceInput): Match[] {
  const result: Match[] = [];
  const definitions = input.definitions.filter(
    (
      definition,
    ): definition is Extract<EmailAudienceDefinition, { kind: "hackathon" }> =>
      definition.kind === "hackathon",
  );
  for (const hacker of input.hackers) {
    for (const definition of definitions) {
      if (definition.hackathonId !== hacker.hackathonId) continue;
      if (definition.statuses && !definition.statuses.includes(hacker.status)) {
        continue;
      }
      result.push({
        email: hacker.email,
        hacker,
        reason: `hackathon:${hacker.hackathonId}:${hacker.status}`,
        sourceId: hacker.id,
        sourceType: "hacker",
      });
    }
  }
  return result;
}

function namesConflict(matches: Match[]) {
  return (
    new Set(
      matches
        .map((match) => match.member?.name ?? match.hacker?.name)
        .filter(Boolean),
    ).size > 1
  );
}

function toCanonicalRecipient(
  email: string,
  matches: Match[],
): CanonicalRecipient {
  const sorted = [...matches].sort((a, b) => {
    const sourceOrder =
      Number(b.sourceType === "member") - Number(a.sourceType === "member");
    return sourceOrder || a.sourceId.localeCompare(b.sourceId);
  });
  const member = sorted.find((match) => match.member)?.member;
  const hacker = sorted.find((match) => match.hacker)?.hacker;
  const roleUser = sorted.find((match) => match.roleUser)?.roleUser;
  const name = member?.name ?? hacker?.name ?? roleUser?.name ?? email;
  const firstName =
    member?.firstName ?? hacker?.firstName ?? name.trim().split(/\s+/)[0] ?? "";

  return {
    attributes: {
      hacker: hacker ? { status: hacker.status } : undefined,
      hackathon: hacker
        ? {
            displayName: hacker.hackathonDisplayName,
            name: hacker.hackathonName,
          }
        : undefined,
      member: member
        ? {
            graduationYear: Number(member.graduationDate.slice(0, 4)),
          }
        : undefined,
      recipient: { email, firstName, name },
      team: { roleNames: member?.roleNames ?? roleUser?.roleNames ?? [] },
    },
    email,
    matchReasons: [...new Set(matches.map(({ reason }) => reason))].sort(),
    sourceIds: [...new Set(matches.map(({ sourceId }) => sourceId))].sort(),
  };
}

function checksum(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function buildEmailAudienceSnapshot(input: AudienceInput) {
  const matches = [
    ...memberMatches(input),
    ...hackerMatches(input),
    ...roleUserMatches(input),
  ];
  const grouped = new Map<string, Match[]>();
  let excludedInvalid = 0;
  for (const match of matches) {
    const email = normalizeRecipientEmail(match.email);
    if (!EMAIL_PATTERN.test(email)) {
      excludedInvalid += 1;
      continue;
    }
    const existing = grouped.get(email) ?? [];
    existing.push(match);
    grouped.set(email, existing);
  }

  const providerStates = new Map(
    input.providerStates.map((state) => [
      normalizeRecipientEmail(state.email),
      state.status,
    ]),
  );
  let excludedBlocklisted = 0;
  let excludedUnsubscribed = 0;
  const recipients: CanonicalRecipient[] = [];
  const conflicts: {
    code: "PROFILE_NAME_CONFLICT";
    sourceCount: number;
  }[] = [];
  for (const [email, emailMatches] of [...grouped.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const providerState = providerStates.get(email);
    if (providerState === "blocklisted") {
      excludedBlocklisted += 1;
      continue;
    }
    if (providerState === "unsubscribed") {
      excludedUnsubscribed += 1;
      continue;
    }
    if (namesConflict(emailMatches)) {
      conflicts.push({
        code: "PROFILE_NAME_CONFLICT",
        sourceCount: emailMatches.length,
      });
    }
    recipients.push(toCanonicalRecipient(email, emailMatches));
  }

  const validUniqueMatches = grouped.size;
  const counts = {
    duplicatesCollapsed: Math.max(
      0,
      matches.length - excludedInvalid - validUniqueMatches,
    ),
    excludedBlocklisted,
    excludedInvalid,
    excludedUnsubscribed,
    finalUnique: recipients.length,
    rawMatches: matches.length,
  };
  const warnings =
    selected(input.definitions, "team_members") &&
    (input.usersWithoutMember?.some((user) =>
      (user.roleIds ?? []).some((roleId) =>
        (input.teamRoleIds ?? []).includes(roleId),
      ),
    ) ??
      false)
      ? [
          {
            code: "TEAM_USER_WITHOUT_MEMBER" as const,
            count:
              input.usersWithoutMember?.filter((user) =>
                (user.roleIds ?? []).some((roleId) =>
                  (input.teamRoleIds ?? []).includes(roleId),
                ),
              ).length ?? 0,
          },
        ]
      : [];

  return {
    checksum: checksum({ counts, recipients }),
    conflicts,
    counts,
    recipients,
    warnings,
  };
}
