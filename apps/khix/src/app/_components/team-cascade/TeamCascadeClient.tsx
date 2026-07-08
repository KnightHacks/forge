"use client";

import type { ImageLoaderProps } from "next/image";
import type { CSSProperties, ReactNode, RefObject } from "react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import { motion } from "framer-motion";

import type {
  TeamCascadeGroup,
  TeamCascadeMember,
  TeamCascadeRole,
} from "./team-roster";
import { loadTeamCascadeGroups } from "./team-roster";
import styles from "./TeamCascade.module.css";

type TeamCascadeStatus = "loading" | "ready" | "error";
type TeamCascadeVariant = "blue" | "white";
type TeamCascadeStreamId = "leadership" | "design";

interface TeamCascadePerson {
  member: TeamCascadeMember;
  profileKey: string;
  roleLabel: TeamCascadeRole;
  variant: TeamCascadeVariant;
  laneIndex: number;
}

interface TeamCascadeStream {
  id: TeamCascadeStreamId;
  members: TeamCascadePerson[];
}

type NumberRange = readonly [number, number];
type TeamCascadeItemStyle = CSSProperties & {
  "--fall-delay": string;
  "--fall-duration": string;
  "--fall-static-y": string;
  "--fall-sway": string;
  "--fall-x": string;
};

const profileImageLoader = ({ src }: ImageLoaderProps) => src;
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
const rosterIdPrefixes = [
  "executive-",
  "directors-",
  "hackathon-",
  "design-",
] as const;
const cascadeStreamOrder = [
  "leadership",
  "design",
] as const satisfies readonly TeamCascadeStreamId[];

const cascadeMotion = {
  durationJitterSeconds: 0.04,
  durationSeconds: 14.8,
  rowJitterRatio: 0.4,
  swayRange: [-10, 10],
  xJitterRatio: 0.4,
  xRange: [10, 90],
} as const;

// How falling bubbles are laid out so none of them ever collide: the
// falling area is split into a grid of columns x rows sized from the
// *actual measured* container and avatar dimensions (see
// useCascadeContainerMetrics below). Every bubble gets one grid cell.
// Bubbles that share a column are given their own dedicated slice of the
// animation loop (see getCascadeItemStyle's `phase` calculation), so two
// bubbles never pass through the same column at the same time. If there
// isn't enough room to fit every member this way, avatars are shrunk
// (down to minAvatarScale) until they fit.
const cascadeGridSizing = {
  columnFootprintRatio: 1.15,
  fallbackColumns: 5,
  minAvatarScale: 0.55,
  rowFootprintRatio: 1.6,
  scaleStep: 0.05,
} as const;

