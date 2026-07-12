"use client";

import type { CSSProperties } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

import { AssetCredit } from "../../assets";
import styles from "./faq.module.css";
import { useFaqMotion } from "./useFaqMotion";

const faqSections = [
  {
    id: "general",
    label: "General",
    note: 174.61,
    questions: [
      {
        question: "What is a hackathon?",
        answer:
          "A hackathon is a weekend where students team up to learn, experiment, and build something new. At Knight Hacks IX, you’ll have workshops, mentors, sponsor events, food, swag, and plenty of time to create.",
      },
      {
        question: "What is Knight Hacks IX?",
        answer:
          "Knight Hacks IX is a 36-hour hackathon happening October 9-11, 2026 at the University of Central Florida.",
      },
      {
        question: "Who can attend?",
        answer:
          "If you're currently a college student or have graduated in the past year, you can attend! Beginners are absolutely welcome!",
      },
      {
        question: "How much experience do I need?",
        answer:
          "None! Knight Hacks is beginner-friendly, whether this is your first hackathon or you've been building projects for years. We'll have workshops, mentors, team formation support, and a welcoming environment to help you learn and build.",
      },
      {
        question: "How much does it cost?",
        answer: "Nothing! Knight Hacks is free for accepted hackers to attend.",
      },
    ],
  },
  {
    id: "event",
    label: "Event",
    note: 220,
    questions: [
      {
        question: "When is check-in?",
        answer:
          "Check-in begins at 4:00 PM on Friday, October 9, 2026. Check-in will be in Engineering II 102. Please check the Hackers Guide closer to the event for the specific arrival instructions.",
      },
      {
        question: "When and where is opening ceremony?",
        answer:
          "Opening ceremony starts at 6:30 PM on Friday, October 9, 2026 on Memory Mall.",
      },
      {
        question: "When and where is the career fair?",
        answer:
          "The career fair will take place at 9:00 PM in Student Union Cape Florida Ballroom.",
      },
      {
        question: "When is closing ceremony?",
        answer:
          "Closing ceremony will happen asynchronously in Student Union Cape Florida Ballroom and Key West Ballroom. More details will be shared in the Hackers Guide and event announcements.",
      },
      {
        question: "Do I have to stay the whole time?",
        answer:
          "Nope! We encourage you to stay for as much of the event as you can so you don't miss workshops, sponsor events, judging, and community activities, but you're free to come and go as needed.",
      },
    ],
  },
  {
    id: "logistics",
    label: "Logistics",
    note: 261.63,
    questions: [
      {
        question: "Where can I sleep?",
        answer:
          "We'll provide designated quiet/rest areas for attendees during the event. Bring anything that helps you rest comfortably, like a blanket, hoodie, or sleeping bag, and make sure to take care of yourself throughout the weekend.",
      },
      {
        question: "What should I bring?",
        answer:
          "Bring your laptop, charger, student ID or government ID, any hardware you want to use, a reusable water bottle, toiletries if you're staying overnight, and anything you need to stay comfortable.",
      },
      {
        question: "Is food provided?",
        answer:
          "Yes! Knight Hacks provides free meals, snacks, and drinks throughout the event. Food will be given out in Room 119 –– we are not delivering food to individual hackers.",
      },
      {
        question: "Are there showers available?",
        answer:
          "Showers will be available at the Recreation and Wellness Center. More details will be shared in the Hackers Guide closer to the event.",
      },
      {
        question: "Is parking available?",
        answer:
          "Parking information will be shared in the Hackers Guide closer to the event, including any garage/pass instructions.",
      },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    note: 293.66,
    questions: [
      {
        question: "What can I build?",
        answer:
          "Anything your heart desires! You can build a web app, mobile app, game, AI/ML project, hardware project, embedded project, or anything else you're excited about. Sponsor challenges and tracks may also be available to help inspire your project.",
      },
      {
        question: "How does project submission and judging work?",
        answer:
          "Projects must be submitted through Devpost and use GitHub for version control. During judging, teams will present their projects to general judges and sponsor judges. Final judging details will be shared in the Hackers Guide and event announcements.",
      },
      {
        question: "Can I use a past project or something I've built before?",
        answer:
          "No. Projects must be started after hacking begins. You're welcome to brainstorm ideas or learn tools ahead of time, but actual project work should happen during the hackathon to keep the competition fair.",
      },
      {
        question: "Should I come with a project idea already planned?",
        answer:
          "It's up to you! Some hackers come in with ideas, while others get inspired by workshops, sponsor challenges, tracks, or teammates they meet during the event. Both approaches are totally valid.",
      },
      {
        question: "What if I don't have a laptop or it's not powerful enough?",
        answer: (
          <>
            Don&apos;t let that stop you from participating. Reach out to{" "}
            <a href="mailto:hack@knighthacks.org">hack@knighthacks.org</a>
            {" and "}we&apos;ll do our best to help you find a solution. You can
            also team up with others who have the hardware or setup your project
            needs.
          </>
        ),
      },
    ],
  },
  {
    id: "community",
    label: "Community",
    note: 329.63,
    questions: [
      {
        question: "Do I need a team?",
        answer:
          "Nope! You can come solo, bring a team, or find teammates at the event. Teams may have up to four people, and we'll help hackers connect with potential teammates.",
      },
      {
        question: "How do I find teammates?",
        answer:
          "Join the Knight Hacks Discord to meet other hackers before the event. We'll also have opportunities during the hackathon to help hackers form teams in person.",
      },
      {
        question: "My question wasn't answered. Where can I ask?",
        answer: (
          <>
            Check the Hackers Guide for the most up-to-date information. If you
            still have questions, ask in the Knight Hacks Discord or email{" "}
            <a href="mailto:hack@knighthacks.org">hack@knighthacks.org</a>.
          </>
        ),
      },
      {
        question: "How can I become a sponsor?",
        answer: (
          <>
            We&apos;d love to have your organization sponsor Knight Hacks!
            Sponsorship gives companies the opportunity to connect with talented
            students, host challenges or workshops, and support Central
            Florida&apos;s builder community. Visit{" "}
            <a href="https://blade.knighthacks.org/sponsor">
              https://blade.knighthacks.org/sponsor
            </a>{" "}
            or contact Knight Hacks for more information.
          </>
        ),
      },
      {
        question: "Can I volunteer at Knight Hacks?",
        answer: (
          <>
            Yes! Volunteers help with check-in, logistics, event support, and
            making the weekend run smoothly. If you&apos;re interested in
            volunteering, reach out to{" "}
            <a href="mailto:hack@knighthacks.org">hack@knighthacks.org</a>.
          </>
        ),
      },
    ],
  },
] as const;

interface GemHotspot {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  clipPath: string;
  note: number;
}

interface FloatingAsset {
  src: string;
  alt: string;
  className: string;
  width: number;
  height: number;
  depth: number;
  hotspots?: readonly GemHotspot[];
}

function faqClass(name: string) {
  const className = styles[name];

  if (!className) {
    throw new Error(`Missing FAQ style: ${name}`);
  }

  return className;
}

const floatingAssets = [
  {
    src: "https://assets.knighthacks.org/khix/faq-FAQ cave ceiling - Thomas Ha.webp",
    alt: "",
    className: faqClass("caveCeilingPrimary"),
    width: 4500,
    height: 3000,
    depth: -18,
  },
  {
    src: "https://assets.knighthacks.org/khix/FAQ cave ceiling.webp",
    alt: "",
    className: faqClass("caveCeilingSecondary"),
    width: 4500,
    height: 3000,
    depth: -12,
  },
  {
    src: "https://assets.knighthacks.org/khix/faq-leftcol.webp",
    alt: "",
    className: faqClass("leftColumn"),
    width: 698,
    height: 2291,
    depth: 16,
    hotspots: [
      {
        id: "left-small-mushroom",
        label: "Play the small blue mushroom",
        x: 6,
        y: 17,
        width: 29,
        height: 8,
        clipPath:
          "polygon(8% 18%, 54% 0, 94% 22%, 78% 52%, 58% 58%, 64% 100%, 42% 100%, 38% 58%, 12% 52%)",
        note: 392,
      },
      {
        id: "left-tall-crystal",
        label: "Play the tall violet crystal",
        x: 19,
        y: 12,
        width: 39,
        height: 17,
        clipPath:
          "polygon(45% 0, 68% 32%, 100% 72%, 72% 100%, 18% 88%, 0 55%, 25% 35%)",
        note: 261.63,
      },
      {
        id: "left-middle-mushroom",
        label: "Play the middle cyan mushroom",
        x: 19,
        y: 38,
        width: 49,
        height: 11,
        clipPath:
          "polygon(9% 30%, 45% 0, 82% 8%, 100% 35%, 82% 55%, 58% 58%, 66% 100%, 38% 100%, 43% 58%, 12% 55%)",
        note: 329.63,
      },
      {
        id: "left-large-mushroom",
        label: "Play the large glowing mushroom",
        x: 0,
        y: 51,
        width: 78,
        height: 14,
        clipPath:
          "polygon(0 28%, 22% 6%, 57% 0, 88% 18%, 100% 42%, 80% 58%, 58% 61%, 62% 100%, 30% 100%, 37% 61%, 8% 55%)",
        note: 220,
      },
      {
        id: "left-bottom-crystals",
        label: "Play the lower violet crystal cluster",
        x: 0,
        y: 68,
        width: 80,
        height: 17,
        clipPath:
          "polygon(0 38%, 18% 20%, 32% 30%, 54% 5%, 66% 34%, 100% 0, 86% 54%, 55% 82%, 20% 100%, 0 82%)",
        note: 174.61,
      },
    ],
  },
  {
    src: "https://assets.knighthacks.org/khix/faq-rightcol.webp",
    alt: "",
    className: faqClass("rightColumn"),
    width: 982,
    height: 2140,
    depth: 16,
    hotspots: [
      {
        id: "right-top-crystal",
        label: "Play the hanging violet crystal",
        x: 58,
        y: 5,
        width: 42,
        height: 24,
        clipPath:
          "polygon(0 12%, 30% 0, 100% 4%, 100% 78%, 76% 100%, 34% 86%, 18% 55%)",
        note: 293.66,
      },
      {
        id: "right-pink-crystals",
        label: "Play the pink crystal outcrop",
        x: 73,
        y: 27,
        width: 27,
        height: 15,
        clipPath:
          "polygon(18% 0, 42% 18%, 63% 8%, 100% 22%, 100% 100%, 10% 88%, 0 42%)",
        note: 349.23,
      },
      {
        id: "right-large-mushroom",
        label: "Play the large blue mushroom",
        x: 69,
        y: 44,
        width: 28,
        height: 12,
        clipPath:
          "polygon(4% 28%, 45% 0, 88% 18%, 100% 42%, 77% 58%, 57% 60%, 65% 100%, 39% 100%, 43% 60%, 10% 55%)",
        note: 440,
      },
      {
        id: "right-mushroom-cluster",
        label: "Play the glowing mushroom cluster",
        x: 70,
        y: 51,
        width: 30,
        height: 16,
        clipPath:
          "polygon(0 8%, 28% 0, 45% 22%, 66% 3%, 100% 18%, 100% 100%, 12% 92%)",
        note: 523.25,
      },
      {
        id: "right-lower-mushroom",
        label: "Play the lower blue mushroom",
        x: 78,
        y: 63,
        width: 18,
        height: 8,
        clipPath:
          "polygon(0 22%, 45% 0, 100% 28%, 84% 55%, 62% 60%, 72% 100%, 40% 100%, 45% 60%, 12% 52%)",
        note: 587.33,
      },
      {
        id: "right-bottom-crystals",
        label: "Play the lower pink crystal cluster",
        x: 70,
        y: 73,
        width: 30,
        height: 15,
        clipPath:
          "polygon(0 18%, 34% 32%, 48% 0, 67% 38%, 100% 22%, 100% 100%, 22% 88%)",
        note: 466.16,
      },
    ],
  },
] satisfies readonly FloatingAsset[];

type FaqSectionId = (typeof faqSections)[number]["id"];

const FAQ_ASSET_PRELOAD_MARGIN = "2000px 0px";
const FAQ_BACKGROUND_IMAGE =
  'url("https://assets.knighthacks.org/khix/faq-background-1440.webp")';
const FAQ_MOBILE_BACKGROUND_IMAGE =
  'url("https://assets.knighthacks.org/khix/faq-background-768.webp")';
const FAQ_SEPARATOR_IMAGE =
  'url("https://assets.knighthacks.org/khix/separator-rocks-faq-1920.webp")';
const FAQ_MOBILE_SEPARATOR_IMAGE =
  'url("https://assets.knighthacks.org/khix/separator-rocks-faq-768.webp")';

function useDeferredFaqAssets<T extends Element>() {
  const elementRef = useRef<T>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const element = elementRef.current;

    if (!element || !("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;

        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: FAQ_ASSET_PRELOAD_MARGIN },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return [elementRef, shouldLoad] as const;
}

function useFaqResponsiveAsset(desktopAsset: string, mobileAsset: string) {
  const [asset, setAsset] = useState(desktopAsset);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 820px)");
    const updateAsset = () => {
      setAsset(mediaQuery.matches ? mobileAsset : desktopAsset);
    };

    updateAsset();
    mediaQuery.addEventListener("change", updateAsset);

    return () => mediaQuery.removeEventListener("change", updateAsset);
  }, [desktopAsset, mobileAsset]);

  return asset;
}

