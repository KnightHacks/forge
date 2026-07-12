"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useMemo, useState } from "react";
import Image from "next/image";
import { FaLinkedin } from "react-icons/fa";

import type {
  TeamCascadeGroup,
  TeamCascadeMember,
  TeamCascadeRole,
} from "./team-roster";
import { loadTeamCascadeGroups } from "./team-roster";
import styles from "./TeamCascade.module.css";

type TeamCascadeStatus = "loading" | "ready" | "error";

interface TeamCascadePerson {
  member: TeamCascadeMember;
  profileKey: string;
  roleLabel: TeamCascadeRole;
}

const longTeamMemberNameLength = 20;
const rosterIdPrefixes = [
  "executive-",
  "directors-",
  "hackathon-",
  "design-",
] as const;

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getDisplayName(name: string) {
  return name
    .trim()
    .replace(
      /(^|[\s'-])(\p{L})/gu,
      (_match, boundary: string, letter: string) =>
        `${boundary}${letter.toLocaleUpperCase()}`,
    );
}

function getDisplayTitle({ member, roleLabel }: TeamCascadePerson) {
  if (roleLabel === "Organizer" && member.teamRole !== "Hack Lead") {
    return "Hackathon Organizer";
  }

  if (roleLabel === "Designer") return "Designer";

  return member.teamRole;
}

function getMemberProfileKey(member: TeamCascadeMember) {
  const prefix = rosterIdPrefixes.find((candidate) =>
    member.id.startsWith(candidate),
  );

  return prefix ? member.id.slice(prefix.length) : member.id;
}

function getTeamMembers(groups: TeamCascadeGroup[]) {
  const membersByProfileId = new Map<string, TeamCascadePerson>();

  for (const group of groups) {
    for (const member of group.members) {
      const memberProfileKey = getMemberProfileKey(member);

      if (!membersByProfileId.has(memberProfileKey)) {
        membersByProfileId.set(memberProfileKey, {
          member,
          profileKey: `team-${memberProfileKey}`,
          roleLabel: group.roleLabel,
        });
      }
    }
  }

  return [...membersByProfileId.values()];
}

function ProfileImage({ member }: { member: TeamCascadeMember }) {
  if (member.imageUrl) {
    return (
      <Image
        src={member.imageUrl}
        alt=""
        fill
        sizes="(min-width: 921px) 6.25rem, (min-width: 761px) 5.25rem, (min-width: 521px) 4.5rem, 3.8rem"
        className={styles.teamAvatarImage}
      />
    );
  }

  return (
    <span className={styles.teamAvatarInitials}>
      {getInitials(member.name)}
    </span>
  );
}

function TeamProfile({
  detailsId,
  index,
  isActive,
  onSelect,
  person,
  total,
}: {
  detailsId: string;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  person: TeamCascadePerson;
  total: number;
}) {
  const displayName = getDisplayName(person.member.name);
  const displayTitle = getDisplayTitle(person);

  return (
    <article className={styles.teamProfile} role="listitem">
      <button
        type="button"
        className={styles.teamAvatar}
        data-active={isActive ? "true" : undefined}
        aria-controls={detailsId}
        aria-label={`Show ${displayName}, ${displayTitle}`}
        aria-pressed={isActive}
        onClick={onSelect}
        onFocus={onSelect}
        onPointerEnter={onSelect}
      >
        <span className={styles.teamAvatarMedia}>
          <ProfileImage member={person.member} />
        </span>
      </button>
      <span className={styles.srOnly}>
        Profile {index + 1} of {total}
      </span>
    </article>
  );
}

function TeamMemberDetails({
  detailsId,
  person,
}: {
  detailsId: string;
  person: TeamCascadePerson;
}) {
  const displayName = getDisplayName(person.member.name);
  const displayTitle = getDisplayTitle(person);

  return (
    <div
      id={detailsId}
      className={styles.teamMemberDetails}
      aria-atomic="true"
      aria-live="polite"
    >
      <div key={person.profileKey} className={styles.teamMemberDetailsContent}>
        <p
          className={styles.teamMemberName}
          data-long-name={
            displayName.length >= longTeamMemberNameLength ? "true" : undefined
          }
        >
          {displayName}
        </p>
        <div className={styles.teamMemberRoleRow}>
          <p className={styles.teamMemberRole}>{displayTitle}</p>
          {person.member.linkedinUrl ? (
            <a
              className={styles.teamLinkedInIconLink}
              href={person.member.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${displayName}'s LinkedIn profile`}
              title="LinkedIn"
            >
              <FaLinkedin aria-hidden="true" size={14} />
            </a>
          ) : null}
        </div>
        {person.member.linkedinUrl ? (
          <a
            className={styles.teamLinkedInLink}
            href={person.member.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${displayName}'s LinkedIn profile`}
          >
            View LinkedIn profile
            <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <span className={styles.teamLinkedInUnavailable}>
            LinkedIn not available
          </span>
        )}
      </div>
    </div>
  );
}

function TeamRoster({ members }: { members: TeamCascadePerson[] }) {
  const detailsId = useId();
  const [selectedProfileKey, setSelectedProfileKey] = useState(
    members[0]?.profileKey ?? "",
  );
  const selectedPerson =
    members.find((person) => person.profileKey === selectedProfileKey) ??
    members[0];

  if (!selectedPerson) return null;

  return (
    <section
      className={styles.teamRosterSection}
      aria-label="Knight Hacks IX team"
    >
      <TeamMemberDetails detailsId={detailsId} person={selectedPerson} />
      <div className={styles.teamRoster} role="list">
        {members.map((person, index) => (
          <TeamProfile
            key={person.profileKey}
            detailsId={detailsId}
            index={index}
            isActive={person.profileKey === selectedPerson.profileKey}
            onSelect={() => setSelectedProfileKey(person.profileKey)}
            person={person}
            total={members.length}
          />
        ))}
      </div>
    </section>
  );
}

function TeamCascadeStatusMessage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const statusClassName = className
    ? `${styles.teamCascadeStatusFrame} ${className}`
    : styles.teamCascadeStatusFrame;

  return (
    <div className={statusClassName}>
      <p className={styles.teamStatus}>{children}</p>
    </div>
  );
}

export function TeamCascadeClient({
  bladeUrl,
  className,
}: {
  bladeUrl: string;
  className?: string;
}) {
  const [groups, setGroups] = useState<TeamCascadeGroup[]>([]);
  const [status, setStatus] = useState<TeamCascadeStatus>(
    bladeUrl ? "loading" : "error",
  );
  const teamMembers = useMemo(() => getTeamMembers(groups), [groups]);
  const cascadeClassName = className
    ? `${styles.teamCascade} ${className}`
    : styles.teamCascade;

  useEffect(() => {
    if (!bladeUrl) return;

    const abortController = new AbortController();

    async function loadRoster() {
      setStatus("loading");

      try {
        setGroups(
          await loadTeamCascadeGroups(bladeUrl, abortController.signal),
        );
        setStatus("ready");
      } catch {
        if (abortController.signal.aborted) return;

        setGroups([]);
        setStatus("error");
      }
    }

    void loadRoster();

    return () => abortController.abort();
  }, [bladeUrl]);

  if (status === "loading") {
    return (
      <TeamCascadeStatusMessage className={cascadeClassName}>
        Loading public team profiles.
      </TeamCascadeStatusMessage>
    );
  }

  if (status === "error") {
    return (
      <TeamCascadeStatusMessage className={cascadeClassName}>
        Could not load Blade team profiles. Check the configured Blade URL or
        local Blade server.
      </TeamCascadeStatusMessage>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <TeamCascadeStatusMessage className={cascadeClassName}>
        No visible team profiles found.
      </TeamCascadeStatusMessage>
    );
  }

  return (
    <div className={cascadeClassName}>
      <TeamRoster members={teamMembers} />
    </div>
  );
}
