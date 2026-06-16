import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

type HackathonEventKind = "hackathon" | "hackday";

interface HistoryMetric {
  value: number | string;
  label: string;
}

export interface HackathonHistoryEntry {
  name: string;
  displayName?: string;
  date: string;
  kind: HackathonEventKind;
  participants?: number;
  projects?: number;
  primaryMetric?: HistoryMetric;
  secondaryMetric?: HistoryMetric;
  siteUrl: string;
  siteLabel?: string;
  imageSrc: string;
  imageAlt: string;
  caption: string;
  accent: string;
  hoverTheme?: "ix" | "bloom";
}

interface TimelineRow {
  side: "left" | "right";
  cardX: number;
  cardY: number;
  cardWidth: number;
  cardHeight: number;
  detailsX: number;
}

interface HackathonHistoryProps {
  hackathons: readonly HackathonHistoryEntry[];
}

type HistoryCardStyle = CSSProperties & {
  "--history-accent": string;
};

const baseTimelineRows = [
  {
    side: "left",
    cardX: 92.71826171875,
    cardY: 692.225341796875,
    cardWidth: 636.91552734375,
    cardHeight: 575.094482421875,
    detailsX: 921.5,
  },
  {
    side: "right",
    cardX: 808.5576171875,
    cardY: 1367.227294921875,
    cardWidth: 644.7265625,
    cardHeight: 585.4908447265625,
    detailsX: 152,
  },
  {
    side: "left",
    cardX: 92.71826171875,
    cardY: 2042.2255859375,
    cardWidth: 636.91552734375,
    cardHeight: 575.093994140625,
    detailsX: 921.5,
  },
  {
    side: "right",
    cardX: 808.5576171875,
    cardY: 2706.227294921875,
    cardWidth: 644.7265625,
    cardHeight: 585.490478515625,
    detailsX: 153,
  },
  {
    side: "left",
    cardX: 92.71875,
    cardY: 3335.2255859375,
    cardWidth: 636.9150390625,
    cardHeight: 575.093994140625,
    detailsX: 922.5,
  },
  {
    side: "right",
    cardX: 808.5576171875,
    cardY: 4009.227294921875,
    cardWidth: 644.7265625,
    cardHeight: 585.4908447265625,
    detailsX: 153,
  },
  {
    side: "left",
    cardX: 92.71875,
    cardY: 4684.2255859375,
    cardWidth: 636.9150390625,
    cardHeight: 575.093994140625,
    detailsX: 922.5,
  },
] as const satisfies readonly TimelineRow[];

const HACKATHON_TIMELINE_VERTICAL_OFFSET = 420;
const HACKATHON_DETAILS_HEIGHT = 204;
const TIMELINE_EXTRA_ROW_GAP = 675;
const TIMELINE_MARKER_BUFFER = 320;
const DESKTOP_SECTION_BOTTOM_PADDING = 120;

const leftTimelineTemplate = {
  side: "left",
  cardX: 92.71875,
  cardWidth: 636.9150390625,
  cardHeight: 575.093994140625,
  detailsX: 922.5,
} as const;

const rightTimelineTemplate = {
  side: "right",
  cardX: 808.5576171875,
  cardWidth: 644.7265625,
  cardHeight: 585.4908447265625,
  detailsX: 153,
} as const;

const countWordsUnderTwenty = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
] as const;

const countTensWords = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
] as const;

const burstClipPath =
  "polygon(50% 0%, 57% 15%, 70% 6%, 72% 22%, 88% 18%, 82% 34%, 100% 39%, 86% 50%, 100% 62%, 82% 66%, 88% 82%, 72% 78%, 70% 94%, 57% 85%, 50% 100%, 43% 85%, 30% 94%, 28% 78%, 12% 82%, 18% 66%, 0% 62%, 14% 50%, 0% 39%, 18% 34%, 12% 18%, 28% 22%, 30% 6%, 43% 15%)";

function formatCountAsWords(count: number) {
  if (count < countWordsUnderTwenty.length) {
    return countWordsUnderTwenty[count];
  }

  if (count < 100) {
    const tens = Math.floor(count / 10);
    const ones = count % 10;

    return ones === 0
      ? countTensWords[tens]
      : `${countTensWords[tens]}-${countWordsUnderTwenty[ones]}`;
  }

  return String(count);
}