const getAudioContext = () => {
  return new AudioContext();
};

function playCaveNote(frequency: number) {
  const context = getAudioContext();

  const now = context.currentTime;
  const primary = context.createOscillator();
  const shimmer = context.createOscillator();
  const rumble = context.createOscillator();
  const primaryGain = context.createGain();
  const shimmerGain = context.createGain();
  const rumbleGain = context.createGain();
  const filter = context.createBiquadFilter();
  const delay = context.createDelay();
  const feedback = context.createGain();
  const wetGain = context.createGain();
  const output = context.createGain();

  primary.type = "sine";
  primary.frequency.setValueAtTime(frequency, now);
  primary.frequency.exponentialRampToValueAtTime(frequency * 0.985, now + 1.1);

  shimmer.type = "triangle";
  shimmer.frequency.setValueAtTime(frequency * 2.01, now);

  rumble.type = "sine";
  rumble.frequency.setValueAtTime(frequency / 2, now);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1180, now);
  filter.Q.setValueAtTime(5, now);

  delay.delayTime.setValueAtTime(0.19, now);
  feedback.gain.setValueAtTime(0.32, now);
  wetGain.gain.setValueAtTime(0.2, now);

  primaryGain.gain.setValueAtTime(0.0001, now);
  primaryGain.gain.exponentialRampToValueAtTime(0.23, now + 0.035);
  primaryGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);

  shimmerGain.gain.setValueAtTime(0.0001, now);
  shimmerGain.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
  shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);

  rumbleGain.gain.setValueAtTime(0.0001, now);
  rumbleGain.gain.exponentialRampToValueAtTime(0.04, now + 0.08);
  rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);

  output.gain.setValueAtTime(0.62, now);
  output.gain.exponentialRampToValueAtTime(0.0001, now + 1.55);

  primary.connect(primaryGain);
  shimmer.connect(shimmerGain);
  rumble.connect(rumbleGain);
  primaryGain.connect(filter);
  shimmerGain.connect(filter);
  rumbleGain.connect(filter);
  filter.connect(output);
  filter.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wetGain);
  wetGain.connect(output);
  output.connect(context.destination);

  primary.start(now);
  shimmer.start(now);
  rumble.start(now);
  primary.stop(now + 1.6);
  shimmer.stop(now + 1.6);
  rumble.stop(now + 1.6);
}

