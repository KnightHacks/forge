"use client";

import type { ImageLoaderProps } from "next/image";
import type { CSSProperties, ReactNode, RefObject } from "react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Pause,
  Play,
} from "lucide-react";
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

import type {
  TeamCascadeGroup,
  TeamCascadeMember,
  TeamCascadeRole,
} from "../team-cascade/team-roster";
import { loadTeamCascadeGroups } from "../team-cascade/team-roster";
import styles from "./TeamWaterfallCarousel.module.css";

type TeamCarouselStatus = "loading" | "ready" | "error";

interface TeamCarouselPerson {
  member: TeamCascadeMember;
  profileKey: string;
  roleLabel: TeamCascadeRole;
}

interface TeamCarouselSlide {
  index: number;
  person: TeamCarouselPerson;
  slot: number;
}

type ProfileCardStyle = CSSProperties & {
  "--profile-accent": string;
};

const profileImageLoader = ({ src }: ImageLoaderProps) => src;
const rosterIdPrefixes = ["executive-", "directors-", "hackathon-"] as const;
const carouselSlots = [-2, -1, 0, 1, 2] as const;
const flowEase = [0.22, 0.72, 0.24, 1] as const;
const automaticRotationMs = 4800;

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

function getDisplayTitle({ member, roleLabel }: TeamCarouselPerson) {
  if (roleLabel === "Organizer" && member.teamRole !== "Hack Lead") {
    return "Hackathon Organizer";
  }

  return member.teamRole;
}

function getMemberProfileKey(member: TeamCascadeMember) {
  const prefix = rosterIdPrefixes.find((candidate) =>
    member.id.startsWith(candidate),
  );

  return prefix ? member.id.slice(prefix.length) : member.id;
}

function getCarouselMembers(groups: TeamCascadeGroup[]) {
  const leadershipByProfileId = new Map<string, TeamCarouselPerson>();

  for (const group of groups) {
    for (const member of group.members) {
      const memberProfileKey = getMemberProfileKey(member);

      if (!leadershipByProfileId.has(memberProfileKey)) {
        leadershipByProfileId.set(memberProfileKey, {
          member,
          profileKey: `waterfall-${memberProfileKey}`,
          roleLabel: group.roleLabel,
        });
      }
    }
  }

  return [...leadershipByProfileId.values()];
}

function getProfileAccent(color: string | null) {
  if (color && /^#[\da-f]{3,8}$/i.test(color)) return color;

  return "#67e4ff";
}

function getVisibleSlides(
  members: TeamCarouselPerson[],
  activeIndex: number,
): TeamCarouselSlide[] {
  const memberCount = members.length;

  if (memberCount === 0) return [];

  const availableSlots =
    memberCount >= carouselSlots.length
      ? carouselSlots
      : memberCount === 4
        ? ([-1, 0, 1, 2] as const)
        : memberCount === 3
          ? ([-1, 0, 1] as const)
          : memberCount === 2
            ? ([0, 1] as const)
            : ([0] as const);

  return availableSlots.map((slot) => {
    const index = wrapIndex(activeIndex + slot, memberCount);

    return { index, person: members[index]!, slot };
  });
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
        sizes="(max-width: 520px) 3.5rem, 5.75rem"
        className={styles.profileImage}
      />
    );
  }

  return (
    <span className={styles.profileInitials}>{getInitials(member.name)}</span>
  );
}

function ProfileCardContent({
  isActive,
  person,
  slot,
}: {
  isActive: boolean;
  person: TeamCarouselPerson;
  slot: number;
}) {
  const displayName = getDisplayName(person.member.name);
  const displayTitle = getDisplayTitle(person);

  return (
    <>
      <span className={styles.profilePortrait} aria-hidden="true">
        <span className={styles.profileMedia}>
          <ProfileImage member={person.member} />
        </span>
      </span>

      <span className={styles.profileCopy}>
        <span className={styles.profileGroup}>{person.roleLabel}</span>
        <strong className={styles.profileName}>{displayName}</strong>
        <span className={styles.profileTitle}>{displayTitle}</span>
      </span>

      {isActive && person.member.linkedinUrl ? (
        <span className={styles.linkedinAction} aria-hidden="true">
          <span>LinkedIn</span>
          <ExternalLink size={15} strokeWidth={2} />
        </span>
      ) : slot < 0 ? (
        <ChevronDown
          className={styles.cardDirection}
          size={18}
          strokeWidth={2.2}
          aria-hidden="true"
        />
      ) : slot > 0 ? (
        <ChevronUp
          className={styles.cardDirection}
          size={18}
          strokeWidth={2.2}
          aria-hidden="true"
        />
      ) : null}
    </>
  );
}