// Blue (leadership) and white (design) bubbles cascade in their own
// horizontal band instead of being interleaved, so each color falls as
// its own group. Bands are sized proportionally to how many members are
// in each stream and separated by a fixed gap so the two groups never
// touch.
const cascadeBandGapPercent = 6;

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
  const displayName = getDisplayName(member.name);
  const displayTitle = getDisplayTitle(person);
  const tooltip = (
    <span className={styles.teamAvatarTooltip}>
      <strong>{displayName}</strong>
      <span>{displayTitle}</span>
    </span>
  );

  if (member.linkedinUrl) {
    return (
      <a
        className={styles.teamAvatar}
        href={member.linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${displayName}, ${displayTitle}, on LinkedIn`}
        data-variant={person.variant}
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
      aria-label={`${displayName}, ${displayTitle}`}
      data-variant={person.variant}
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
  isReducedMotion,
  isResumingAfterClick,
  onAvatarPointerUp,
  person,
  numColumns,
  rows,
  xBand,
  streamId,
  onResumeAfterClickEnd,
}: {
  isReducedMotion: boolean;
  isResumingAfterClick?: boolean;
  onAvatarPointerUp?: (profileKey: string) => void;
  person: TeamCascadePerson;
  numColumns: number;
  rows: number;
  xBand: NumberRange;
  streamId: TeamCascadeStreamId;
  onResumeAfterClickEnd?: (profileKey: string) => void;
}) {
  const { profileKey } = person;
  const style = getCascadeItemStyle(
    profileKey,
    person.laneIndex,
    numColumns,
    rows,
    xBand,
    streamId,
  );

  return (
    <div
      className={styles.teamCascadeItem}
      data-resume-after-click={isResumingAfterClick ? true : undefined}
      data-roster-group={person.roleLabel.toLowerCase()}
      data-static={isReducedMotion ? true : undefined}
      onPointerLeave={
        !isReducedMotion && isResumingAfterClick
          ? () => onResumeAfterClickEnd?.(profileKey)
          : undefined
      }
      style={style}
    >
      <TeamAvatar
        person={person}
        onPointerUp={
          !isReducedMotion ? () => onAvatarPointerUp?.(profileKey) : undefined
        }
      />
    </div>
  );
}

function getDisplayTitle({ member, roleLabel }: TeamCascadePerson) {
  if (roleLabel === "Organizer" && member.teamRole !== "Hack Lead") {
    return "Hackathon Organizer";
  }

  if (roleLabel === "Design" && member.teamRole !== "Design Director") {
    return "Design Team";
  }

  return member.teamRole;
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

function getCascadeItemStyle(
  profileKey: string,
  laneIndex: number,
  numColumns: number,
  rows: number,
  xBand: NumberRange,
  streamId: TeamCascadeStreamId,
): TeamCascadeItemStyle {
  const column = laneIndex % numColumns;
  const row = Math.floor(laneIndex / numColumns);

  const duration =
    cascadeMotion.durationSeconds +
    getSeededRange(profileKey, `duration-${streamId}`, [
      -cascadeMotion.durationJitterSeconds,
      cascadeMotion.durationJitterSeconds,
    ]);

  // Every row is a dedicated slice of the animation loop, so bubbles
  // sharing a column (i.e. the same horizontal position) are always
  // offset in time from one another and never occupy that column at the
  // same moment. Jitter is kept small relative to the slot so it can't
  // push a bubble into a neighboring row's time-slot.
  const rowSlot = 1 / rows;
  const phaseJitter = getSeededRange(profileKey, `phase-${streamId}`, [
    -cascadeMotion.rowJitterRatio * rowSlot * 0.5,
    cascadeMotion.rowJitterRatio * rowSlot * 0.5,
  ]);
  const phase = ((((row + 0.5) * rowSlot + phaseJitter) % 1) + 1) % 1;

  const [minX, maxX] = xBand;
  const columnWidth = (maxX - minX) / numColumns;
  const columnCenter = minX + (column + 0.5) * columnWidth;
  const x =
    columnCenter +
    getSeededRange(profileKey, `x-${streamId}`, [
      -cascadeMotion.xJitterRatio * columnWidth * 0.5,
      cascadeMotion.xJitterRatio * columnWidth * 0.5,
    ]);

  // Reduced-motion resting position: spread members down the full height
  // of the box by row, instead of clustering an entire stream at one
  // fixed point (which could itself stack bubbles on top of each other).
  const staticY = 12 + ((row + 0.5) / rows) * 76;

  return {
    "--fall-delay": `${(-duration * phase).toFixed(3)}s`,
    "--fall-duration": `${duration.toFixed(3)}s`,
    "--fall-static-y": `${staticY.toFixed(2)}%`,
    "--fall-sway": `${getSeededRange(
      profileKey,
      `sway-${streamId}`,
      cascadeMotion.swayRange,
    ).toFixed(2)}px`,
    "--fall-x": `${x.toFixed(2)}%`,
  };
}

/**
 * Splits the shared fall x-range into one contiguous band per stream, so
 * blue (leadership) bubbles all fall within their own band and white
 * (design) bubbles fall within theirs -- the two groups never share a
 * column and so never overlap. Band width is proportional to how many
 * members are in each stream, and a fixed gap keeps the bands from
 * touching. A stream with no members is given no band.
 */
function computeStreamBands(
  streamCounts: Record<TeamCascadeStreamId, number>,
  order: readonly TeamCascadeStreamId[],
): Record<TeamCascadeStreamId, NumberRange> {
  const [minX, maxX] = cascadeMotion.xRange;
  const activeStreams = order.filter((id) => streamCounts[id] > 0);
  const gapTotal =
    activeStreams.length > 1
      ? cascadeBandGapPercent * (activeStreams.length - 1)
      : 0;
  const usableWidth = maxX - minX - gapTotal;
  const totalCount =
    activeStreams.reduce((sum, id) => sum + streamCounts[id], 0) || 1;

  const bands = {} as Record<TeamCascadeStreamId, NumberRange>;
  let cursor = minX;

  for (const id of activeStreams) {
    const width = (streamCounts[id] / totalCount) * usableWidth;
    bands[id] = [cursor, cursor + width];
    cursor += width + cascadeBandGapPercent;
  }

  for (const id of order) {
    bands[id] ??= [minX, maxX];
  }

  return bands;
}

interface CascadeStreamLayoutInput {
  id: TeamCascadeStreamId;
  count: number;
  bandWidthPercent: number;
}

interface CascadeStreamLayout {
  numColumns: number;
  rows: number;
}

/**
 * Computes a column/row grid per stream, sized so every member of that
 * stream gets its own cell within its own band (see computeStreamBands),
 * using the real measured container size and avatar size (see
 * useCascadeContainerMetrics). If the box isn't big enough to fit
 * everyone at full avatar size without crowding, avatarScale is stepped
 * down (down to minAvatarScale) -- for both streams at once, so blue and
 * white bubbles stay the same size as each other. Row count is always
 * derived from the measured container height (never from member count),
 * so even in the worst case -- more members than minAvatarScale can fit
 * without crowding -- the grid never schedules more rows than the box
 * has vertical room to space out safely.
 */
function computeCascadeGridLayout(
  containerWidth: number,
  containerHeight: number,
  avatarSize: number,
  streams: CascadeStreamLayoutInput[],
): {
  avatarScale: number;
  layouts: Record<TeamCascadeStreamId, CascadeStreamLayout>;
} {
  if (!containerWidth || !containerHeight || !avatarSize) {
    const layouts = {} as Record<TeamCascadeStreamId, CascadeStreamLayout>;

    for (const stream of streams) {
      const numColumns = Math.max(
        1,
        Math.min(stream.count, cascadeGridSizing.fallbackColumns),
      );
      layouts[stream.id] = {
        numColumns,
        rows: Math.max(1, Math.ceil(stream.count / numColumns)),
      };
    }

    return { avatarScale: 1, layouts };
  }

  function layoutAtScale(avatarScale: number) {
    const avatarPx = avatarSize * avatarScale;
    const layouts = {} as Record<TeamCascadeStreamId, CascadeStreamLayout>;
    let fits = true;

    for (const stream of streams) {
      if (stream.count === 0) {
        layouts[stream.id] = { numColumns: 1, rows: 1 };
        continue;
      }

      const bandWidthPx = containerWidth * (stream.bandWidthPercent / 100);
      const numColumns = Math.max(
        1,
        Math.floor(
          bandWidthPx / (avatarPx * cascadeGridSizing.columnFootprintRatio),
        ),
      );
      // Rows are always capped by how many actually fit in the measured
      // box height -- never by how many the member count "needs". If
      // rows were sized off stream.count instead (as this used to do
      // once avatarScale bottomed out without fitting everyone), a
      // crowded roster could end up with more time-slots than the box
      // has vertical room for, which is exactly what let bubbles sharing
      // a column overlap.
      const rows = Math.max(
        1,
        Math.floor(
          containerHeight / (avatarPx * cascadeGridSizing.rowFootprintRatio),
        ),
      );

      if (numColumns * rows < stream.count) fits = false;

      layouts[stream.id] = { numColumns, rows };
    }

    return { layouts, fits };
  }

  for (
    let avatarScale = 1;
    avatarScale >= cascadeGridSizing.minAvatarScale;
    avatarScale -= cascadeGridSizing.scaleStep
  ) {
    const { layouts, fits } = layoutAtScale(avatarScale);
    if (fits) return { avatarScale, layouts };
  }

  const { layouts } = layoutAtScale(cascadeGridSizing.minAvatarScale);
  return { avatarScale: cascadeGridSizing.minAvatarScale, layouts };
}

/**
 * Tracks the real rendered size of the cascade box and of a single avatar
 * (via a hidden probe element sized with the same --team-avatar-size CSS
 * variable) so the grid layout can be computed from actual pixels instead
 * of guessed values.
 */
function useCascadeContainerMetrics(
  containerRef: RefObject<HTMLDivElement | null>,
  avatarProbeRef: RefObject<HTMLDivElement | null>,
) {
  const [metrics, setMetrics] = useState({
    avatarSize: 0,
    containerHeight: 0,
    containerWidth: 0,
  });

  useEffect(() => {
    const container = containerRef.current;
    const probe = avatarProbeRef.current;

    if (!container || !probe) return;

    const observer = new ResizeObserver((entries) => {
      setMetrics((current) => {
        let { avatarSize, containerHeight, containerWidth } = current;

        for (const entry of entries) {
          const { width, height } = entry.contentRect;

          if (entry.target === container) {
            containerWidth = width;
            containerHeight = height;
          } else if (entry.target === probe) {
            avatarSize = width;
          }
        }

        if (
          avatarSize === current.avatarSize &&
          containerHeight === current.containerHeight &&
          containerWidth === current.containerWidth
        ) {
          return current;
        }

        return { avatarSize, containerHeight, containerWidth };
      });
    });

    observer.observe(container);
    observer.observe(probe);

    return () => observer.disconnect();
  }, [containerRef, avatarProbeRef]);

  return metrics;
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

function getMemberProfileKey(member: TeamCascadeMember) {
  const prefix = rosterIdPrefixes.find((candidate) =>
    member.id.startsWith(candidate),
  );

  return prefix ? member.id.slice(prefix.length) : member.id;
}

function getCascadingStreams(groups: TeamCascadeGroup[]): TeamCascadeStream[] {
  const leadershipByProfileId = new Map<string, TeamCascadePerson>();
  const designMembers: TeamCascadePerson[] = [];
  const organizerProfileIds = new Set(
    groups
      .find((group) => group.roleLabel === "Organizer")
      ?.members.map(getMemberProfileKey) ?? [],
  );

  for (const group of groups) {
    for (const member of group.members) {
      const memberProfileKey = getMemberProfileKey(member);

      if (group.roleLabel === "Design") {
        if (organizerProfileIds.has(memberProfileKey)) continue;

        designMembers.push({
          member,
          profileKey: `design-${memberProfileKey}`,
          roleLabel: group.roleLabel,
          variant: "white",
          laneIndex: designMembers.length,
        });
        continue;
      }

      if (!leadershipByProfileId.has(memberProfileKey)) {
        leadershipByProfileId.set(memberProfileKey, {
          member,
          profileKey: `leadership-${memberProfileKey}`,
          roleLabel: group.roleLabel,
          variant: "blue",
          laneIndex: leadershipByProfileId.size,
        });
      }
    }
  }

  return [
    { id: "leadership", members: [...leadershipByProfileId.values()] },
    { id: "design", members: designMembers },
  ];
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
  const [groups, setGroups] = useState<TeamCascadeGroup[]>([]);
  const [resumeAfterClickProfileKeys, setResumeAfterClickProfileKeys] =
    useState<Set<string>>(() => new Set());
  const [status, setStatus] = useState<TeamCascadeStatus>(
    bladeUrl ? "loading" : "error",
  );
  const prefersReducedMotion = usePrefersReducedMotion();
  const cascadingStreams = useMemo(() => getCascadingStreams(groups), [groups]);
  const cascadingMemberCount = cascadingStreams.reduce(
    (total, stream) => total + stream.members.length,
    0,
  );
  const cascadeClassName = className
    ? `${styles.teamCascade} ${className}`
    : styles.teamCascade;
  const containerRef = useRef<HTMLDivElement>(null);
  const avatarProbeRef = useRef<HTMLDivElement>(null);
  const { avatarSize, containerHeight, containerWidth } =
    useCascadeContainerMetrics(containerRef, avatarProbeRef);
  const streamCounts = useMemo(() => {
    const counts = {} as Record<TeamCascadeStreamId, number>;
    for (const stream of cascadingStreams)
      counts[stream.id] = stream.members.length;
    return counts;
  }, [cascadingStreams]);
  const cascadeBands = useMemo(
    () => computeStreamBands(streamCounts, cascadeStreamOrder),
    [streamCounts],
  );
  const cascadeGridLayout = useMemo(
    () =>
      computeCascadeGridLayout(
        containerWidth,
        containerHeight,
        avatarSize,
        cascadingStreams.map((stream) => ({
          id: stream.id,
          count: stream.members.length,
          bandWidthPercent:
            cascadeBands[stream.id][1] - cascadeBands[stream.id][0],
        })),
      ),
    [
      containerWidth,
      containerHeight,
      avatarSize,
      cascadingStreams,
      cascadeBands,
    ],
  );
  const cascadeContainerStyle = {
    "--team-cascade-avatar-scale": cascadeGridLayout.avatarScale,
  } as CSSProperties;
  function handleAvatarPointerUp(profileKey: string) {
    setResumeAfterClickProfileKeys((currentProfileKeys) => {
      if (currentProfileKeys.has(profileKey)) return currentProfileKeys;

      const nextProfileKeys = new Set(currentProfileKeys);
      nextProfileKeys.add(profileKey);

      return nextProfileKeys;
    });
  }
  function handleResumeAfterClickEnd(profileKey: string) {
    setResumeAfterClickProfileKeys((currentProfileKeys) => {
      if (!currentProfileKeys.has(profileKey)) return currentProfileKeys;

      const nextProfileKeys = new Set(currentProfileKeys);
      nextProfileKeys.delete(profileKey);

      return nextProfileKeys;
    });
  }

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

  let content: ReactNode;

  if (status === "loading") {
    content = (
      <TeamCascadeStatusMessage className={cascadeClassName}>
        Loading public team profiles.
      </TeamCascadeStatusMessage>
    );
  } else if (status === "error") {
    content = (
      <TeamCascadeStatusMessage className={cascadeClassName}>
        Could not load Blade team profiles. Check the configured Blade URL or
        local Blade server.
      </TeamCascadeStatusMessage>
    );
  } else if (cascadingMemberCount === 0) {
    content = (
      <TeamCascadeStatusMessage className={cascadeClassName}>
        No visible team profiles found.
      </TeamCascadeStatusMessage>
    );
  } else {
    content = (
      <div
        ref={containerRef}
        className={cascadeClassName}
        style={cascadeContainerStyle}
      >
        <div
          ref={avatarProbeRef}
          className={styles.teamAvatarProbe}
          aria-hidden="true"
        />
        {cascadingStreams.map((stream) => (
          <div
            key={stream.id}
            className={styles.teamCascadeStream}
            data-stream={stream.id}
          >
            {stream.members.map((person) => (
              <TeamCascadeItem
                key={person.profileKey}
                isReducedMotion={prefersReducedMotion}
                isResumingAfterClick={resumeAfterClickProfileKeys.has(
                  person.profileKey,
                )}
                person={person}
                numColumns={cascadeGridLayout.layouts[stream.id].numColumns}
                rows={cascadeGridLayout.layouts[stream.id].rows}
                xBand={cascadeBands[stream.id]}
                streamId={stream.id}
                onAvatarPointerUp={handleAvatarPointerUp}
                onResumeAfterClickEnd={handleResumeAfterClickEnd}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <motion.h2
        className={styles.teamCascadeTitle}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.45 }}
        transition={{ duration: 0.65, ease: "easeOut" }}
      ></motion.h2>
      {content}
    </>
  );
}
