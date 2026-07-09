"use client";

import type { MotionValue } from "framer-motion";
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
import { motion, useScroll, useTransform } from "framer-motion";

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
const cascadeStreamLabels = {
  design: "Designers",
  leadership: "Hackathon Organizers",
} as const satisfies Record<TeamCascadeStreamId, string>;

const cascadeMotion = {
  durationJitterSeconds: 0.36,
  durationSeconds: 14.8,
  parallaxRotateRange: [-2.4, 2.4],
  parallaxXRange: [-7, 7],
  parallaxYRange: [18, -18],
  columnPhaseJitterRatio: 0.22,
  swayRange: [-3, 3],
  xJitterRatio: 0.06,
  xRange: [7, 93],
} as const;

// How falling bubbles are laid out so none of them ever collide: each
// avatar is treated as a circle with a reserved collision radius around
// it. The measured cascade box is split into safe columns and time rows,
// and a bubble only gets scheduled when its center can stay at least one
// collision diameter away from its neighbors. Bubbles sharing a column
// also share a duration and horizontal sway, so their spacing never drifts
// over time.
const cascadeGridSizing = {
  columnFootprintRatio: 1.55,
  fallbackColumns: 5,
  minAvatarScale: 0.42,
  rowFootprintRatio: 1.45,
  scaleStep: 0.05,
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
        data-clickable="true"
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
  scrollProgress,
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
  scrollProgress: MotionValue<number>;
  onResumeAfterClickEnd?: (profileKey: string) => void;
}) {
  const { profileKey } = person;
  const [frozenParallax, setFrozenParallax] = useState<{
    rotate: number;
    x: number;
    y: number;
  } | null>(null);
  const column = person.laneIndex % numColumns;
  const columnKey = `${streamId}-column-${column}`;
  const parallaxDepth = isReducedMotion
    ? 0
    : getSeededRange(columnKey, "parallax-depth", [0.45, 1]);
  const parallaxDirection =
    getHashRatio(`${columnKey}-parallax-direction`) > 0.5 ? 1 : -1;
  const parallaxX = useTransform(
    scrollProgress,
    [0, 1],
    [
      cascadeMotion.parallaxXRange[0] * parallaxDepth * parallaxDirection,
      cascadeMotion.parallaxXRange[1] * parallaxDepth * parallaxDirection,
    ],
  );
  const parallaxY = useTransform(
    scrollProgress,
    [0, 1],
    [
      cascadeMotion.parallaxYRange[0] * parallaxDepth,
      cascadeMotion.parallaxYRange[1] * parallaxDepth,
    ],
  );
  const parallaxRotate = useTransform(
    scrollProgress,
    [0, 1],
    [
      cascadeMotion.parallaxRotateRange[0] * parallaxDepth * parallaxDirection,
      cascadeMotion.parallaxRotateRange[1] * parallaxDepth * parallaxDirection,
    ],
  );
  const style = getCascadeItemStyle(
    person.laneIndex,
    numColumns,
    rows,
    xBand,
    streamId,
  );
  function handlePointerEnter() {
    if (isReducedMotion) return;

    setFrozenParallax({
      rotate: parallaxRotate.get(),
      x: parallaxX.get(),
      y: parallaxY.get(),
    });
  }
  function handlePointerLeave() {
    if (!isReducedMotion) setFrozenParallax(null);
    if (!isReducedMotion && isResumingAfterClick) {
      onResumeAfterClickEnd?.(profileKey);
    }
  }

  return (
    <div
      className={styles.teamCascadeItemAnchor}
      data-roster-group={person.roleLabel.toLowerCase()}
      data-static={isReducedMotion ? true : undefined}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      style={style}
    >
      <motion.div
        className={styles.teamCascadeParallaxItem}
        style={{
          x: frozenParallax?.x ?? parallaxX,
          y: frozenParallax?.y ?? parallaxY,
        }}
      >
        <div
          className={styles.teamCascadeItem}
          data-resume-after-click={isResumingAfterClick ? true : undefined}
        >
          <motion.div
            className={styles.teamAvatarMotion}
            style={{ rotate: frozenParallax?.rotate ?? parallaxRotate }}
          >
            <TeamAvatar
              person={person}
              onPointerUp={
                !isReducedMotion
                  ? () => onAvatarPointerUp?.(profileKey)
                  : undefined
              }
            />
          </motion.div>
        </div>
      </motion.div>
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
  laneIndex: number,
  numColumns: number,
  rows: number,
  xBand: NumberRange,
  streamId: TeamCascadeStreamId,
): TeamCascadeItemStyle {
  const column = laneIndex % numColumns;
  const row = Math.floor(laneIndex / numColumns);
  const columnKey = `${streamId}-column-${column}`;

  const duration =
    cascadeMotion.durationSeconds +
    getSeededRange(columnKey, "duration", [
      -cascadeMotion.durationJitterSeconds,
      cascadeMotion.durationJitterSeconds,
    ]);

  // Every row is a dedicated slice of the animation loop. The slight
  // phase offset is applied per-column (not per-bubble), so bubbles in
  // the same column keep their exact row-to-row spacing while neighboring
  // columns avoid looking like rigid rows.
  const rowSlot = 1 / rows;
  const columnPhaseJitter =
    getSeededRange(columnKey, "phase", [
      -cascadeMotion.columnPhaseJitterRatio,
      cascadeMotion.columnPhaseJitterRatio,
    ]) * rowSlot;
  const phase = ((((row + 0.5) * rowSlot + columnPhaseJitter) % 1) + 1) % 1;

  const [minX, maxX] = xBand;
  const columnWidth = (maxX - minX) / numColumns;
  const columnCenter = minX + (column + 0.5) * columnWidth;
  const x =
    columnCenter +
    getSeededRange(columnKey, "x", [
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
      columnKey,
      "sway",
      cascadeMotion.swayRange,
    ).toFixed(2)}px`,
    "--fall-x": `${x.toFixed(2)}%`,
  };
}

interface CascadeStreamLayout {
  numColumns: number;
  rows: number;
}

/**
 * Computes a column/row grid per stream, sized so every member gets its
 * own collision-safe cell inside that stream's band. Rows represent the
 * number of time slices actually needed for the roster, while maxRows is
 * the number that can fit in the measured height without violating the
 * collision radius. If full-size bubbles cannot satisfy that constraint
 * inside this stream section, avatarScale is stepped down for the section.
 */
function computeCascadeGridLayout(
  containerWidth: number,
  containerHeight: number,
  avatarSize: number,
  memberCount: number,
): {
  avatarScale: number;
  layout: CascadeStreamLayout;
} {
  if (memberCount === 0) {
    return { avatarScale: 1, layout: { numColumns: 1, rows: 1 } };
  }

  if (!containerWidth || !containerHeight || !avatarSize) {
    const numColumns = Math.max(
      1,
      Math.min(memberCount, cascadeGridSizing.fallbackColumns),
    );

    return {
      avatarScale: 1,
      layout: {
        numColumns,
        rows: Math.max(1, Math.ceil(memberCount / numColumns)),
      },
    };
  }

  function layoutAtScale(avatarScale: number) {
    const avatarPx = avatarSize * avatarScale;
    const xRangeWidth = cascadeMotion.xRange[1] - cascadeMotion.xRange[0];
    const bandWidthPx = containerWidth * (xRangeWidth / 100);
    const numColumns = Math.max(
      1,
      Math.floor(
        bandWidthPx / (avatarPx * cascadeGridSizing.columnFootprintRatio),
      ),
    );
    const rows = Math.max(1, Math.ceil(memberCount / numColumns));
    const maxRows = Math.max(
      1,
      Math.floor(
        containerHeight / (avatarPx * cascadeGridSizing.rowFootprintRatio),
      ),
    );

    return {
      fits: rows <= maxRows,
      layout: { numColumns, rows },
    };
  }

  function getScaledLayout(avatarScale: number) {
    return {
      avatarScale,
      layout: layoutAtScale(avatarScale).layout,
    };
  }

  for (
    let avatarScale = 1;
    avatarScale >= cascadeGridSizing.minAvatarScale;
    avatarScale -= cascadeGridSizing.scaleStep
  ) {
    const { fits, layout } = layoutAtScale(avatarScale);
    if (fits) return { avatarScale, layout };
  }

  return getScaledLayout(cascadeGridSizing.minAvatarScale);
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

    const observedContainer = container;
    const observedProbe = probe;

    function updateMetrics() {
      const containerRect = observedContainer.getBoundingClientRect();
      const probeRect = observedProbe.getBoundingClientRect();

      setMetrics((current) => {
        const avatarSize = probeRect.width;
        const containerHeight = containerRect.height;
        const containerWidth = containerRect.width;

        if (
          avatarSize === current.avatarSize &&
          containerHeight === current.containerHeight &&
          containerWidth === current.containerWidth
        ) {
          return current;
        }

        return { avatarSize, containerHeight, containerWidth };
      });
    }

    updateMetrics();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateMetrics);

      return () => window.removeEventListener("resize", updateMetrics);
    }

    const observer = new ResizeObserver(updateMetrics);

    observer.observe(observedContainer);
    observer.observe(observedProbe);
    window.addEventListener("resize", updateMetrics);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateMetrics);
    };
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
  const statusClassName = className
    ? `${styles.teamCascadeStatusFrame} ${className}`
    : styles.teamCascadeStatusFrame;

  return (
    <div className={statusClassName}>
      <p className={styles.teamStatus}>{children}</p>
    </div>
  );
}

function TeamCascadeStreamSection({
  isReducedMotion,
  onAvatarPointerUp,
  onResumeAfterClickEnd,
  resumeAfterClickProfileKeys,
  stream,
}: {
  isReducedMotion: boolean;
  onAvatarPointerUp: (profileKey: string) => void;
  onResumeAfterClickEnd: (profileKey: string) => void;
  resumeAfterClickProfileKeys: Set<string>;
  stream: TeamCascadeStream;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const avatarProbeRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    offset: ["start end", "end start"],
    target: viewportRef,
  });
  const { avatarSize, containerHeight, containerWidth } =
    useCascadeContainerMetrics(viewportRef, avatarProbeRef);
  const cascadeGridLayout = useMemo(
    () =>
      computeCascadeGridLayout(
        containerWidth,
        containerHeight,
        avatarSize,
        stream.members.length,
      ),
    [avatarSize, containerHeight, containerWidth, stream.members.length],
  );
  const sectionTitleId = `team-cascade-${stream.id}-title`;
  const viewportStyle = {
    "--team-cascade-avatar-scale": cascadeGridLayout.avatarScale,
  } as CSSProperties;

  return (
    <motion.section
      className={styles.teamCascadeSection}
      aria-labelledby={sectionTitleId}
      initial={isReducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={isReducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.65, ease: "easeOut" }}
    >
      <h3 id={sectionTitleId} className={styles.teamCascadeSectionTitle}>
        {cascadeStreamLabels[stream.id]}
      </h3>
      <div
        ref={viewportRef}
        className={styles.teamCascadeViewport}
        data-stream={stream.id}
        style={viewportStyle}
      >
        <div
          ref={avatarProbeRef}
          className={styles.teamAvatarProbe}
          aria-hidden="true"
        />
        {stream.members.length === 0 ? (
          <p className={styles.teamStreamEmpty}>No visible profiles found.</p>
        ) : (
          <div className={styles.teamCascadeStream}>
            {stream.members.map((person) => (
              <TeamCascadeItem
                key={person.profileKey}
                isReducedMotion={isReducedMotion}
                isResumingAfterClick={resumeAfterClickProfileKeys.has(
                  person.profileKey,
                )}
                person={person}
                numColumns={cascadeGridLayout.layout.numColumns}
                rows={cascadeGridLayout.layout.rows}
                xBand={cascadeMotion.xRange}
                streamId={stream.id}
                scrollProgress={scrollYProgress}
                onAvatarPointerUp={onAvatarPointerUp}
                onResumeAfterClickEnd={onResumeAfterClickEnd}
              />
            ))}
          </div>
        )}
      </div>
    </motion.section>
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
      <div className={cascadeClassName}>
        {cascadeStreamOrder.map((streamId) => {
          const stream = cascadingStreams.find(({ id }) => id === streamId);

          if (!stream) return null;

          return (
            <TeamCascadeStreamSection
              key={stream.id}
              isReducedMotion={prefersReducedMotion}
              resumeAfterClickProfileKeys={resumeAfterClickProfileKeys}
              stream={stream}
              onAvatarPointerUp={handleAvatarPointerUp}
              onResumeAfterClickEnd={handleResumeAfterClickEnd}
            />
          );
        })}
      </div>
    );
  }

  return content;
}