function getArchiveCountLabel(hackathons: readonly HackathonHistoryEntry[]) {
  const eventCount = hackathons.length;
  const pluralSuffix = eventCount === 1 ? "" : "s";

  return `${formatCountAsWords(eventCount)} hackathon${pluralSuffix}`;
}

function getEventKindLabel(hackathon: HackathonHistoryEntry) {
  return hackathon.kind === "hackday" ? "Hackday" : "Hackathon";
}

function getPrimaryMetric(hackathon: HackathonHistoryEntry): HistoryMetric {
  return (
    hackathon.primaryMetric ?? {
      value: hackathon.participants ?? "TBA",
      label: "Hackers",
    }
  );
}

function getSecondaryMetric(hackathon: HackathonHistoryEntry): HistoryMetric {
  return (
    hackathon.secondaryMetric ?? {
      value: hackathon.projects ?? "TBA",
      label: "Projects",
    }
  );
}

function getTimelineRows(count: number) {
  const rows: TimelineRow[] = [];

  for (let index = 0; index < count; index += 1) {
    const baseRow = baseTimelineRows[index];

    if (baseRow) {
      rows.push(baseRow);
      continue;
    }

    const previousRow = rows[rows.length - 1] ?? baseTimelineRows[0];
    const template =
      index % 2 === 0 ? leftTimelineTemplate : rightTimelineTemplate;

    rows.push({
      ...template,
      cardY: previousRow.cardY + TIMELINE_EXTRA_ROW_GAP,
    });
  }

  return rows;
}

function getDesktopSectionHeight(rows: readonly TimelineRow[]) {
  const lastRow = rows[rows.length - 1];

  if (!lastRow) {
    return 6040;
  }

  return Math.ceil(
    lastRow.cardY +
      HACKATHON_TIMELINE_VERTICAL_OFFSET +
      lastRow.cardHeight +
      DESKTOP_SECTION_BOTTOM_PADDING,
  );
}

function getHackathonYearRange(hackathons: readonly HackathonHistoryEntry[]) {
  const years = hackathons
    .map((hackathon) => /\d{4}/.exec(hackathon.date)?.[0])
    .filter((year): year is string => Boolean(year))
    .map(Number);

  if (years.length === 0) {
    return "";
  }

  const firstYear = Math.min(...years);
  const latestYear = Math.max(...years);

  return firstYear === latestYear
    ? String(firstYear)
    : `${firstYear}-${latestYear}`;
}

function getDetailsTop(row: TimelineRow) {
  return (
    row.cardY +
    HACKATHON_TIMELINE_VERTICAL_OFFSET +
    row.cardHeight / 2 -
    HACKATHON_DETAILS_HEIGHT / 2
  );
}

function getCardStyle(
  hackathon: HackathonHistoryEntry,
  style?: CSSProperties,
): HistoryCardStyle {
  return {
    ...style,
    "--history-accent": hackathon.accent,
  };
}

function getDetailsTitleClass(name: string) {
  if (name.length > 24) {
    return "max-w-[440px] text-wrap text-[40px] leading-[38px]";
  }

  if (name.length > 18) {
    return "max-w-[440px] text-wrap text-[44px] leading-[40px]";
  }

  if (name.length > 13) {
    return "max-w-[560px] whitespace-nowrap text-[44px] leading-[40px]";
  }

  return "max-w-[560px] whitespace-nowrap text-[48px] leading-[43.2px]";
}

function getBadgeValueClass(value: number | string, isDark: boolean) {
  const valueLength = String(value).length;
  const shadowClass = isDark
    ? "[text-shadow:2px_2px_0_var(--history-accent)]"
    : "";

  if (valueLength >= 5) {
    return `text-[1.18rem] sm:text-[1.45rem] md:text-[1.7rem] lg:text-[1.95rem] ${shadowClass}`;
  }

  if (valueLength >= 4) {
    return `text-[1.32rem] sm:text-[1.6rem] md:text-[1.9rem] lg:text-[2.18rem] ${shadowClass}`;
  }

  return isDark
    ? "text-[1.55rem] sm:text-[1.9rem] md:text-[2.15rem] lg:text-[2.45rem] [text-shadow:2px_2px_0_var(--history-accent)]"
    : "text-[1.65rem] sm:text-[2rem] md:text-[2.2rem] lg:text-[2.45rem]";
}

