"use client";

import type { MotionValue } from "framer-motion";
import type { ImageLoaderProps } from "next/image";
import type {
  AnimationEvent,
  CSSProperties,
  ReactNode,
  RefObject,
} from "react";
import {
  useEffect,
  useId,
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

interface TeamCascadePerson {
  member: TeamCascadeMember;
  profileKey: string;
  roleLabel: TeamCascadeRole;
}

type NumberRange = readonly [number, number];
type TeamCascadeRunnerStyle = CSSProperties & {
  "--focus-y": string;
  "--fall-delay": string;
  "--fall-duration": string;
  "--fall-sway": string;
  "--fall-x": string;
};

const profileImageLoader = ({ src }: ImageLoaderProps) => src;
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
const rosterIdPrefixes = ["executive-", "directors-", "hackathon-"] as const;
const cascadeStreamId = "leadership";
const cascadeStreamLabel = "Hackathon Organizers";
const runnersPerDropGroup = 2;
const visibleDropGroupCount = 3;
const maximumRunnerCount = runnersPerDropGroup * visibleDropGroupCount;

const cascadeMotion = {
  durationSeconds: 7.2,
  fallOffscreenTravelRem: 21.5,
  groupPhaseStep: 1 / visibleDropGroupCount,
  pairPhase: 0.055,
  pairPhaseStep: 0.022,
  focusYRange: [24, 62],
  parallaxRotateRange: [-2.4, 2.4],
  parallaxXRange: [-7, 7],
  parallaxYRange: [18, -18],
  runnerSwayRange: [-3, 3],
  runnerXBands: [
    [12, 47],
    [53, 88],
  ],
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

function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
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

  return member.teamRole;
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

function getCascadingMembers(groups: TeamCascadeGroup[]) {
  const leadershipByProfileId = new Map<string, TeamCascadePerson>();

  for (const group of groups) {
    for (const member of group.members) {
      const memberProfileKey = getMemberProfileKey(member);

      if (!leadershipByProfileId.has(memberProfileKey)) {
        leadershipByProfileId.set(memberProfileKey, {
          member,
          profileKey: `leadership-${memberProfileKey}`,
          roleLabel: group.roleLabel,
        });
      }
    }
  }

  return [...leadershipByProfileId.values()];
}

function getRunnerDuration(containerHeight: number, rootFontSize: number) {
  if (containerHeight <= 0 || rootFontSize <= 0) {
    return cascadeMotion.durationSeconds;
  }

  const offscreenTravel = cascadeMotion.fallOffscreenTravelRem * rootFontSize;
  const previousTravel = containerHeight * 0.44 + offscreenTravel;
  const durationScale = (containerHeight + offscreenTravel) / previousTravel;

  return cascadeMotion.durationSeconds * durationScale;
}

function getRunnerStyle(
  profileKey: string,
  runnerIndex: number,
  runnerCount: number,
  duration: number,
): TeamCascadeRunnerStyle {
  const groupIndex = Math.floor(runnerIndex / runnersPerDropGroup);
  const groupCount = Math.ceil(runnerCount / runnersPerDropGroup);
  const laneIndex = runnerIndex % runnersPerDropGroup;
  const xBand =
    cascadeMotion.runnerXBands[laneIndex] ?? cascadeMotion.runnerXBands[0];
  const x =
    runnerCount === 1
      ? 50
      : getSeededRange(profileKey, `runner-${runnerIndex}-x`, xBand);
  const sway = getSeededRange(
    profileKey,
    `runner-${runnerIndex}-sway`,
    cascadeMotion.runnerSwayRange,
  );
  const phase =
    cascadeMotion.pairPhase +
    groupIndex * cascadeMotion.groupPhaseStep +
    laneIndex * cascadeMotion.pairPhaseStep;
  const focusY =
    groupCount <= 1
      ? 38
      : cascadeMotion.focusYRange[0] +
        (groupIndex / (groupCount - 1)) *
          (cascadeMotion.focusYRange[1] - cascadeMotion.focusYRange[0]);

  return {
    "--focus-y": `${focusY.toFixed(2)}%`,
    "--fall-delay": `${(-duration * phase).toFixed(3)}s`,
    "--fall-duration": `${duration.toFixed(3)}s`,
    "--fall-sway": `${sway.toFixed(2)}px`,
    "--fall-x": `${x.toFixed(2)}%`,
  };
}

function TeamCascadeRunner({
  duration,
  memberIndex,
  onAnimationIteration,
  onPointerEnter,
  onPointerUp,
  person,
  runnerCount,
  runnerIndex,
  scrollProgress,
  total,
}: {
  duration: number;
  memberIndex: number;
  onAnimationIteration: (runnerIndex: number) => void;
  onPointerEnter: () => void;
  onPointerUp: () => void;
  person: TeamCascadePerson;
  runnerCount: number;
  runnerIndex: number;
  scrollProgress: MotionValue<number>;
  total: number;
}) {
  const [frozenParallax, setFrozenParallax] = useState<{
    rotate: number;
    x: number;
    y: number;
  } | null>(null);
  const runnerKey = `${cascadeStreamId}-runner-${runnerIndex}`;
  const parallaxDepth = getSeededRange(runnerKey, "parallax-depth", [0.45, 1]);
  const parallaxDirection =
    getHashRatio(`${runnerKey}-parallax-direction`) > 0.5 ? 1 : -1;
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
  const style = getRunnerStyle(
    person.profileKey,
    runnerIndex,
    runnerCount,
    duration,
  );
  const displayName = getDisplayName(person.member.name);
  const displayTitle = getDisplayTitle(person);

  function handlePointerEnter() {
    setFrozenParallax({
      rotate: parallaxRotate.get(),
      x: parallaxX.get(),
      y: parallaxY.get(),
    });
    onPointerEnter();
  }

  function handlePointerLeave() {
    setFrozenParallax(null);
  }

  function handleAnimationIteration(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;

    onAnimationIteration(runnerIndex);
  }

  return (
    <article
      className={styles.teamCascadeItemAnchor}
      data-roster-group={person.roleLabel.toLowerCase()}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      role="listitem"
      aria-label={`${displayName}, ${displayTitle}`}
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
          onAnimationIteration={handleAnimationIteration}
        >
          <motion.div
            className={styles.teamAvatarMotion}
            style={{ rotate: frozenParallax?.rotate ?? parallaxRotate }}
          >
            <TeamAvatar person={person} onPointerUp={onPointerUp} />
          </motion.div>
        </div>
      </motion.div>
      <span className={styles.srOnly}>
        Profile {memberIndex + 1} of {total}
      </span>
    </article>
  );
}

function TeamCascadeStaticProfile({
  index,
  person,
  total,
}: {
  index: number;
  person: TeamCascadePerson;
  total: number;
}) {
  const displayName = getDisplayName(person.member.name);
  const displayTitle = getDisplayTitle(person);

  return (
    <article
      className={styles.teamCascadeStaticProfile}
      role="listitem"
      aria-label={`${displayName}, ${displayTitle}`}
    >
      <TeamAvatar person={person} />
      <span className={styles.srOnly}>
        Profile {index + 1} of {total}
      </span>
    </article>
  );
}

function useCascadeContainerMetrics(
  viewportRef: RefObject<HTMLDivElement | null>,
  avatarProbeRef: RefObject<HTMLDivElement | null>,
) {
  const [metrics, setMetrics] = useState({
    containerHeight: 0,
    rootFontSize: 16,
  });

  useEffect(() => {
    const viewport = viewportRef.current;
    const avatarProbe = avatarProbeRef.current;

    if (!viewport || !avatarProbe) return;

    const observedViewport = viewport;
    const observedAvatarProbe = avatarProbe;

    function updateMetrics() {
      const containerHeight = observedViewport.getBoundingClientRect().height;
      const rootElement = observedAvatarProbe.ownerDocument.documentElement;
      const measuredRootFontSize = Number.parseFloat(
        window.getComputedStyle(rootElement).fontSize,
      );
      const rootFontSize =
        Number.isFinite(measuredRootFontSize) && measuredRootFontSize > 0
          ? measuredRootFontSize
          : 16;

      setMetrics((current) =>
        current.containerHeight === containerHeight &&
        current.rootFontSize === rootFontSize
          ? current
          : { containerHeight, rootFontSize },
      );
    }

    updateMetrics();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateMetrics);

      return () => window.removeEventListener("resize", updateMetrics);
    }

    const observer = new ResizeObserver(updateMetrics);
    observer.observe(observedViewport);
    observer.observe(observedAvatarProbe);

    return () => observer.disconnect();
  }, [avatarProbeRef, viewportRef]);

  return metrics;
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
  members,
}: {
  isReducedMotion: boolean;
  members: TeamCascadePerson[];
}) {
  const runnerCount = Math.min(maximumRunnerCount, members.length);
  const [runnerMemberIndexes, setRunnerMemberIndexes] = useState(() =>
    Array.from({ length: runnerCount }, (_, index) => index),
  );
  const [hasFocusWithin, setHasFocusWithin] = useState(false);
  const [isResumingAfterClick, setIsResumingAfterClick] = useState(false);
  const nextMemberIndexRef = useRef(runnerCount);
  const viewportRef = useRef<HTMLDivElement>(null);
  const avatarProbeRef = useRef<HTMLDivElement>(null);
  const sectionTitleId = `team-cascade-${cascadeStreamId}-title`;
  const keyboardInstructionsId = useId();
  const { scrollYProgress: parallaxScrollProgress } = useScroll({
    offset: ["start end", "end start"],
    target: viewportRef,
  });
  const { containerHeight, rootFontSize } = useCascadeContainerMetrics(
    viewportRef,
    avatarProbeRef,
  );
  const duration = getRunnerDuration(containerHeight, rootFontSize);

  function showNextMember(runnerIndex: number) {
    if (members.length <= runnerCount) return;

    const nextMemberIndex = wrapIndex(
      nextMemberIndexRef.current,
      members.length,
    );
    nextMemberIndexRef.current += 1;
    setRunnerMemberIndexes((currentIndexes) =>
      currentIndexes.map((currentIndex, index) =>
        index === runnerIndex ? nextMemberIndex : currentIndex,
      ),
    );
  }

  function showAdjacentPair(direction: -1 | 1) {
    if (members.length <= runnerCount) return;

    const offset = direction * runnersPerDropGroup;
    nextMemberIndexRef.current += offset;
    setRunnerMemberIndexes((currentIndexes) =>
      currentIndexes.map((currentIndex) =>
        wrapIndex(currentIndex + offset, members.length),
      ),
    );
  }

  function handleRunnerPointerEnter() {
    setIsResumingAfterClick(false);
  }

  function handleAvatarPointerUp() {
    if (!isReducedMotion) setIsResumingAfterClick(true);
  }

  return (
    <motion.section
      className={styles.teamCascadeSection}
      aria-labelledby={sectionTitleId}
      initial={isReducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={isReducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.65, ease: "easeOut" }}
    >
      <h3 id={sectionTitleId} className={styles.srOnly}>
        {cascadeStreamLabel}
      </h3>
      <div
        ref={viewportRef}
        className={styles.teamCascadeViewport}
        data-stream={cascadeStreamId}
        aria-label="Knight Hacks team profiles falling through the waterfall"
        aria-describedby={keyboardInstructionsId}
        role="region"
        tabIndex={0}
        onFocusCapture={(event) => {
          setHasFocusWithin(true);
          if (event.target === event.currentTarget) {
            setIsResumingAfterClick(false);
          }
        }}
        onBlurCapture={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            setHasFocusWithin(false);
            setIsResumingAfterClick(false);
          }
        }}
        onKeyDown={(event) => {
          if (isReducedMotion) return;

          if (event.key === "ArrowDown") {
            event.preventDefault();
            showAdjacentPair(1);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            showAdjacentPair(-1);
          }
        }}
      >
        <p id={keyboardInstructionsId} className={styles.srOnly}>
          {isReducedMotion
            ? "Scroll through the static roster to browse all team profiles."
            : "Focus this cascade and use the Up and Down Arrow keys to browse profile pairs."}
        </p>
        <div
          className={styles.teamCascadeStage}
          data-focused={hasFocusWithin ? true : undefined}
          data-resuming={isResumingAfterClick ? true : undefined}
        >
          <div
            ref={avatarProbeRef}
            className={styles.teamAvatarProbe}
            aria-hidden="true"
          />
          {isReducedMotion ? (
            <div className={styles.teamCascadeStaticRoster} role="list">
              {members.map((person, index) => (
                <TeamCascadeStaticProfile
                  key={person.profileKey}
                  index={index}
                  person={person}
                  total={members.length}
                />
              ))}
            </div>
          ) : (
            <div className={styles.teamCascadeStream} role="list">
              {runnerMemberIndexes.map((memberIndex, runnerIndex) => {
                const person = members[memberIndex];

                return person ? (
                  <TeamCascadeRunner
                    key={`runner-${runnerIndex}`}
                    duration={duration}
                    memberIndex={memberIndex}
                    onAnimationIteration={showNextMember}
                    onPointerEnter={handleRunnerPointerEnter}
                    onPointerUp={handleAvatarPointerUp}
                    person={person}
                    runnerCount={runnerCount}
                    runnerIndex={runnerIndex}
                    scrollProgress={parallaxScrollProgress}
                    total={members.length}
                  />
                ) : null;
              })}
            </div>
          )}
        </div>
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
  const [status, setStatus] = useState<TeamCascadeStatus>(
    bladeUrl ? "loading" : "error",
  );
  const prefersReducedMotion = usePrefersReducedMotion();
  const cascadingMembers = useMemo(() => getCascadingMembers(groups), [groups]);
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

  if (cascadingMembers.length === 0) {
    return (
      <TeamCascadeStatusMessage className={cascadeClassName}>
        No visible team profiles found.
      </TeamCascadeStatusMessage>
    );
  }

  return (
    <div className={cascadeClassName}>
      <TeamCascadeStreamSection
        isReducedMotion={prefersReducedMotion}
        members={cascadingMembers}
      />
    </div>
  );
}