export default function FAQ() {
  const [activeSectionId, setActiveSectionId] =
    useState<FaqSectionId>("general");
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);
  const [faqRef, shouldLoadFaqAssets] = useDeferredFaqAssets<HTMLElement>();
  const faqBackgroundImage = useFaqResponsiveAsset(
    FAQ_BACKGROUND_IMAGE,
    FAQ_MOBILE_BACKGROUND_IMAGE,
  );
  const { motionLayerRef, handlePointerMove, handlePointerLeave } =
    useFaqMotion();
  const activeSection = useMemo(
    () => faqSections.find((section) => section.id === activeSectionId),
    [activeSectionId],
  );
  const questionStackRef = useStableFaqStack(activeSectionId);

  if (!activeSection) {
    return null;
  }

  return (
    <section
      ref={faqRef}
      className={styles.faq}
      aria-labelledby="faq-title"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div ref={motionLayerRef} className={styles.motionLayer}>
        <div
          className={styles.background}
          style={
            shouldLoadFaqAssets
              ? ({
                  "--faq-background-image": faqBackgroundImage,
                } as CSSProperties)
              : undefined
          }
          aria-hidden="true"
        />

        {floatingAssets.map((asset) => (
          <ParallaxAsset key={asset.className} asset={asset} />
        ))}
      </div>

      <div className={styles.atmosphereVeil} aria-hidden="true" />

      <div className={styles.content}>
        <div className={styles.categoryList} aria-label="FAQ sections">
          {faqSections.map((section) => (
            <GemstoneButton
              key={section.id}
              section={section}
              isActive={section.id === activeSectionId}
              onSelect={() => {
                setActiveSectionId(section.id);
                setOpenQuestion(null);
                playCaveNote(section.note);
              }}
            />
          ))}
        </div>

        <motion.div
          key={activeSection.id}
          ref={questionStackRef}
          className={styles.questionStack}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {activeSection.questions.map((item, index) => (
            <FaqQuestion
              key={item.question}
              item={item}
              isOpen={index === openQuestion}
              onToggle={() =>
                setOpenQuestion((currentQuestion) =>
                  currentQuestion === index ? null : index,
                )
              }
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export function FAQTitle({ className }: { className?: string }) {
  const [titleRef, shouldLoadSeparator] =
    useDeferredFaqAssets<HTMLDivElement>();
  const faqSeparatorImage = useFaqResponsiveAsset(
    FAQ_SEPARATOR_IMAGE,
    FAQ_MOBILE_SEPARATOR_IMAGE,
  );

  return (
    <div
      id="faq"
      ref={titleRef}
      className={className}
      style={
        shouldLoadSeparator
          ? ({ "--faq-separator-image": faqSeparatorImage } as CSSProperties)
          : undefined
      }
    >
      <AssetCredit
        className={styles.faqSeparatorCredit}
        label="Separator art by"
        credits={[
          {
            name: "Adrian Osorio",
            href: "https://www.linkedin.com/in/adrianosoriob/",
          },
        ]}
      >
        <span aria-hidden="true" />
      </AssetCredit>
      <motion.h2
        id="faq-title"
        className={styles.dividerTitle}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.45 }}
        transition={{ duration: 0.65, ease: "easeOut" }}
      >
        FA<span className={styles.dividerTitleQ}>Q</span>
      </motion.h2>
    </div>
  );
}

function ParallaxAsset({ asset }: { asset: FloatingAsset }) {
  return (
    <div
      className={`${styles.floatingAsset} ${asset.className}`}
      style={
        {
          "--faq-layer-depth-x": asset.depth,
          "--faq-layer-depth-y": asset.depth * 0.55,
        } as CSSProperties
      }
      aria-hidden={asset.hotspots ? undefined : true}
    >
      <Image
        src={asset.src}
        alt={asset.alt}
        width={asset.width}
        height={asset.height}
      />
      {asset.hotspots?.map((hotspot) => (
        <button
          key={hotspot.id}
          type="button"
          className={styles.gemHotspot}
          style={
            {
              left: `${hotspot.x}%`,
              top: `${hotspot.y}%`,
              width: `${hotspot.width}%`,
              height: `${hotspot.height}%`,
              "--hotspot-shape": hotspot.clipPath,
            } as CSSProperties
          }
          aria-label={hotspot.label}
          onClick={() => playCaveNote(hotspot.note)}
        />
      ))}
    </div>
  );
}

function useStableFaqStack(activeSectionId: FaqSectionId) {
  const questionStackRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const questionStack = questionStackRef.current;

    if (!questionStack) {
      return;
    }

    let measurementFrame = 0;
    let measuredWidth = questionStack.getBoundingClientRect().width;

    const lockRestingHeight = () => {
      // Measure without the lock, then remove the open answer's contribution so
      // a resize while expanded still preserves the collapsed stack height.
      questionStack.dataset.heightLocked = "false";

      const expandedHeight = questionStack.getBoundingClientRect().height;
      const answer = questionStack.querySelector<HTMLElement>(
        `.${styles.answerWrap}`,
      );
      const answerStyle = answer ? window.getComputedStyle(answer) : null;
      const answerContribution = answer
        ? answer.getBoundingClientRect().height +
          Number.parseFloat(answerStyle?.marginTop ?? "0") +
          Number.parseFloat(answerStyle?.marginBottom ?? "0")
        : 0;
      const restingHeight = Math.max(0, expandedHeight - answerContribution);

      questionStack.style.setProperty(
        "--faq-resting-stack-height",
        `${restingHeight}px`,
      );
      questionStack.dataset.heightLocked = "true";
    };

    const scheduleMeasurement = () => {
      window.cancelAnimationFrame(measurementFrame);
      measurementFrame = window.requestAnimationFrame(lockRestingHeight);
    };

    lockRestingHeight();

    const resizeObserver = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0;

      if (Math.abs(width - measuredWidth) < 0.5) {
        return;
      }

      measuredWidth = width;
      scheduleMeasurement();
    });

    resizeObserver.observe(questionStack);

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(measurementFrame);
    };
  }, [activeSectionId]);

  return questionStackRef;
}