function TeamProfileCard({
  isReducedMotion,
  onSelect,
  slide,
  slotGap,
  total,
}: {
  isReducedMotion: boolean;
  onSelect: (index: number) => void;
  slide: TeamCarouselSlide;
  slotGap: number;
  total: number;
}) {
  const { index, person, slot } = slide;
  const { member } = person;
  const isActive = slot === 0;
  const isBuffer = Math.abs(slot) > 1;
  const displayName = getDisplayName(member.name);
  const displayTitle = getDisplayTitle(person);
  const cardStyle: ProfileCardStyle = {
    "--profile-accent": getProfileAccent(member.color),
  };
  const cardContent = (
    <ProfileCardContent isActive={isActive} person={person} slot={slot} />
  );
  let surface: ReactNode;

  if (isBuffer) {
    surface = (
      <div className={styles.profileSurface} style={cardStyle}>
        {cardContent}
      </div>
    );
  } else if (isActive && member.linkedinUrl) {
    surface = (
      <a
        className={styles.profileSurface}
        href={member.linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${displayName}, ${displayTitle}, on LinkedIn`}
        style={cardStyle}
      >
        {cardContent}
      </a>
    );
  } else if (isActive) {
    surface = (
      <div className={styles.profileSurface} style={cardStyle} tabIndex={0}>
        {cardContent}
      </div>
    );
  } else {
    surface = (
      <button
        type="button"
        className={styles.profileSurface}
        onClick={() => onSelect(index)}
        aria-label={`Bring ${displayName}, ${displayTitle}, into focus`}
        style={cardStyle}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <div className={styles.cardPositioner}>
      <motion.article
        className={styles.profileCard}
        data-active={isActive ? true : undefined}
        data-buffer={isBuffer ? true : undefined}
        data-slot={slot}
        role={isBuffer ? undefined : "group"}
        aria-roledescription={isBuffer ? undefined : "slide"}
        aria-label={
          isBuffer
            ? undefined
            : `${index + 1} of ${total}: ${displayName}, ${displayTitle}`
        }
        aria-hidden={isBuffer ? true : undefined}
        initial={false}
        animate={{
          opacity: isBuffer ? 0 : isActive ? 1 : 0.58,
          y: slot * slotGap,
        }}
        transition={
          isReducedMotion
            ? { duration: 0 }
            : { duration: 0.76, ease: flowEase }
        }
      >
        {surface}
      </motion.article>
    </div>
  );
}

function useCarouselMetrics(
  viewportRef: RefObject<HTMLDivElement | null>,
  stageRef: RefObject<HTMLDivElement | null>,
) {
  const [metrics, setMetrics] = useState({
    stageHeight: 0,
    viewportHeight: 0,
  });

  useEffect(() => {
    const viewport = viewportRef.current;
    const stage = stageRef.current;

    if (!viewport || !stage) return;

    function updateMetrics() {
      const viewportHeight = viewport.getBoundingClientRect().height;
      const stageHeight = stage.getBoundingClientRect().height;

      setMetrics((current) =>
        current.stageHeight === stageHeight &&
        current.viewportHeight === viewportHeight
          ? current
          : { stageHeight, viewportHeight },
      );
    }

    updateMetrics();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateMetrics);

      return () => window.removeEventListener("resize", updateMetrics);
    }

    const observer = new ResizeObserver(updateMetrics);
    observer.observe(viewport);
    observer.observe(stage);

    return () => observer.disconnect();
  }, [stageRef, viewportRef]);

  return metrics;
}

function TeamCarouselStatusMessage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const statusClassName = className
    ? `${styles.carouselStatusFrame} ${className}`
    : styles.carouselStatusFrame;

  return (
    <div className={statusClassName}>
      <p className={styles.carouselStatus}>{children}</p>
    </div>
  );
}

export function TeamWaterfallCarouselClient({
  bladeUrl,
  className,
}: {
  bladeUrl: string;
  className?: string;
}) {
  const [groups, setGroups] = useState<TeamCascadeGroup[]>([]);
  const [status, setStatus] = useState<TeamCarouselStatus>(
    bladeUrl ? "loading" : "error",
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [hasFocusWithin, setHasFocusWithin] = useState(false);
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [manualAnnouncement, setManualAnnouncement] = useState("");
  const [rotationCycle, setRotationCycle] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const isStageInView = useInView(stageRef, { amount: 0.12 });
  const members = useMemo(() => getCarouselMembers(groups), [groups]);
  const slides = useMemo(
    () => getVisibleSlides(members, activeIndex),
    [activeIndex, members],
  );
  const { scrollYProgress } = useScroll({
    offset: ["start start", "end end"],
    target: viewportRef,
  });
  const { stageHeight, viewportHeight } = useCarouselMetrics(
    viewportRef,
    stageRef,
  );
  const maxStageTravel = Math.max(0, viewportHeight - stageHeight);
  const stageFollowY = useTransform(
    scrollYProgress,
    (progress) => progress * maxStageTravel,
  );
  const slotGap = stageHeight
    ? Math.min(196, Math.max(82, stageHeight * 0.31))
    : 156;
  const carouselClassName = className
    ? `${styles.teamCarousel} ${className}`
    : styles.teamCarousel;

  function showMember(index: number) {
    if (members.length === 0) return;

    const nextIndex = wrapIndex(index, members.length);
    const nextPerson = members[nextIndex]!;

    setActiveIndex(nextIndex);
    setRotationCycle((cycle) => cycle + 1);
    setManualAnnouncement(
      `${getDisplayName(nextPerson.member.name)}, ${getDisplayTitle(nextPerson)}. ${nextIndex + 1} of ${members.length}.`,
    );
  }

  function toggleAutoplay() {
    const nextPausedState = !isAutoplayPaused;

    setIsAutoplayPaused(nextPausedState);
    setManualAnnouncement(
      nextPausedState
        ? "Automatic team rotation paused."
        : "Automatic team rotation resumed.",
    );
  }

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

  useEffect(() => {
    setActiveIndex(0);
  }, [members.length]);

  useEffect(() => {
    function handleVisibilityChange() {
      setIsDocumentVisible(document.visibilityState === "visible");
    }

    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (
      members.length <= 1 ||
      prefersReducedMotion ||
      isAutoplayPaused ||
      isPointerInside ||
      hasFocusWithin ||
      !isDocumentVisible ||
      !isStageInView
    ) {
      return;
    }

    const rotationTimer = window.setInterval(() => {
      setActiveIndex((currentIndex) =>
        wrapIndex(currentIndex - 1, members.length),
      );
    }, automaticRotationMs);

    return () => window.clearInterval(rotationTimer);
  }, [
    hasFocusWithin,
    isAutoplayPaused,
    isDocumentVisible,
    isPointerInside,
    isStageInView,
    members.length,
    prefersReducedMotion,
    rotationCycle,
  ]);

  if (status === "loading") {
    return (
      <TeamCarouselStatusMessage className={carouselClassName}>
        Loading public team profiles.
      </TeamCarouselStatusMessage>
    );
  }

  if (status === "error") {
    return (
      <TeamCarouselStatusMessage className={carouselClassName}>
        Could not load Blade team profiles. Check the configured Blade URL or
        local Blade server.
      </TeamCarouselStatusMessage>
    );
  }

  if (members.length === 0) {
    return (
      <TeamCarouselStatusMessage className={carouselClassName}>
        No visible team profiles found.
      </TeamCarouselStatusMessage>
    );
  }

  return (
    <motion.section
      className={carouselClassName}
      aria-labelledby={titleId}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.02 }}
      transition={{ duration: 0.65, ease: "easeOut" }}
    >
      <h3 id={titleId} className={styles.carouselTitle}>
        Hackathon Organizers
      </h3>

      <div
        ref={viewportRef}
        className={styles.carouselViewport}
        role="region"
        aria-roledescription="carousel"
        aria-label="Knight Hacks team profiles"
        tabIndex={0}
        onPointerEnter={() => setIsPointerInside(true)}
        onPointerLeave={() => setIsPointerInside(false)}
        onFocusCapture={() => setHasFocusWithin(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setHasFocusWithin(false);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            showMember(activeIndex - 1);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            showMember(activeIndex + 1);
          }
        }}
      >
        <motion.div
          ref={stageRef}
          className={styles.carouselStage}
          style={{ y: stageFollowY }}
        >
          <div className={styles.waterCurrent} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>

          <div className={styles.cardLane}>
            {slides.map((slide) => (
              <TeamProfileCard
                key={slide.person.profileKey}
                isReducedMotion={prefersReducedMotion}
                onSelect={showMember}
                slide={slide}
                slotGap={slotGap}
                total={members.length}
              />
            ))}
          </div>

          <div className={styles.carouselControls}>
            <button
              type="button"
              className={`${styles.carouselControl} ${styles.directionControl}`}
              onClick={() => showMember(activeIndex + 1)}
              aria-label="Show previous team member"
            >
              <ChevronUp size={20} strokeWidth={2.2} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.carouselControl}
              onClick={toggleAutoplay}
              aria-label={
                isAutoplayPaused
                  ? "Resume automatic team rotation"
                  : "Pause automatic team rotation"
              }
              aria-pressed={isAutoplayPaused}
            >
              {isAutoplayPaused ? (
                <Play size={18} strokeWidth={2.2} aria-hidden="true" />
              ) : (
                <Pause size={18} strokeWidth={2.2} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className={`${styles.carouselControl} ${styles.directionControl}`}
              onClick={() => showMember(activeIndex - 1)}
              aria-label="Show next team member"
            >
              <ChevronDown size={20} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>

          <span className={styles.carouselCount} aria-hidden="true">
            {String(activeIndex + 1).padStart(2, "0")}
            <span>/</span>
            {String(members.length).padStart(2, "0")}
          </span>
        </motion.div>

        <p className={styles.srOnly} aria-live="polite" aria-atomic="true">
          {manualAnnouncement}
        </p>
      </div>
    </motion.section>
  );
}
