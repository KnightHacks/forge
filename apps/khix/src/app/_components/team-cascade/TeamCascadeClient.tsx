"use client";

import type { ImageLoaderProps } from "next/image";
import type { CSSProperties, ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";

import type {
  TeamCascadeGroup,
  TeamCascadeMember,
  TeamCascadeRole,
} from "./team-roster";
import { loadTeamCascadeGroups } from "./team-roster";
import styles from "./TeamCascade.module.css";

type TeamCascadeStatus = "loading" | "ready" | "error";

interface ActiveFall {
  id: string;
  person: TeamCascadePerson;
  sway: number;
  x: number;
}

interface TeamCascadePerson {
  member: TeamCascadeMember;
  profileKey: string;
  roleLabel: TeamCascadeRole;
}

type NumberRange = readonly [number, number];
type TeamCascadeItemStyle = CSSProperties & {
  "--fall-static-y": string;
  "--fall-sway": string;
  "--fall-x": string;
};

const profileImageLoader = ({ src }: ImageLoaderProps) => src;
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
const rosterIdPrefixes = ["executive-", "directors-", "hackathon-"] as const;

const cascadeMotion = {
  firstDropDelayMs: 120,
  maxActiveFalls: 14,
  minimumDropGapMs: 2300,
  randomDropJitterMs: 1600,
  reducedMotionMemberCount: 8,
  staticStartPercent: 8,
  staticStepPercent: 12,
  swayRange: [-14, 14],
  xRange: [8, 92],
} as const;

function subscribeToReducedMotion(handleChange: () => void) {
  const mediaQuery = window.matchMedia(reducedMotionQuery);

  mediaQuery.addEventListener("change", handleChange);

  return () => mediaQuery.removeEventListener("change", handleChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(reducedMotionQuery).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ProfileImage({ member }: { member: TeamCascadeMember }) {
  if (member.imageUrl) {
    return (
      <Image
        src={member.imageUrl}
        alt=""
        fill
        loader={profileImageLoader}
        unoptimized
        sizes="(min-width: 920px) 7rem, 5.75rem"
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

function TeamAvatar({
  onPointerUp,
  person,
}: {
  onPointerUp?: () => void;
  person: TeamCascadePerson;
}) {
  const { member } = person;
  const tooltip = (
    <span className={styles.teamAvatarTooltip}>
      <strong>{member.name}</strong>
    </span>
  );

  if (member.linkedinUrl) {
    return (
      <a
        className={styles.teamAvatar}
        href={member.linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${member.name}'s LinkedIn profile`}
        onPointerUp={onPointerUp}
      >
        <span className={styles.teamAvatarMedia}>
          <ProfileImage member={member} />
        </span>
        {tooltip}
      </a>
    );
  }

  return (
    <span
      className={`${styles.teamAvatar} ${styles.teamAvatarStatic}`}
      aria-label={member.name}
      onPointerUp={onPointerUp}
      role="img"
    >
      <span className={styles.teamAvatarMedia}>
        <ProfileImage member={member} />
      </span>
      {tooltip}
    </span>
  );
}

function TeamCascadeItem({
  fall,
  index,
  isResumingAfterClick,
  onAvatarPointerUp,
  person,
  onFallEnd,
  onResumeAfterClickEnd,
}: {
  fall?: ActiveFall;
  index: number;
  isResumingAfterClick?: boolean;
  onAvatarPointerUp?: (id: string) => void;
  person: TeamCascadePerson;
  onFallEnd?: (id: string) => void;
  onResumeAfterClickEnd?: (id: string) => void;
}) {
  const { profileKey } = person;
  const style = getCascadeItemStyle(fall, index, profileKey);

  return (
    <div
      className={styles.teamCascadeItem}
      data-resume-after-click={isResumingAfterClick ? true : undefined}
      data-static={!fall ? true : undefined}
      onAnimationEnd={fall ? () => onFallEnd?.(fall.id) : undefined}
      onPointerLeave={
        fall && isResumingAfterClick
          ? () => onResumeAfterClickEnd?.(fall.id)
          : undefined
      }
      style={style}
    >
      <TeamAvatar
        person={person}
        onPointerUp={fall ? () => onAvatarPointerUp?.(fall.id) : undefined}
      />
    </div>
  );
}

function getCascadeItemStyle(
  fall: ActiveFall | undefined,
  index: number,
  profileKey: string,
): TeamCascadeItemStyle {
  const fallSway = fall?.sway ?? 0;

  return {
    "--fall-static-y": `${getStaticYPercent(index).toFixed(2)}%`,
    "--fall-sway": `${fallSway.toFixed(2)}px`,
    "--fall-x": `${(
      fall?.x ?? getSeededRange(profileKey, "x", cascadeMotion.xRange)
    ).toFixed(2)}%`,
  };
}

function getHashRatio(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

function getSeededRange(
  profileKey: string,
  salt: string,
  [minValue, maxValue]: NumberRange,
) {
  return (
    minValue + getHashRatio(`${profileKey}-${salt}`) * (maxValue - minValue)
  );
}

function getRandomRange([minValue, maxValue]: NumberRange) {
  return minValue + Math.random() * (maxValue - minValue);
}

function getStaticYPercent(index: number) {
  return (
    cascadeMotion.staticStartPercent +
    (index % cascadeMotion.reducedMotionMemberCount) *
      cascadeMotion.staticStepPercent
  );
}

function createActiveFall(person: TeamCascadePerson, id: string): ActiveFall {
  return {
    id,
    person,
    sway: getRandomRange(cascadeMotion.swayRange),
    x: getRandomRange(cascadeMotion.xRange),
  };
}

function getRandomSpawnDelay() {
  return (
    cascadeMotion.minimumDropGapMs +
    Math.random() * cascadeMotion.randomDropJitterMs
  );
}

function getRandomAvailablePerson(
  people: TeamCascadePerson[],
  activeProfileKeys: Set<string>,
) {
  const availablePeople = people.filter(
    (person) => !activeProfileKeys.has(person.profileKey),
  );

  if (availablePeople.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * availablePeople.length);

  return availablePeople[randomIndex] ?? null;
}

function getNextDropDelay(lastDropAt: number) {
  if (lastDropAt === 0) {
    return cascadeMotion.firstDropDelayMs;
  }

  const elapsedSinceLastDrop = performance.now() - lastDropAt;
  return Math.max(
    cascadeMotion.firstDropDelayMs,
    cascadeMotion.minimumDropGapMs - elapsedSinceLastDrop,
  );
}

function getMemberProfileKey(member: TeamCascadeMember) {
  const prefix = rosterIdPrefixes.find((candidate) =>
    member.id.startsWith(candidate),
  );

  return prefix ? member.id.slice(prefix.length) : member.id;
}

function getCascadingMembers(groups: TeamCascadeGroup[]) {
  const peopleByProfileId = new Map<string, TeamCascadePerson>();

  for (const group of groups) {
    for (const member of group.members) {
      const profileKey = getMemberProfileKey(member);

      if (!peopleByProfileId.has(profileKey)) {
        peopleByProfileId.set(profileKey, {
          member,
          profileKey,
          roleLabel: group.roleLabel,
        });
      }
    }
  }

  return Array.from(peopleByProfileId.values());
}

function TeamCascadeStatusMessage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
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
  const activeProfileKeysRef = useRef<Set<string>>(new Set());
  const fallIdRef = useRef(0);
  const lastDropAtRef = useRef(0);
  const [activeFalls, setActiveFalls] = useState<ActiveFall[]>([]);
  const [groups, setGroups] = useState<TeamCascadeGroup[]>([]);
  const [resumeAfterClickFallIds, setResumeAfterClickFallIds] = useState<
    Set<string>
  >(() => new Set());
  const [status, setStatus] = useState<TeamCascadeStatus>(
    bladeUrl ? "loading" : "error",
  );
  const prefersReducedMotion = usePrefersReducedMotion();
  const cascadingMembers = useMemo(() => getCascadingMembers(groups), [groups]);
  const staticMembers = useMemo(
    () => cascadingMembers.slice(0, cascadeMotion.reducedMotionMemberCount),
    [cascadingMembers],
  );
  const cascadeClassName = className
    ? `${styles.teamCascade} ${className}`
    : styles.teamCascade;
  const handleFallEnd = useCallback((id: string) => {
    setActiveFalls((currentFalls) =>
      currentFalls.filter((fall) => fall.id !== id),
    );
    setResumeAfterClickFallIds((currentFallIds) => {
      if (!currentFallIds.has(id)) return currentFallIds;

      const nextFallIds = new Set(currentFallIds);
      nextFallIds.delete(id);

      return nextFallIds;
    });
  }, []);
  const handleAvatarPointerUp = useCallback((id: string) => {
    setResumeAfterClickFallIds((currentFallIds) => {
      if (currentFallIds.has(id)) return currentFallIds;

      const nextFallIds = new Set(currentFallIds);
      nextFallIds.add(id);

      return nextFallIds;
    });
  }, []);
  const handleResumeAfterClickEnd = useCallback((id: string) => {
    setResumeAfterClickFallIds((currentFallIds) => {
      if (!currentFallIds.has(id)) return currentFallIds;

      const nextFallIds = new Set(currentFallIds);
      nextFallIds.delete(id);

      return nextFallIds;
    });
  }, []);

  useEffect(() => {
    activeProfileKeysRef.current = new Set(
      activeFalls.map((fall) => fall.person.profileKey),
    );
  }, [activeFalls]);

  useEffect(() => {
    if (!bladeUrl) {
      return;
    }

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

  useEffect(() => {
    if (prefersReducedMotion || cascadingMembers.length === 0) {
      return;
    }

    let timeoutId: number | undefined;
    let isCancelled = false;

    function spawnFall() {
      if (isCancelled) return;

      const person = getRandomAvailablePerson(
        cascadingMembers,
        activeProfileKeysRef.current,
      );

      if (!person) {
        timeoutId = window.setTimeout(spawnFall, getRandomSpawnDelay());
        return;
      }

      const id = `${person.profileKey}-${fallIdRef.current}`;

      fallIdRef.current += 1;
      lastDropAtRef.current = performance.now();

      setActiveFalls((currentFalls) =>
        [...currentFalls, createActiveFall(person, id)].slice(
          -cascadeMotion.maxActiveFalls,
        ),
      );

      timeoutId = window.setTimeout(spawnFall, getRandomSpawnDelay());
    }

    timeoutId = window.setTimeout(
      spawnFall,
      getNextDropDelay(lastDropAtRef.current),
    );

    return () => {
      isCancelled = true;

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [cascadingMembers, prefersReducedMotion]);

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

  if (cascadingMembers.length === 0) {
    return (
      <TeamCascadeStatusMessage className={cascadeClassName}>
        No visible team profiles found.
      </TeamCascadeStatusMessage>
    );
  }

  return (
    <div className={cascadeClassName}>
      <div className={styles.teamCascadeStream}>
        {prefersReducedMotion
          ? staticMembers.map((person, index) => (
              <TeamCascadeItem
                key={person.profileKey}
                person={person}
                index={index}
              />
            ))
          : activeFalls.map((fall, index) => (
              <TeamCascadeItem
                key={fall.id}
                fall={fall}
                isResumingAfterClick={resumeAfterClickFallIds.has(fall.id)}
                person={fall.person}
                index={index}
                onAvatarPointerUp={handleAvatarPointerUp}
                onFallEnd={handleFallEnd}
                onResumeAfterClickEnd={handleResumeAfterClickEnd}
              />
            ))}
      </div>
    </div>
  );
}