function GemstoneButton({
  section,
  isActive,
  onSelect,
}: {
  section: (typeof faqSections)[number];
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.gemButton}
      data-active={isActive}
      onClick={onSelect}
      aria-pressed={isActive}
    >
      <Image
        src={
          isActive
            ? "https://assets.knighthacks.org/khix/faq-selection-selected-faq-rock.png"
            : "https://assets.knighthacks.org/khix/faq-selection-faq-rock.png"
        }
        alt=""
        width={364}
        height={202}
        className={styles.gemImage}
      />
      <span>{section.label}</span>
    </button>
  );
}

function FaqQuestion({
  item,
  isOpen,
  onToggle,
}: {
  item: (typeof faqSections)[number]["questions"][number];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={styles.questionItem}>
      <button
        type="button"
        className={styles.questionButton}
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <Image
          src="https://assets.knighthacks.org/khix/faq-question-rock-cut.png"
          alt=""
          width={1034}
          height={140}
          className={styles.questionRock}
        />
        <span>{item.question}</span>
      </button>

      <AnimatePresence initial={false}>
        {/* Transforming text-bearing layers produces glyph artifacts in iOS
            Safari, so the rock reveal animates by clipping its height only. */}
        {isOpen ? (
          <motion.div
            className={styles.answerWrap}
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={styles.answerRock}>
              <Image
                src="https://assets.knighthacks.org/khix/faq-answer-rock-cut.webp"
                alt=""
                width={1066}
                height={376}
                className={styles.answerRockImage}
              />
              <p>{item.answer}</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