function HackathonBadge({
  value,
  label,
  variant,
}: {
  value: number | string;
  label: string;
  variant: "primary" | "dark";
}) {
  const isDark = variant === "dark";

  return (
    <div
      className={`absolute flex aspect-square items-center justify-center text-center ${
        isDark
          ? "bottom-0 right-[1%] w-[24%] bg-[#161116] text-white"
          : "left-[1%] top-0 w-[24%] bg-[var(--history-accent)] text-black"
      }`}
      style={{ clipPath: burstClipPath }}
    >
      <div className="flex -rotate-3 flex-col items-center justify-center leading-none">
        <span
          className={`whitespace-nowrap font-black ${getBadgeValueClass(value, isDark)}`}
        >
          {value}
        </span>
        <span className="mt-1 text-[clamp(0.52rem,1.35vw,0.86rem)] font-black uppercase">
          {label}
        </span>
      </div>
    </div>
  );
}

function HackathonCard({
  hackathon,
  side,
  className = "",
  sizes,
  style,
}: {
  hackathon: HackathonHistoryEntry;
  side: TimelineRow["side"];
  className?: string;
  sizes: string;
  style?: CSSProperties;
}) {
  const cardRotation = side === "left" ? "-rotate-[5deg]" : "rotate-[4deg]";
  const imagePosition = side === "left" ? "object-center" : "object-[52%_50%]";
  const primaryMetric = getPrimaryMetric(hackathon);
  const secondaryMetric = getSecondaryMetric(hackathon);
  const themeClass = hackathon.hoverTheme
    ? `club-history-card-theme-${hackathon.hoverTheme}`
    : "";

  const photoThemeLayer =
    hackathon.hoverTheme === "ix" ? (
      <div
        className="club-history-theme-layer club-history-ix-layer"
        aria-hidden="true"
      >
        <span className="club-history-firefly club-history-firefly-one" />
        <span className="club-history-firefly club-history-firefly-two" />
        <span className="club-history-firefly club-history-firefly-three" />
        <span className="club-history-firefly club-history-firefly-four" />
        <span className="club-history-firefly club-history-firefly-five" />
        <span className="club-history-firefly club-history-firefly-six" />
      </div>
    ) : null;

  const polaroidThemeLayer =
    hackathon.hoverTheme === "bloom" ? (
      <div
        className="club-history-theme-layer club-history-bloom-layer"
        aria-hidden="true"
      >
        <span className="club-history-bloom-flower club-history-bloom-flower-one" />
        <span className="club-history-bloom-flower club-history-bloom-flower-two" />
        <span className="club-history-bloom-flower club-history-bloom-flower-three" />
        <span className="club-history-bloom-flower club-history-bloom-flower-four" />
        <span className="club-history-bloom-flower club-history-bloom-flower-five" />
        <span className="club-history-bloom-flower club-history-bloom-flower-six" />
      </div>
    ) : null;

  return (
    <div
      className={`club-history-card group ${themeClass} ${className}`}
      style={getCardStyle(hackathon, style)}
      data-reveal="photo"
    >
      <div
        className={`club-history-polaroid absolute left-[15%] top-[8%] h-[78%] w-[70%] ${cardRotation} bg-white p-[3.5%] pb-[12%] shadow-[12px_12px_0_rgba(12,5,18,0.9)]`}
      >
        <div className="club-history-photo-frame relative h-full overflow-hidden bg-[#120313]">
          <Image
            src={hackathon.imageSrc}
            alt={hackathon.imageAlt}
            fill
            sizes={sizes}
            className={`object-cover ${imagePosition} contrast-[1.08] grayscale transition duration-500 group-hover:grayscale-0`}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_22%,rgba(255,255,255,0.14),transparent_34%)] mix-blend-screen" />
          {photoThemeLayer}
        </div>
        {polaroidThemeLayer}
        <p className="absolute bottom-[5%] left-[9%] right-[9%] truncate text-center text-[clamp(0.58rem,1.35vw,0.72rem)] font-black uppercase leading-none tracking-normal text-black">
          {hackathon.caption}
        </p>
      </div>

      <HackathonBadge
        value={primaryMetric.value}
        label={primaryMetric.label}
        variant="primary"
      />
      <HackathonBadge
        value={secondaryMetric.value}
        label={secondaryMetric.label}
        variant="dark"
      />
    </div>
  );
}

function HackathonDetails({
  x,
  y,
  hackathon,
}: {
  x: number;
  y: number;
  hackathon: HackathonHistoryEntry;
}) {
  const eventKindLabel = getEventKindLabel(hackathon);
  const visibleName = hackathon.displayName ?? hackathon.name;
  const titleClass = getDetailsTitleClass(visibleName);

  return (
    <div
      className="club-history-details absolute flex min-h-[204px] w-[440px] flex-col items-start justify-center"
      style={getCardStyle(hackathon, { left: x, top: y })}
      data-reveal={x > 700 ? "right" : "left"}
    >
      <div className="flex flex-col items-start gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="-rotate-2 bg-[#de2868] px-3 py-1">
            <p className="text-[24px] font-black uppercase leading-[43.2px] tracking-normal text-white">
              {hackathon.date}
            </p>
          </div>
          <div className="rotate-1 bg-[var(--history-accent)] px-3 py-1">
            <p className="text-[15px] font-black uppercase leading-7 tracking-normal text-black">
              {eventKindLabel}
            </p>
          </div>
        </div>
        <div className="rotate-1 border-b-4 border-[#f4ca41]">
          <h2
            className={`${titleClass} font-black uppercase tracking-normal text-white`}
          >
            {visibleName}
          </h2>
        </div>
      </div>

      <Link
        href={hackathon.siteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="club-history-link mt-9 flex h-12 w-[308px] items-center justify-center border-2 border-white bg-transparent text-center text-[14px] font-bold uppercase leading-[21px] tracking-normal text-white shadow-[4px_4px_0_rgba(255,255,255,0.3)]"
      >
        {hackathon.siteLabel ?? `View ${eventKindLabel} Site`}{" "}
        <span aria-hidden="true" className="pl-2 text-[18px]">
          →
        </span>
      </Link>
    </div>
  );
}

function Timeline({ rows }: { rows: readonly TimelineRow[] }) {
  const firstRow = rows[0];
  const lastRow = rows[rows.length - 1];

  if (!firstRow || !lastRow) {
    return null;
  }

  const firstMarkerCenter =
    firstRow.cardY +
    HACKATHON_TIMELINE_VERTICAL_OFFSET +
    firstRow.cardHeight / 2;
  const lastMarkerCenter =
    lastRow.cardY + HACKATHON_TIMELINE_VERTICAL_OFFSET + lastRow.cardHeight / 2;
  const top = firstMarkerCenter - TIMELINE_MARKER_BUFFER;
  const height =
    lastMarkerCenter - firstMarkerCenter + TIMELINE_MARKER_BUFFER * 2;

  return (
    <div
      className="club-history-timeline absolute left-[735px] w-[44px]"
      data-history-timeline
      data-reveal="photo"
      style={{ top, height }}
      aria-hidden="true"
    >
      <div className="club-history-timeline-shell">
        <div className="club-history-timeline-rail" />
      </div>
      <div
        className="club-history-timeline-fill"
        style={{
          height: "calc(var(--history-timeline-progress, 0) * 100%)",
        }}
      />
      <div
        className="club-history-timeline-scrubber"
        style={{
          top: "clamp(21px, var(--history-timeline-scrubber-y, 0px), calc(100% - 21px))",
        }}
      />
      {rows.map((row) => {
        const markerTop =
          row.cardY +
          HACKATHON_TIMELINE_VERTICAL_OFFSET +
          row.cardHeight / 2 -
          top;
        const markerProgress = markerTop / height;

        return (
          <div
            key={`${row.side}-${row.cardY}`}
            className="club-history-timeline-marker"
            data-history-marker={markerProgress.toFixed(4)}
            style={{ top: markerTop }}
          />
        );
      })}
    </div>
  );
}

function MobileHackathon({
  hackathon,
  index,
}: {
  hackathon: HackathonHistoryEntry;
  index: number;
}) {
  const eventKindLabel = getEventKindLabel(hackathon);
  const visibleName = hackathon.displayName ?? hackathon.name;

  return (
    <article className="grid gap-5" data-motion-scope>
      <HackathonCard
        hackathon={hackathon}
        side={index % 2 === 0 ? "left" : "right"}
        className="relative aspect-[1.1] w-full"
        sizes="100vw"
      />
      <div data-reveal>
        <div className="flex flex-wrap items-center gap-2">
          <div className="-rotate-1 bg-[#de2868] px-3 py-1">
            <p className="text-base font-black uppercase leading-7 tracking-normal text-white">
              {hackathon.date}
            </p>
          </div>
          <div
            className="rotate-1 bg-[var(--history-accent)] px-3 py-1"
            style={getCardStyle(hackathon)}
          >
            <p className="text-sm font-black uppercase leading-6 tracking-normal text-black">
              {eventKindLabel}
            </p>
          </div>
        </div>
        <h2 className="mt-3 text-[clamp(2rem,10vw,3rem)] font-black uppercase leading-none tracking-normal text-white">
          {visibleName}
        </h2>
        <Link
          href={hackathon.siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="club-history-link mt-5 flex h-12 w-full items-center justify-center border-2 border-white bg-transparent text-center text-[14px] font-bold uppercase leading-[21px] tracking-normal text-white shadow-[4px_4px_0_rgba(255,255,255,0.3)]"
        >
          {hackathon.siteLabel ?? `View ${eventKindLabel} Site`}{" "}
          <span aria-hidden="true" className="pl-2 text-[18px]">
            →
          </span>
        </Link>
      </div>
    </article>
  );
}

export default function HackathonHistory({
  hackathons,
}: HackathonHistoryProps) {
  const yearRange = getHackathonYearRange(hackathons);
  const archiveCountLabel = getArchiveCountLabel(hackathons);
  const timelineRows = getTimelineRows(hackathons.length);
  const desktopSectionHeight = getDesktopSectionHeight(timelineRows);

  return (
    <main className="club-history-page relative min-h-screen overflow-hidden font-sans text-white lg:overflow-x-auto">
      <div
        className="club-history-backdrop absolute inset-0"
        aria-hidden="true"
      />
      <div
        className="club-page-hero absolute inset-x-0 top-0 z-[1] h-[100svh] overflow-hidden lg:h-[980px]"
        data-hero
      >
        <Image
          src="/hackathons/kh-history-hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_46%] brightness-[0.76] contrast-[1.06] saturate-[1.08]"
          data-hero-media
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,0,14,0.22)_0%,rgba(11,0,14,0.12)_40%,rgba(11,0,14,0.62)_70%,rgba(11,0,14,0.94)_100%)]"
          data-hero-overlay
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,0,14,0.64)_0%,rgba(11,0,14,0.06)_30%,rgba(17,2,20,0.38)_72%,#110214_100%)]"
          data-hero-overlay
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_34%_48%,rgba(255,182,43,0.12)_0%,rgba(247,79,131,0.08)_28%,transparent_58%)]"
          data-hero-overlay
        />
        <div
          className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-[#110214]"
          data-hero-overlay
        />
      </div>

      <section
        className="club-page-hero relative z-10 mx-auto min-h-[100svh] w-full max-w-[1498px] overflow-hidden bg-transparent px-5 pt-20 sm:px-6 lg:h-[var(--history-desktop-height)] lg:min-h-0 lg:w-[1498px] lg:max-w-none lg:px-0 lg:pb-0 lg:pt-0"
        style={
          {
            "--history-desktop-height": `${desktopSectionHeight}px`,
          } as CSSProperties
        }
      >
        <div
          className="relative z-20 mx-auto flex min-h-[calc(100svh-var(--club-nav-height))] w-full max-w-[24rem] flex-col items-center justify-start pb-10 pt-[var(--club-hero-logo-aligned-content-padding)] text-center sm:max-w-[32rem] sm:pb-14 md:max-w-[650px] md:pb-16 lg:absolute lg:left-1/2 lg:top-[var(--club-home-hero-logo-top)] lg:min-h-0 lg:w-[1060px] lg:max-w-[1060px] lg:-translate-x-1/2 lg:pb-0 lg:pt-0"
          data-hero-content
          data-stagger
        >
          <div className="mb-5 flex max-w-full flex-wrap items-center justify-center gap-3 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--club-gold)] [text-shadow:3px_3px_0_rgba(0,0,0,0.52)] sm:mb-6 sm:gap-4 sm:text-[13px] sm:tracking-[0.18em] lg:gap-5">
            <span className="text-white [text-shadow:3px_3px_0_rgba(0,0,0,0.45)]">
              {yearRange}
            </span>
            <span
              className="h-px w-8 bg-[var(--club-gold)] sm:w-12 lg:w-16"
              aria-hidden="true"
            />
            <span>{archiveCountLabel}</span>
          </div>
          <h1
            aria-label="Knight Hacks History"
            className="text-[clamp(2rem,9.7vw,3.65rem)] font-black uppercase leading-[0.94] tracking-normal text-white [text-shadow:5px_5px_0_rgba(0,0,0,0.48)] sm:text-[58px] md:text-[88px] md:leading-none md:[text-shadow:7px_7px_0_rgba(0,0,0,0.48)] lg:text-[96px]"
            data-reveal="headline"
          >
            <span className="club-line">
              <span className="whitespace-nowrap">Knight Hacks</span>
            </span>
            <span className="club-line">
              <span className="whitespace-nowrap">History</span>
            </span>
          </h1>
          <p className="text-white/86 mx-auto mt-5 max-w-[22rem] text-[15px] font-medium leading-7 sm:mt-6 sm:max-w-[28rem] sm:text-base sm:leading-8 md:mt-7 md:max-w-[650px] md:text-[21px] md:leading-[34px]">
            Past Knight Hacks events, project counts, and site links from
            UCF&apos;s student-built hackathons and hackdays.
          </p>
          <Link
            href="#history-timeline"
            className="club-button mt-8 inline-flex max-w-[calc(100vw-3rem)] justify-center bg-[var(--club-gold)] text-black shadow-[4px_4px_0_rgba(255,255,255,0.85)] md:mt-10 md:shadow-[5px_5px_0_rgba(255,255,255,0.85)]"
          >
            Enter The Timeline
            <span aria-hidden="true" className="pl-2 text-[18px]">
              ↓
            </span>
          </Link>
        </div>

        <div
          id="history-timeline"
          className="absolute bottom-0 left-0 h-px w-px scroll-mt-24 lg:bottom-auto lg:top-[1060px]"
        />

        <div className="hidden lg:block">
          <Timeline rows={timelineRows} />

          {timelineRows.map((row, index) => {
            const hackathon = hackathons[index];

            if (!hackathon) {
              return null;
            }

            return (
              <div key={`${row.side}-${row.cardY}`}>
                <p className="sr-only">
                  {hackathon.name} was held {hackathon.date} as a{" "}
                  {getEventKindLabel(hackathon).toLowerCase()} with{" "}
                  {getPrimaryMetric(hackathon).value}{" "}
                  {getPrimaryMetric(hackathon).label.toLowerCase()} and{" "}
                  {getSecondaryMetric(hackathon).value}{" "}
                  {getSecondaryMetric(hackathon).label.toLowerCase()}.
                </p>
                <HackathonCard
                  hackathon={hackathon}
                  side={row.side}
                  className="absolute"
                  sizes={`${Math.ceil(row.cardWidth)}px`}
                  style={{
                    left: row.cardX,
                    top: row.cardY + HACKATHON_TIMELINE_VERTICAL_OFFSET,
                    width: row.cardWidth,
                    height: row.cardHeight,
                  }}
                />
                <HackathonDetails
                  x={row.detailsX}
                  y={getDetailsTop(row)}
                  hackathon={hackathon}
                />
              </div>
            );
          })}
        </div>
      </section>

      <div
        className="club-hero-transition-layer relative z-10 lg:hidden"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto grid w-full max-w-[1498px] gap-16 px-5 pb-20 pt-2 sm:px-6 sm:pb-24 lg:hidden">
        {hackathons.map((hackathon, index) => (
          <MobileHackathon
            key={hackathon.name}
            hackathon={hackathon}
            index={index}
          />
        ))}
      </div>
    </main>
  );
}
