"use client";

import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info,
  Loader2,
  Search,
  Send,
} from "lucide-react";

import type { ApplicationFieldName } from "@forge/hackathon";
import type { HackerApplicationFormValues } from "@forge/hackathon/client";
import { FORMS } from "@forge/consts";
import { APPLICATION_STEPS } from "@forge/hackathon";
import { useHackerApplicationFlow } from "@forge/hackathon/client";
import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "@forge/ui/form";
import { Input } from "@forge/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@forge/ui/popover";
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";

import type { ApplicationVisualConfig } from "./hackbackgrounds/types";
import {
  getHackerApplicationBackground,
  getHackerApplicationBackgroundKey,
} from "./hackbackgrounds";
import { HackerApplicationBackground } from "./hacker-application-background";

const fieldTriggerClassName =
  "h-12 overflow-hidden rounded-none border-x-0 border-b-2 border-t-0 border-white/75 bg-transparent px-0 text-left text-lg font-medium text-white shadow-none transition-colors hover:border-white hover:bg-transparent hover:text-white focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[placeholder]:text-white/35 [&>span]:block [&>span]:max-w-[calc(100%-2rem)] [&>span]:truncate [&>svg]:text-white/55 sm:h-14 sm:text-xl md:text-2xl";
const fieldLabelClassName =
  "text-base font-semibold leading-none text-white/85 md:text-lg";
const optionalTextClassName =
  "ml-2 text-sm font-medium italic text-white/45 md:text-base";
const requiredMarkClassName =
  "text-xl font-semibold text-[#ff4fd8] drop-shadow-[0_0_10px_rgba(255,79,216,0.85)] md:text-2xl";
const checkboxClassName =
  "mt-0.5 flex h-5 w-5 items-center justify-center border-white/45 bg-white/5 text-white shadow-none data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-[#21103d] focus-visible:ring-white/40 [&>span>svg]:h-5 [&>span>svg]:w-5";
const checkboxLabelClassName =
  "text-sm font-medium leading-relaxed text-white/75";
const firstTimeCheckboxLabelClassName =
  "text-sm font-semibold leading-relaxed text-white/85";
const agreementErrorRowClassName =
  "rounded-md bg-[#ff2f6d]/14 px-3 py-3 ring-1 ring-[#ff6f9a]/55 shadow-[0_0_30px_rgba(255,47,109,0.22)]";
const agreementErrorCheckboxClassName =
  "border-[#ff8aaa] bg-[#ff2f6d]/25 text-white shadow-[0_0_0_4px_rgba(255,111,154,0.24),0_0_24px_rgba(255,47,109,0.45)]";
const agreementErrorLabelClassName =
  "text-[#ffd3df] drop-shadow-[0_1px_5px_rgba(0,0,0,0.85)]";
const agreementErrorMessageClassName =
  "mt-2 text-sm font-semibold tracking-wide text-[#ffadc3] drop-shadow-[0_1px_5px_rgba(0,0,0,0.9)] md:text-base";
const agreementLinkClassName =
  "font-medium text-white underline underline-offset-4 decoration-white/35 transition-colors hover:text-white/80 hover:decoration-white";
const actionButtonClassName =
  "kh-nav-button size-14 rounded-full bg-white p-0 text-[#21103d] shadow-[0_18px_46px_rgba(0,0,0,0.42)] hover:bg-white/90 sm:size-16";
const secondaryActionButtonClassName =
  "kh-nav-button size-14 rounded-full border-white/45 bg-[#12071f]/75 p-0 text-white shadow-[0_18px_46px_rgba(0,0,0,0.42)] hover:bg-[#12071f]/90 hover:text-white disabled:opacity-35 sm:size-16";
const resumeSponsorDisclosure =
  "Uploaded resumes will be shared with sponsors for potential internships and outreach.";
const DEFAULT_TEXT_EXIT_MS = 420;
const DEFAULT_TEXT_ENTER_MS = 560;
const DEFAULT_PANEL_ENTER_DELAY_MS = 50;
const HOLD_SKIP_READY_MS = 680;
const HOLD_SKIP_STEP_TRANSITION_MS = 620;
const HOLD_SKIP_QUESTION_TRANSITION_MS = 260;
const HOLD_SKIP_TEXT_EXIT_MS = 260;
const HOLD_SKIP_TEXT_ENTER_MS = 360;
const HOLD_SKIP_PANEL_ENTER_DELAY_MS = 30;
type ApplicationStepId = (typeof APPLICATION_STEPS)[number]["id"];
type StepDirection = "forward" | "back";

interface ApplicationTransitionTiming {
  panelEnterDelayMs: number;
  questionTransitionMs: number;
  stepTransitionMs: number;
  textEnterDurationMs: number;
  textExitDurationMs: number;
}

const khixApplicationStepCopy = {
  profile: {
    eyebrow: "Start",
    title: "Your name",
  },
  contact: {
    eyebrow: "Contact",
    title: "Contact info",
  },
  identity: {
    eyebrow: "Profile",
    title: "About you",
  },
  education: {
    eyebrow: "Education",
    title: "School details",
  },
  application: {
    eyebrow: "Application",
    title: "Short answers",
  },
  links: {
    eyebrow: "Portfolio",
    title: "Links and resume",
  },
  event: {
    eyebrow: "Event",
    title: "Event details",
  },
  tosAccepted: {
    eyebrow: "Finalize",
    title: "Final agreements",
  },
} satisfies Record<ApplicationStepId, { eyebrow: string; title: string }>;

const applicationAnimationStyles = `
@keyframes khLightSweep {
  0%, 58%, 100% { transform: translateX(-120%) skewX(-12deg); opacity: 0; }
  12% { opacity: 0.48; }
  34% { transform: translateX(120%) skewX(-12deg); opacity: 0; }
}

@keyframes khGridFloat {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-42px, 42px, 0); }
}

@keyframes khUnderlinePulse {
  0%, 100% { box-shadow: 0 8px 26px rgba(255, 255, 255, 0); }
  50% { box-shadow: 0 10px 34px rgba(255, 255, 255, 0.14); }
}

@keyframes khSubmitLoadingIn {
  from { opacity: 0; transform: translate3d(0, 8px, 0) scale(0.98); }
  to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}

@keyframes khTextSequenceExit {
  from {
    opacity: 1;
    transform: translate3d(0, 0, 0);
    filter: blur(0);
  }

  to {
    opacity: 0;
    transform: translate3d(var(--kh-application-text-exit-x, -1.1rem), -0.2rem, 0);
    filter: blur(8px);
  }
}

@keyframes khTextSequenceEnter {
  from {
    opacity: 0;
    transform: translate3d(var(--kh-application-text-enter-x, 1.1rem), 0.35rem, 0);
    filter: blur(8px);
  }

  72% {
    filter: blur(1px);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
    filter: blur(0);
  }
}

@keyframes khApplicationIntroVeilRelease {
  from {
    opacity: 1;
    background: #020302;
  }

  to {
    opacity: 0;
    background: #020302;
    visibility: hidden;
  }
}

@keyframes khApplicationIntroLogoArrive {
  from {
    opacity: 0;
    transform: translate3d(-50%, calc(-50% + 0.7rem), 0) scale(0.94);
    filter: blur(8px) drop-shadow(0 0 0 rgba(245, 255, 231, 0));
  }

  to {
    opacity: 1;
    transform: translate3d(-50%, -50%, 0) scale(1);
    filter: blur(0) drop-shadow(0 0 22px rgba(245, 255, 231, 0.2));
  }
}

@keyframes khApplicationIntroLogoExit {
  from {
    opacity: 1;
    transform: translate3d(-50%, -50%, 0) scale(1);
    filter: blur(0) drop-shadow(0 0 22px rgba(245, 255, 231, 0.2));
  }

  to {
    opacity: 0;
    transform: translate3d(-50%, calc(-50% - 0.55rem), 0) scale(1.035);
    filter: blur(8px) drop-shadow(0 0 34px rgba(245, 255, 231, 0));
  }
}

@keyframes khSubmittedScreenIn {
  from { opacity: 0; transform: translate3d(0, 10px, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}

@keyframes khSubmittedMarkPop {
  0% { opacity: 0; transform: translate3d(0, 8px, 0) scale(0.88); }
  58% { opacity: 1; transform: translate3d(0, 0, 0) scale(1.08); }
  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}

@keyframes khSubmittedContentIn {
  from { opacity: 0; transform: translate3d(0, 10px, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}

.kh-application-sweep {
  background: linear-gradient(110deg, transparent 0%, transparent 32%, rgba(255,255,255,0.13) 48%, transparent 64%, transparent 100%);
  animation: khLightSweep 8s ease-in-out infinite;
  mix-blend-mode: screen;
}

.kh-application-grid {
  background-image:
    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
  background-size: 42px 42px;
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 18%, black 82%, transparent);
  mask-image: linear-gradient(to bottom, transparent, black 18%, black 82%, transparent);
  animation: khGridFloat 26s linear infinite;
}

.kh-step-title {
  text-wrap: balance;
}

.kh-submit-loading {
  animation: khSubmitLoadingIn 180ms ease-out both;
}

.kh-submitted-screen {
  animation: khSubmittedScreenIn 220ms ease-out both;
}

.kh-submitted-mark {
  animation: khSubmittedMarkPop 360ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.kh-submitted-copy {
  animation: khSubmittedContentIn 280ms cubic-bezier(0.22, 1, 0.36, 1) 45ms both;
}

.kh-submitted-action {
  animation: khSubmittedContentIn 260ms cubic-bezier(0.22, 1, 0.36, 1) 90ms both;
}

.kh-submitted-screen .kh-step-title {
  animation: none;
}

.kh-readable-text {
  text-shadow:
    0 2px 18px rgba(0, 0, 0, 0.55),
    0 1px 2px rgba(0, 0, 0, 0.55);
}

.kh-application-intro-veil {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  background: #020302;
  opacity: 1;
  pointer-events: auto;
  will-change: opacity;
}

.kh-application-intro-veil::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: clamp(11.5rem, 32vw, 24rem);
  aspect-ratio: 1858.27 / 666;
  background-image: url("https://assets.knighthacks.org/khix/khlogo.svg");
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  animation: khApplicationIntroLogoArrive 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
  will-change: opacity, transform, filter;
}

.kh-application-intro-veil[data-intro-ready="true"] {
  animation: khApplicationIntroVeilRelease 620ms linear 120ms both;
}

.kh-application-intro-veil[data-intro-ready="true"]::before {
  animation: khApplicationIntroLogoExit 280ms cubic-bezier(0.4, 0, 1, 1) both;
}

.kh-application-step-meta,
.kh-application-prefill-note,
.kh-application-panel {
  will-change: opacity, transform, filter;
}

.kh-readable-text[data-text-sequence="exit"] .kh-application-step-meta,
.kh-readable-text[data-text-sequence="exit"] .kh-application-prefill-note,
.kh-readable-text[data-text-sequence="exit"] .kh-application-panel {
  animation: khTextSequenceExit var(--kh-application-text-exit-duration, 420ms) cubic-bezier(0.4, 0, 0.2, 1) both;
  pointer-events: none;
}

.kh-readable-text[data-text-sequence="enter"] .kh-application-step-meta,
.kh-readable-text[data-text-sequence="enter"] .kh-application-prefill-note,
.kh-readable-text[data-text-sequence="enter"] .kh-application-panel {
  animation: khTextSequenceEnter var(--kh-application-text-enter-duration, 560ms) cubic-bezier(0.22, 1, 0.36, 1) both;
}

.kh-readable-text[data-text-sequence="enter"] .kh-application-panel {
  animation-delay: var(--kh-application-panel-enter-delay, 50ms);
}

.kh-step-content :is(input, textarea, button:not(.kh-resume-info-trigger)):focus-visible {
  animation: khUnderlinePulse 1.8s ease-in-out infinite;
}

.kh-resume-info-row {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  flex-wrap: wrap;
}

.kh-resume-info-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.82);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease;
}

.kh-resume-info-trigger:hover,
.kh-resume-info-trigger:focus-visible,
.kh-resume-info-trigger[data-state="open"] {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.72);
  color: white;
}

.kh-resume-info-trigger:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.72);
  outline-offset: 3px;
}

.kh-resume-info-popover {
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(18, 7, 31, 0.96);
  color: rgba(255, 255, 255, 0.88);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(18px);
}

.kh-nav-button {
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    opacity 220ms ease,
    filter 220ms ease,
    background-color 180ms ease,
    border-color 180ms ease;
  overflow: visible;
  position: relative;
}

.kh-nav-button::after {
  border: 1.5px solid rgba(142, 146, 140, 0.96);
  border-radius: inherit;
  box-shadow:
    0 0 0.18rem rgba(118, 122, 116, 0.28),
    0 0 0.62rem rgba(118, 122, 116, 0.28);
  content: "";
  inset: -0.46rem;
  opacity: 1;
  pointer-events: none;
  position: absolute;
}

.kh-nav-button[data-transitioning="true"] {
  cursor: progress;
}

.kh-nav-button[data-hold-skip="true"]::before {
  border-radius: inherit;
  content: "";
  inset: -0.46rem;
  pointer-events: none;
  position: absolute;
}

.kh-nav-button[data-hold-skip="true"]::before {
  background: conic-gradient(
    from -90deg,
    rgba(83, 255, 159, 1) var(--kh-hold-skip-angle, 0deg),
    transparent 0deg
  );
  opacity: 0;
  padding: 4px;
  transition:
    opacity 160ms ease,
    padding 160ms ease;
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

.kh-nav-button[data-hold-active="true"]::before {
  opacity: 1;
  padding: 4px;
}

.kh-nav-button[data-hold-active="true"]::after {
  border-color: rgba(142, 146, 140, 0.96);
  box-shadow:
    0 0 0.18rem rgba(118, 122, 116, 0.28),
    0 0 0.62rem rgba(118, 122, 116, 0.28);
  opacity: 1;
}

.kh-nav-button:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.04);
  box-shadow: 0 22px 54px rgba(0, 0, 0, 0.5);
}

.kh-nav-button:active:not(:disabled) {
  transform: translateY(0) scale(0.96);
}

.kh-nav-button[data-transitioning="true"]:hover,
.kh-nav-button[data-transitioning="true"]:active {
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.42);
}

.kh-application-form {
  height: 100svh;
  min-height: 100svh;
  overflow: hidden;
}

.kh-application-shell {
  font-family: var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.kh-application-nav {
  inset-inline: 1.25rem;
  bottom: calc(1.25rem + env(safe-area-inset-bottom, 0px));
  z-index: 40;
}

@media (min-width: 768px) {
  .kh-application-nav {
    inset-inline: 4rem;
    bottom: 2.5rem;
  }
}

@media (max-width: 767px) {
  .kh-application-form {
    height: 100svh;
    height: 100dvh;
    min-height: 100svh;
  }

  .kh-application-shell {
    height: 100%;
    min-height: 100%;
  }

  .kh-application-shell .kh-readable-text {
    height: 100%;
    min-height: 100%;
    padding-top: calc(1.25rem + env(safe-area-inset-top, 0px));
    padding-bottom: calc(7.25rem + env(safe-area-inset-bottom, 0px));
  }

  .kh-application-stage {
    padding-top: clamp(1.5rem, 3.4vh, 2rem);
    padding-bottom: clamp(1.25rem, 3vh, 1.75rem);
  }

  .kh-application-nav {
    bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  }
}

@media (orientation: landscape) and (max-height: 560px) {
  .kh-readable-text {
    min-height: 100svh;
    padding-block: 0.75rem calc(4.75rem + env(safe-area-inset-bottom, 0px));
    padding-inline: max(1rem, env(safe-area-inset-left, 0px)) max(1rem, env(safe-area-inset-right, 0px));
  }

  .kh-readable-text > div:first-child {
    font-size: 0.7rem;
  }

  .kh-application-stage {
    align-items: center;
    padding-block: 0.25rem;
  }

  .kh-application-panel {
    max-width: min(44rem, 70vw);
  }

  .kh-step-title {
    font-size: clamp(2.75rem, 15vh, 4.5rem);
    line-height: 0.9;
  }

  .kh-step-content {
    margin-top: clamp(0.75rem, 3vh, 1.25rem);
  }

  .kh-step-content :is(input, button) {
    min-height: 0;
    height: clamp(2.25rem, 9vh, 2.75rem);
    font-size: clamp(1rem, 4.4vh, 1.35rem);
  }

  .kh-step-content textarea {
    min-height: clamp(4.75rem, 30vh, 7rem);
    font-size: clamp(1rem, 4.4vh, 1.35rem);
  }

  .kh-step-content label {
    font-size: clamp(0.95rem, 3.8vh, 1.15rem);
  }

  .kh-application-nav {
    inset-inline: max(1rem, env(safe-area-inset-left, 0px)) max(1rem, env(safe-area-inset-right, 0px));
    bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
  }

  .kh-application-nav .kh-nav-button {
    width: clamp(3.15rem, 12vh, 3.75rem);
    height: clamp(3.15rem, 12vh, 3.75rem);
  }

  .kh-application-nav .kh-nav-button::after,
  .kh-application-nav .kh-nav-button[data-hold-skip="true"]::before {
    inset: -0.52rem;
  }
}

@media (orientation: landscape) and (max-height: 430px) {
  .kh-readable-text {
    padding-block: 0.6rem calc(4.15rem + env(safe-area-inset-bottom, 0px));
  }

  .kh-application-panel {
    max-width: min(40rem, 68vw);
  }

  .kh-step-title {
    font-size: clamp(2.35rem, 14vh, 3.65rem);
  }

  .kh-step-content {
    margin-top: 0.65rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .kh-application-sweep,
  .kh-application-grid,
  .kh-application-intro-veil,
  .kh-readable-text[data-text-sequence="exit"] .kh-application-step-meta,
  .kh-readable-text[data-text-sequence="exit"] .kh-application-prefill-note,
  .kh-readable-text[data-text-sequence="exit"] .kh-application-panel,
  .kh-readable-text[data-text-sequence="enter"] .kh-application-step-meta,
  .kh-readable-text[data-text-sequence="enter"] .kh-application-prefill-note,
  .kh-readable-text[data-text-sequence="enter"] .kh-application-panel,
  .kh-submit-loading,
  .kh-submitted-mark,
  .kh-submitted-screen,
  .kh-submitted-copy,
  .kh-submitted-action,
  .kh-step-content :is(input, textarea, button):focus-visible {
    animation: none;
  }

  .kh-nav-button {
    transition: none;
  }

  .kh-nav-button[data-transitioning="true"] {
    animation: none;
  }

  .kh-application-intro-veil {
    display: none;
  }
}
`;

const MOBILE_ENTER_IGNORED_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "file",
  "hidden",
  "radio",
  "reset",
  "search",
  "submit",
]);

function FieldLabel({
  children,
  optional = false,
  required = false,
}: {
  children: ReactNode;
  optional?: boolean;
  required?: boolean;
}) {
  return (
    <FormLabel className={fieldLabelClassName}>
      {children}
      {required && <span className={requiredMarkClassName}> *</span>}
      {optional && <span className={optionalTextClassName}>Optional</span>}
    </FormLabel>
  );
}

function ResumeInfoPopover({ visualKey }: { visualKey: string }) {
  const [open, setOpen] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current === null) return;
    window.clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = null;
  };

  const openInfo = () => {
    clearCloseTimeout();
    setOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = window.setTimeout(() => {
      setOpen(false);
      closeTimeoutRef.current = null;
    }, 140);
  };

  useEffect(
    () => () => {
      if (closeTimeoutRef.current === null) return;
      window.clearTimeout(closeTimeoutRef.current);
    },
    [],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Resume sharing information"
          className="kh-resume-info-trigger"
          onBlur={scheduleClose}
          onFocus={openInfo}
          onMouseEnter={openInfo}
          onMouseLeave={scheduleClose}
        >
          <Info aria-hidden="true" className="h-4 w-4" strokeWidth={2.4} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={10}
        className="kh-resume-info-popover w-[min(18rem,calc(100vw-2rem))] rounded-lg px-3.5 py-3 text-sm font-medium leading-relaxed"
        data-application-visual={visualKey}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
        }}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
        }}
        onMouseEnter={openInfo}
        onMouseLeave={scheduleClose}
      >
        {resumeSponsorDisclosure}
      </PopoverContent>
    </Popover>
  );
}

function getComboBoxDisplayValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function getApplicationVisualFallbackKey(hackathonId: string) {
  return getHackerApplicationBackgroundKey(hackathonId);
}

function shouldUseMobileEnterNavigation() {
  if (typeof window === "undefined") return false;

  return (
    window.navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(hover: none)").matches
  );
}

function getApplicationVisualMobileTimingQuery(maxWidth = 640) {
  return `(max-width: ${maxWidth}px)`;
}

function useMobileApplicationVisualTiming(maxWidth?: number) {
  const [usesMobileTiming, setUsesMobileTiming] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      getApplicationVisualMobileTimingQuery(maxWidth),
    );
    const updateMobileTiming = () => {
      setUsesMobileTiming(mediaQuery.matches);
    };

    updateMobileTiming();
    mediaQuery.addEventListener("change", updateMobileTiming);

    return () => {
      mediaQuery.removeEventListener("change", updateMobileTiming);
    };
  }, [maxWidth]);

  return usesMobileTiming;
}

function getApplicationIntroPreloadSources(
  visualConfig: ApplicationVisualConfig,
) {
  const sources = new Set<string>();

  sources.add("https://assets.knighthacks.org/khix/khlogo.svg");

  for (const layer of visualConfig.layers ?? []) {
    if (layer.kind !== "image") continue;

    if (layer.src) sources.add(layer.src);
    if (layer.idleSrc) sources.add(layer.idleSrc);

    for (const source of layer.sources ?? []) {
      sources.add(source.src);
    }

    for (const frameSrc of layer.animatedFrameSrcs ?? []) {
      sources.add(frameSrc);
    }
  }

  return [...sources];
}

function preloadApplicationIntroImage(src: string) {
  return new Promise<void>((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;

    if (image.complete) {
      resolve();
    }
  });
}

function getKeyboardFieldTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLInputElement)) return null;

  if (MOBILE_ENTER_IGNORED_INPUT_TYPES.has(target.type)) return null;
  if (!target.name) return null;
  if (target.closest("[cmdk-input-wrapper]")) return null;

  return target;
}

function focusFieldByName(fieldName: ApplicationFieldName) {
  const fieldElement = document.querySelector<HTMLElement>(
    `[name="${fieldName}"]`,
  );

  if (!fieldElement) return false;

  window.requestAnimationFrame(() => {
    fieldElement.focus({ preventScroll: true });
    fieldElement.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: "smooth",
    });

    if (
      fieldElement instanceof HTMLInputElement &&
      typeof fieldElement.setSelectionRange === "function" &&
      ["email", "tel", "text", "url"].includes(fieldElement.type)
    ) {
      const cursorPosition = fieldElement.value.length;
      fieldElement.setSelectionRange(cursorPosition, cursorPosition);
    }
  });

  return true;
}

export function HackerFormPage({
  applicationBackgroundKey,
  hackathonId,
  hackathonName,
  hackathonStartDate,
}: {
  applicationBackgroundKey?: string | null;
  hackathonId: string;
  hackathonName: string;
  hackathonStartDate: string;
}) {
  const router = useRouter();
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [allergySearch, setAllergySearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [isApplicationIntroReady, setIsApplicationIntroReady] = useState(false);
  const [activeTransitionTiming, setActiveTransitionTiming] =
    useState<ApplicationTransitionTiming | null>(null);
  const [holdSkipProgress, setHoldSkipProgress] = useState(0);
  const [isHoldSkipActive, setIsHoldSkipActive] = useState(false);
  const [isHoldSkipPending, setIsHoldSkipPending] = useState(false);
  const [isHoldSkipContinuous, setIsHoldSkipContinuous] = useState(false);
  const [holdSkipDirection, setHoldSkipDirection] =
    useState<StepDirection | null>(null);
  const pendingMobileFocusField = useRef<ApplicationFieldName | null>(null);
  const prefillAppliedRef = useRef(false);
  const existingApplicationRedirectedRef = useRef(false);
  const holdSkipFrameRef = useRef<number | null>(null);
  const holdSkipStartedAtRef = useRef<number | null>(null);
  const holdSkipActivatedRef = useRef(false);
  const holdSkipContinuousRef = useRef(false);
  const holdSkipPointerIdRef = useRef<number | null>(null);
  const holdSkipDirectionRef = useRef<StepDirection | null>(null);
  const {
    activeStep,
    applicationContext,
    applicationPrefill,
    applicationSchema,
    applicationSubmitted,
    defaultValues,
    hasHydrated,
    isStepTransitioning,
    setActiveStep,
    setApplicationSubmitted,
    setIsStepTransitioning,
    setStepDirection,
    setTosAccepted,
    setTosError,
    setTransitionStep,
    stepDirection,
    submitApplication,
    tosAccepted,
    tosError,
    transitionStep,
    uploadResume,
  } = useHackerApplicationFlow({ hackathonStartDate });
  const applicationVisualBackgroundKey =
    getHackerApplicationBackgroundKey(applicationBackgroundKey) ??
    getApplicationVisualFallbackKey(hackathonId);
  const applicationVisualConfig = getHackerApplicationBackground(
    applicationVisualBackgroundKey,
  );
  const usesMobileVisualTiming = useMobileApplicationVisualTiming(
    applicationVisualConfig.mobileTimingMaxWidth,
  );
  const applicationVisualKey = applicationVisualConfig.key;
  const applicationStyles = `${applicationAnimationStyles}\n${applicationVisualConfig.styles ?? ""}`;
  const baseStepTransitionMs = usesMobileVisualTiming
    ? (applicationVisualConfig.mobileStepTransitionMs ??
      applicationVisualConfig.stepTransitionMs ??
      0)
    : (applicationVisualConfig.stepTransitionMs ?? 0);
  const baseQuestionTransitionMs = usesMobileVisualTiming
    ? (applicationVisualConfig.mobileQuestionTransitionMs ??
      applicationVisualConfig.questionTransitionMs ??
      baseStepTransitionMs)
    : (applicationVisualConfig.questionTransitionMs ?? baseStepTransitionMs);

  const previousHacker = applicationContext?.previousHacker;
  const existingApplication = applicationContext?.existingApplication;

  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies((prev) => {
      const next = prev.includes(allergy)
        ? prev.filter((a) => a !== allergy)
        : [...prev, allergy];

      form.setValue("foodAllergies", next.join(","));
      return next;
    });
  };

  const form = useForm<HackerApplicationFormValues>({
    schema: applicationSchema,
    defaultValues,
  });

  const fileRef = form.register("resumeUpload");

  useEffect(() => {
    if (
      applicationSubmitted ||
      !existingApplication ||
      existingApplicationRedirectedRef.current
    ) {
      return;
    }

    existingApplicationRedirectedRef.current = true;
    toast.info("You already submitted an application for this hackathon.");
    router.replace("/dashboard");
    router.refresh();
  }, [applicationSubmitted, existingApplication, hackathonId, router]);

  useEffect(() => {
    if (applicationSubmitted) return;

    let isCancelled = false;
    let introFrame: number | null = null;
    const preloadSources = getApplicationIntroPreloadSources(
      applicationVisualConfig,
    );

    const minimumHold = new Promise<void>((resolve) => {
      window.setTimeout(resolve, 520);
    });
    const maximumHold = new Promise<void>((resolve) => {
      window.setTimeout(resolve, 3000);
    });
    const preloadComplete = Promise.all(
      preloadSources.map(preloadApplicationIntroImage),
    ).then(() => undefined);

    void Promise.all([
      minimumHold,
      Promise.race([preloadComplete, maximumHold]),
    ]).then(() => {
      if (isCancelled) return;

      introFrame = window.requestAnimationFrame(() => {
        if (!isCancelled) {
          setIsApplicationIntroReady(true);
        }
      });
    });

    return () => {
      isCancelled = true;

      if (introFrame !== null) {
        window.cancelAnimationFrame(introFrame);
      }
    };
  }, [applicationSubmitted, applicationVisualConfig]);

  useEffect(() => {
    if (prefillAppliedRef.current || !applicationPrefill) return;

    form.reset({ ...defaultValues, ...applicationPrefill.values });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedAllergies(applicationPrefill.selectedAllergies);
    prefillAppliedRef.current = true;
  }, [applicationPrefill, defaultValues, form]);

  useEffect(() => {
    return () => {
      if (holdSkipFrameRef.current !== null) {
        window.cancelAnimationFrame(holdSkipFrameRef.current);
      }
    };
  }, []);

  // Convert a resume to base64 for client-server transmission
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Check type before resolving as string
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(
            new Error(
              "Failed to convert file to Base64: Unexpected result type",
            ),
          );
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const currentStep = APPLICATION_STEPS[activeStep] ?? APPLICATION_STEPS[0];
  const currentStepCopy = khixApplicationStepCopy[currentStep.id];
  const applicationIntroVisualActive = !applicationSubmitted;
  const defaultTransitionTiming = {
    panelEnterDelayMs: DEFAULT_PANEL_ENTER_DELAY_MS,
    questionTransitionMs: baseQuestionTransitionMs,
    stepTransitionMs: baseStepTransitionMs,
    textEnterDurationMs: DEFAULT_TEXT_ENTER_MS,
    textExitDurationMs: DEFAULT_TEXT_EXIT_MS,
  } satisfies ApplicationTransitionTiming;
  const holdSkipStepTransitionMs =
    baseStepTransitionMs > 0
      ? Math.min(baseStepTransitionMs, HOLD_SKIP_STEP_TRANSITION_MS)
      : baseStepTransitionMs;
  const holdSkipTransitionTiming = {
    panelEnterDelayMs: HOLD_SKIP_PANEL_ENTER_DELAY_MS,
    questionTransitionMs:
      holdSkipStepTransitionMs > 0
        ? Math.min(
            baseQuestionTransitionMs,
            HOLD_SKIP_QUESTION_TRANSITION_MS,
            holdSkipStepTransitionMs,
          )
        : baseQuestionTransitionMs,
    stepTransitionMs: holdSkipStepTransitionMs,
    textEnterDurationMs: HOLD_SKIP_TEXT_ENTER_MS,
    textExitDurationMs: HOLD_SKIP_TEXT_EXIT_MS,
  } satisfies ApplicationTransitionTiming;
  const transitionTiming = activeTransitionTiming ?? defaultTransitionTiming;
  const {
    panelEnterDelayMs,
    questionTransitionMs,
    stepTransitionMs,
    textEnterDurationMs,
    textExitDurationMs,
  } = transitionTiming;
  const isActiveQuestion = (id: string) =>
    currentStep.id === id ||
    currentStep.fields.some((fieldName) => fieldName === id);
  const isFinalStep = activeStep === APPLICATION_STEPS.length - 1;
  const progressStep = transitionStep ?? activeStep;
  const progressRatio = progressStep / (APPLICATION_STEPS.length - 1);
  const textSequenceState =
    isStepTransitioning && transitionStep !== null
      ? activeStep === transitionStep
        ? "enter"
        : "exit"
      : "idle";
  const textSequenceStyle = {
    "--kh-application-text-enter-x":
      stepDirection === "forward" ? "1.1rem" : "-1.1rem",
    "--kh-application-text-exit-x":
      stepDirection === "forward" ? "-1.1rem" : "1.1rem",
    "--kh-application-text-enter-duration": `${textEnterDurationMs}ms`,
    "--kh-application-text-exit-duration": `${textExitDurationMs}ms`,
    "--kh-application-panel-enter-delay": `${panelEnterDelayMs}ms`,
  } as CSSProperties;
  const backButtonUnavailable =
    activeStep === 0 || loading || isHoldSkipPending;
  const backButtonTransitioning = isStepTransitioning && !loading;
  const forwardButtonUnavailable = loading || isHoldSkipPending;
  const forwardButtonTransitioning = isStepTransitioning && !loading;
  const backButtonDisabled = backButtonUnavailable || backButtonTransitioning;
  const forwardButtonDisabled =
    forwardButtonUnavailable || forwardButtonTransitioning;
  const submitButtonTransitioning = isStepTransitioning && !loading;
  const submitButtonDisabled = loading || submitButtonTransitioning;
  const backButtonNativeDisabled = hasHydrated && backButtonUnavailable;
  const forwardButtonNativeDisabled = hasHydrated && forwardButtonUnavailable;
  const submitButtonNativeDisabled = hasHydrated && submitButtonDisabled;
  const canHoldSkipBack =
    hasHydrated &&
    activeStep > 0 &&
    !backButtonUnavailable &&
    !backButtonTransitioning;
  const canContinueHoldSkipBack =
    isHoldSkipContinuous && holdSkipDirection === "back" && activeStep > 0;
  const canHoldSkipForward =
    hasHydrated &&
    !isFinalStep &&
    !forwardButtonUnavailable &&
    !forwardButtonTransitioning;
  const canContinueHoldSkipForward =
    isHoldSkipContinuous && holdSkipDirection === "forward" && !isFinalStep;
  const holdSkipStyle =
    canHoldSkipBack ||
    canHoldSkipForward ||
    canContinueHoldSkipBack ||
    canContinueHoldSkipForward
      ? ({
          "--kh-hold-skip-angle": `${Math.round(holdSkipProgress * 360)}deg`,
        } as CSSProperties)
      : undefined;

  const goToStep = useCallback(
    async (
      nextStep: number,
      options?: { transitionTiming?: ApplicationTransitionTiming },
    ) => {
      const boundedNextStep = Math.min(
        Math.max(nextStep, 0),
        APPLICATION_STEPS.length - 1,
      );

      if (!hasHydrated) return false;
      if (loading) return false;
      if (boundedNextStep === activeStep || isStepTransitioning) return false;

      if (nextStep > activeStep) {
        const isStepValid = await form.trigger(
          currentStep.fields as Parameters<typeof form.trigger>[0],
          { shouldFocus: true },
        );

        if (!isStepValid) return false;

        if (currentStep.id === "tosAccepted" && !tosAccepted) {
          setTosError(true);
          return false;
        }

        if (currentStep.id === "tosAccepted") {
          setTosError(false);
        }
      }

      setStepDirection(boundedNextStep > activeStep ? "forward" : "back");

      const requestedTransitionTiming =
        options?.transitionTiming ?? transitionTiming;

      if (requestedTransitionTiming.stepTransitionMs <= 0) {
        setActiveTransitionTiming(null);
        setActiveStep(boundedNextStep);
        return true;
      }

      setActiveTransitionTiming(requestedTransitionTiming);
      setTransitionStep(boundedNextStep);
      setIsStepTransitioning(true);
      return true;
    },
    [
      activeStep,
      currentStep.fields,
      currentStep.id,
      form,
      hasHydrated,
      isStepTransitioning,
      loading,
      setActiveStep,
      setIsStepTransitioning,
      setStepDirection,
      setTosError,
      setTransitionStep,
      tosAccepted,
      transitionTiming,
    ],
  );

  const cancelHoldSkip = () => {
    if (holdSkipFrameRef.current !== null) {
      window.cancelAnimationFrame(holdSkipFrameRef.current);
      holdSkipFrameRef.current = null;
    }

    holdSkipStartedAtRef.current = null;
    holdSkipPointerIdRef.current = null;
    holdSkipDirectionRef.current = null;
    holdSkipContinuousRef.current = false;
    setIsHoldSkipActive(false);
    setIsHoldSkipContinuous(false);
    setHoldSkipDirection(null);
    setHoldSkipProgress(0);
  };

  const completeHoldSkip = () => {
    if (holdSkipActivatedRef.current) return;

    const direction = holdSkipDirectionRef.current;
    if (!direction) return;

    holdSkipActivatedRef.current = true;
    holdSkipContinuousRef.current = true;
    setIsHoldSkipActive(true);
    setIsHoldSkipContinuous(true);
    setHoldSkipDirection(direction);
    setHoldSkipProgress(1);
    setIsHoldSkipPending(true);

    void goToStep(activeStep + (direction === "forward" ? 1 : -1), {
      transitionTiming: holdSkipTransitionTiming,
    }).then((didAdvance) => {
      if (!didAdvance) {
        setHoldSkipProgress(0);
      }

      setIsHoldSkipPending(false);
      window.setTimeout(() => {
        if (!didAdvance) {
          holdSkipActivatedRef.current = false;
          holdSkipContinuousRef.current = false;
          setIsHoldSkipActive(false);
          setIsHoldSkipContinuous(false);
          setHoldSkipDirection(null);
          setHoldSkipProgress(0);
        }
      }, 240);
    });
  };

  const updateHoldSkip = (now: number) => {
    if (holdSkipStartedAtRef.current === null) return;

    const progress = Math.min(
      (now - holdSkipStartedAtRef.current) / HOLD_SKIP_READY_MS,
      1,
    );
    setHoldSkipProgress(progress);

    if (progress >= 1) {
      holdSkipFrameRef.current = null;
      completeHoldSkip();
      return;
    }

    holdSkipFrameRef.current = window.requestAnimationFrame(updateHoldSkip);
  };

  const startHoldSkip = (
    direction: StepDirection,
    event: PointerEvent<HTMLButtonElement>,
  ) => {
    const canHoldSkip =
      direction === "forward" ? canHoldSkipForward : canHoldSkipBack;
    if (!canHoldSkip) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    cancelHoldSkip();
    holdSkipActivatedRef.current = false;
    holdSkipContinuousRef.current = false;
    holdSkipPointerIdRef.current = event.pointerId;
    holdSkipDirectionRef.current = direction;
    holdSkipStartedAtRef.current = performance.now();
    setIsHoldSkipActive(true);
    setHoldSkipDirection(direction);
    setHoldSkipProgress(0);

    event.currentTarget.setPointerCapture(event.pointerId);
    holdSkipFrameRef.current = window.requestAnimationFrame(updateHoldSkip);
  };

  const stopHoldSkip = (event: PointerEvent<HTMLButtonElement>) => {
    if (
      holdSkipPointerIdRef.current !== null &&
      event.pointerId !== holdSkipPointerIdRef.current
    ) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    cancelHoldSkip();
  };

  const handleMobileInputEnter = async (
    event: KeyboardEvent<HTMLFormElement>,
  ) => {
    if (event.key !== "Enter") return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    if (event.nativeEvent.isComposing) return;
    if (!shouldUseMobileEnterNavigation()) return;

    const target = getKeyboardFieldTarget(event.target);
    if (!target) return;

    const fieldName = target.name as ApplicationFieldName;
    const currentFieldIndex = currentStep.fields.findIndex(
      (stepFieldName) => stepFieldName === fieldName,
    );

    if (currentFieldIndex === -1) return;

    event.preventDefault();
    if (loading || isStepTransitioning) return;

    const nextFieldName = currentStep.fields[currentFieldIndex + 1];

    if (nextFieldName) {
      const isFieldValid = await form.trigger(
        fieldName as Parameters<typeof form.trigger>[0],
        { shouldFocus: true },
      );

      if (!isFieldValid) return;
      focusFieldByName(nextFieldName);
      return;
    }

    const nextStep = activeStep + 1;
    const nextStepFirstField = APPLICATION_STEPS[nextStep]?.fields[0] ?? null;
    pendingMobileFocusField.current = nextStepFirstField;

    const didAdvance = await goToStep(nextStep);
    if (!didAdvance) {
      pendingMobileFocusField.current = null;
    }
  };

  useEffect(() => {
    if (!isStepTransitioning || transitionStep === null) return;

    const questionDelay = Math.min(
      Math.max(questionTransitionMs, 0),
      stepTransitionMs,
    );
    const questionTimeout = window.setTimeout(() => {
      setActiveStep(transitionStep);
    }, questionDelay);
    const transitionTimeout = window.setTimeout(() => {
      setActiveStep(transitionStep);
      setTransitionStep(null);
      setIsStepTransitioning(false);
      setActiveTransitionTiming(null);

      if (!holdSkipContinuousRef.current) {
        setHoldSkipProgress(0);
      }
    }, stepTransitionMs);

    return () => {
      window.clearTimeout(questionTimeout);
      window.clearTimeout(transitionTimeout);
    };
  }, [
    isStepTransitioning,
    questionTransitionMs,
    setActiveStep,
    setIsStepTransitioning,
    setTransitionStep,
    stepTransitionMs,
    transitionStep,
  ]);

  useEffect(() => {
    if (!isHoldSkipContinuous || isStepTransitioning || isHoldSkipPending) {
      return;
    }

    const autoAdvanceTimeout = window.setTimeout(() => {
      const direction = holdSkipDirectionRef.current;
      if (!direction) return;

      const nextStep = activeStep + (direction === "forward" ? 1 : -1);
      if (nextStep < 0 || nextStep >= APPLICATION_STEPS.length) {
        holdSkipContinuousRef.current = false;
        holdSkipActivatedRef.current = false;
        setIsHoldSkipActive(false);
        setIsHoldSkipContinuous(false);
        setHoldSkipDirection(null);
        setHoldSkipProgress(0);
        return;
      }

      setIsHoldSkipPending(true);
      void goToStep(nextStep, {
        transitionTiming: holdSkipTransitionTiming,
      }).then((didAdvance) => {
        setIsHoldSkipPending(false);

        if (!didAdvance) {
          holdSkipContinuousRef.current = false;
          holdSkipActivatedRef.current = false;
          setIsHoldSkipActive(false);
          setIsHoldSkipContinuous(false);
          setHoldSkipDirection(null);
          setHoldSkipProgress(0);
        }
      });
    }, 0);

    return () => {
      window.clearTimeout(autoAdvanceTimeout);
    };
  }, [
    activeStep,
    goToStep,
    holdSkipTransitionTiming,
    isHoldSkipContinuous,
    isHoldSkipPending,
    isStepTransitioning,
  ]);

  useEffect(() => {
    const fieldToFocus = pendingMobileFocusField.current;
    if (!fieldToFocus || !shouldUseMobileEnterNavigation()) return;
    if (!currentStep.fields.some((fieldName) => fieldName === fieldToFocus)) {
      return;
    }

    const focusTimeout = window.setTimeout(() => {
      if (focusFieldByName(fieldToFocus)) {
        pendingMobileFocusField.current = null;
      }
    }, 80);

    return () => {
      window.clearTimeout(focusTimeout);
    };
  }, [activeStep, currentStep.fields]);

  const handleInvalidSubmit = () => {
    if (!tosAccepted) {
      setTosError(true);
    }
  };

  return (
    <Form {...form}>
      <style>{applicationStyles}</style>
      <form
        className="kh-application-form bg-[#071d14] text-white"
        data-application-visual={applicationVisualKey}
        aria-busy={loading || isStepTransitioning}
        noValidate
        onKeyDown={(event) => {
          void handleMobileInputEnter(event);
        }}
        onSubmit={form.handleSubmit(async (values) => {
          setLoading(true);

          if (!tosAccepted) {
            setTosError(true);
            toast.error("Please Accept the Knight Hacks Terms of Service");
            setLoading(false);
            return;
          }

          try {
            if (existingApplication) {
              toast.info(
                "You already submitted an application for this hackathon.",
              );
              router.push("/dashboard");
              router.refresh();
              setLoading(false);
              return;
            }

            let resumeUrl = values.resumeUrl ?? "";
            if (values.resumeUpload?.length && values.resumeUpload[0]) {
              const file = values.resumeUpload[0];
              const base64File = await fileToBase64(file);
              resumeUrl = await uploadResume(file.name, base64File);
            }

            await submitApplication({
              firstName: values.firstName,
              lastName: values.lastName,
              email: values.email,
              dob: values.dob,
              phoneNumber: values.phoneNumber,
              country: values.country,
              school: values.school,
              major: values.major,
              levelOfStudy: values.levelOfStudy,
              gender: values.gender ?? "Prefer not to answer",
              gradDate: values.gradDate,
              raceOrEthnicity: values.raceOrEthnicity ?? "Prefer not to answer",
              shirtSize: values.shirtSize,
              githubProfileUrl: values.githubProfileUrl,
              linkedinProfileUrl: values.linkedinProfileUrl,
              websiteUrl: values.websiteUrl,
              isFirstTime: values.isFirstTime,
              agreesToReceiveEmailsFromMLH: values.agreesToReceiveEmailsFromMLH,
              agreesToMLHCodeOfConduct: values.agreesToMLHCodeOfConduct,
              agreesToMLHDataSharing: values.agreesToMLHDataSharing,
              survey1: values.survey1,
              survey2: values.survey2,
              foodAllergies: values.foodAllergies,
              resumeUrl,
            });
            setApplicationSubmitted(true);
            setLoading(false);
            router.replace("/dashboard");
            router.refresh();
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Something went wrong while processing your application.",
            );
            setLoading(false);
          }
        }, handleInvalidSubmit)}
      >
        <div
          className="kh-application-shell relative h-svh min-h-svh overflow-hidden bg-[linear-gradient(135deg,#071d14_0%,#173b28_52%,#08160f_100%)] text-white"
          data-application-visual={applicationVisualKey}
        >
          {applicationIntroVisualActive && (
            <div
              aria-hidden="true"
              className="kh-application-intro-veil"
              data-intro-ready={isApplicationIntroReady ? "true" : undefined}
            />
          )}
          <HackerApplicationBackground
            backgroundKey={applicationVisualKey}
            isTransitioning={!applicationSubmitted && isStepTransitioning}
            progress={progressRatio}
            transitionMsOverride={stepTransitionMs}
            transitionDirection={stepDirection}
          />
          {applicationSubmitted ? (
            <main
              aria-live="polite"
              className="kh-readable-text kh-submitted-screen relative z-10 flex h-svh min-h-svh w-full flex-col overflow-y-auto overscroll-contain px-5 py-8 sm:px-6 md:px-20 md:py-14"
            >
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-widest text-white/60">
                <span>{hackathonName}</span>
                <span>Submitted</span>
              </div>

              <section className="flex flex-1 items-center py-12">
                <div className="w-full max-w-4xl">
                  <div className="kh-submitted-mark bg-white/14 mb-8 inline-flex size-16 items-center justify-center rounded-xl border border-white/35 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:size-20">
                    <CheckCircle2 className="size-9 text-white sm:size-11" />
                  </div>

                  <div className="kh-submitted-copy">
                    <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-white/65">
                      Application confirmed
                    </p>
                    <h1 className="kh-step-title max-w-4xl text-5xl font-bold leading-none tracking-normal text-white sm:text-6xl md:text-8xl">
                      Application submitted.
                    </h1>
                    <p className="text-white/76 mt-7 max-w-2xl text-lg font-medium leading-8 sm:text-xl sm:leading-9">
                      We received your {hackathonName} application. Keep an eye
                      on your inbox for status updates and next steps from the
                      Knight Hacks team.
                    </p>
                  </div>

                  <div className="kh-submitted-action mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button
                      asChild
                      className="h-12 rounded-lg bg-white px-6 text-base font-semibold text-[#173b28] shadow-[0_18px_46px_rgba(0,0,0,0.42)] hover:bg-[#f8f5ea]"
                    >
                      <Link href="/dashboard">
                        View {hackathonName} dashboard
                        <ArrowRight className="ml-2 size-4" />
                      </Link>
                    </Button>
                    <p className="text-sm font-medium text-white/55">
                      Your hackathon dashboard will show your current
                      application status.
                    </p>
                  </div>
                </div>
              </section>
            </main>
          ) : (
            <>
              <div
                className="kh-readable-text relative z-10 flex h-svh min-h-svh w-full flex-col overflow-y-auto overscroll-contain px-5 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 md:px-20 md:pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:pt-14"
                data-text-sequence={textSequenceState}
                style={textSequenceStyle}
              >
                <div className="kh-application-step-meta flex items-center justify-between text-xs font-medium uppercase tracking-widest text-white/60">
                  <span>{currentStepCopy.eyebrow}</span>
                  <span>
                    {activeStep + 1}/{APPLICATION_STEPS.length}
                  </span>
                </div>

                {previousHacker && activeStep === 0 && (
                  <div className="kh-application-prefill-note mt-6 max-w-xl border-l-2 border-white/35 pl-4 text-sm font-medium text-white/65">
                    Information from your previous application is pre-filled.
                  </div>
                )}

                <div className="kh-application-stage flex flex-1 items-start py-8 md:items-center md:py-10">
                  <div className="kh-application-panel w-full max-w-3xl">
                    <h1
                      key={currentStep.id}
                      className="kh-step-title text-4xl font-bold leading-none tracking-normal text-white sm:text-5xl md:text-7xl"
                    >
                      {currentStepCopy.title}
                    </h1>

                    <div
                      className={cn(
                        "kh-step-content",
                        "animate-in fade-in mt-10 duration-200 sm:mt-14 md:mt-16",
                        stepDirection === "forward"
                          ? "slide-in-from-right-4"
                          : "slide-in-from-left-4",
                        "[&_input]:h-12 [&_input]:rounded-none [&_input]:border-x-0 [&_input]:border-b-2 [&_input]:border-t-0 [&_input]:border-white/75 [&_input]:bg-transparent [&_input]:px-0 [&_input]:text-lg [&_input]:font-normal [&_input]:text-white [&_input]:shadow-none [&_input]:transition-colors [&_input]:placeholder:text-white/35 [&_input]:focus-visible:border-white [&_input]:focus-visible:ring-0 sm:[&_input]:h-14 sm:[&_input]:text-xl md:[&_input]:text-2xl",
                        "[&_textarea]:min-h-32 [&_textarea]:rounded-none [&_textarea]:border-x-0 [&_textarea]:border-b-2 [&_textarea]:border-t-0 [&_textarea]:border-white/75 [&_textarea]:bg-transparent [&_textarea]:px-0 [&_textarea]:text-lg [&_textarea]:font-normal [&_textarea]:text-white [&_textarea]:shadow-none [&_textarea]:transition-colors [&_textarea]:placeholder:text-white/35 [&_textarea]:focus-visible:border-white [&_textarea]:focus-visible:ring-0 sm:[&_textarea]:min-h-36 sm:[&_textarea]:text-xl",
                        "[&_p]:text-sm [&_p]:font-medium [&_p]:text-rose-200",
                      )}
                    >
                      <section className="space-y-5">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                !isActiveQuestion("firstName") && "hidden",
                              )}
                            >
                              <FieldLabel required>First Name</FieldLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder="Lenny"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                !isActiveQuestion("lastName") && "hidden",
                              )}
                            >
                              <FieldLabel required>Last Name</FieldLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder="Dragonson"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                !isActiveQuestion("email") && "hidden",
                              )}
                            >
                              <FieldLabel required>Email</FieldLabel>
                              <FormControl>
                                <Input
                                  placeholder="tk@knighthacks.org"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                !isActiveQuestion("phoneNumber") && "hidden",
                              )}
                            >
                              <FieldLabel required>Phone Number</FieldLabel>
                              <FormControl>
                                <Input
                                  type="tel"
                                  placeholder="123-456-7890"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="dob"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                "flex flex-col",
                                !isActiveQuestion("dob") && "hidden",
                              )}
                            >
                              <FieldLabel required>Date of Birth</FieldLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                !isActiveQuestion("country") && "hidden",
                              )}
                            >
                              <FieldLabel required>
                                Country of Residence
                              </FieldLabel>
                              <FormControl>
                                <ResponsiveComboBox
                                  items={FORMS.COUNTRIES}
                                  renderItem={(country) => <div>{country}</div>}
                                  getItemValue={(country) => country}
                                  getItemLabel={(country) => country}
                                  value={field.value}
                                  onItemSelect={(country) =>
                                    field.onChange(country)
                                  }
                                  buttonPlaceholder={getComboBoxDisplayValue(
                                    field.value,
                                    "Select your country",
                                  )}
                                  inputPlaceholder="Search for your country"
                                  triggerClassName={fieldTriggerClassName}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="gender"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                !isActiveQuestion("gender") && "hidden",
                              )}
                            >
                              <FieldLabel optional>Gender</FieldLabel>
                              <FormControl>
                                <ResponsiveComboBox
                                  items={FORMS.GENDERS}
                                  renderItem={(gender) => <div>{gender}</div>}
                                  getItemValue={(gender) => gender}
                                  getItemLabel={(gender) => gender}
                                  value={field.value}
                                  onItemSelect={(gender) =>
                                    field.onChange(gender)
                                  }
                                  buttonPlaceholder={
                                    field.value ?? "Select your gender"
                                  }
                                  inputPlaceholder="Search for your gender"
                                  triggerClassName={fieldTriggerClassName}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="raceOrEthnicity"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                !isActiveQuestion("raceOrEthnicity") &&
                                  "hidden",
                              )}
                            >
                              <FieldLabel optional>
                                Race or Ethnicity
                              </FieldLabel>
                              <FormControl>
                                <ResponsiveComboBox
                                  items={FORMS.RACES_OR_ETHNICITIES}
                                  renderItem={(race) => <div>{race}</div>}
                                  getItemValue={(race) => race}
                                  getItemLabel={(race) => race}
                                  value={field.value}
                                  onItemSelect={(race) => field.onChange(race)}
                                  buttonPlaceholder={
                                    field.value ??
                                    "Select your race or ethnicity"
                                  }
                                  inputPlaceholder="Search for your race or ethnicity"
                                  triggerClassName={fieldTriggerClassName}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </section>

                      <section className="space-y-5">
                        <FormField
                          control={form.control}
                          name="levelOfStudy"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                !isActiveQuestion("levelOfStudy") && "hidden",
                              )}
                            >
                              <FieldLabel required>Level of Study</FieldLabel>
                              <FormControl>
                                <ResponsiveComboBox
                                  items={FORMS.LEVELS_OF_STUDY}
                                  renderItem={(level) => <div>{level}</div>}
                                  getItemValue={(level) => level}
                                  getItemLabel={(level) => level}
                                  value={field.value}
                                  onItemSelect={(level) =>
                                    field.onChange(level)
                                  }
                                  buttonPlaceholder={getComboBoxDisplayValue(
                                    field.value,
                                    "Select your level of study",
                                  )}
                                  inputPlaceholder="Search levels of study"
                                  triggerClassName={fieldTriggerClassName}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="school"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                !isActiveQuestion("school") && "hidden",
                              )}
                            >
                              <FieldLabel required>School</FieldLabel>
                              <FormControl>
                                <ResponsiveComboBox
                                  items={FORMS.SCHOOLS}
                                  renderItem={(school) => <div>{school}</div>}
                                  getItemValue={(school) => school}
                                  getItemLabel={(school) => school}
                                  value={field.value}
                                  onItemSelect={(school) =>
                                    field.onChange(school)
                                  }
                                  buttonPlaceholder={getComboBoxDisplayValue(
                                    field.value,
                                    "Select a school",
                                  )}
                                  inputPlaceholder="Search for your school"
                                  triggerClassName={fieldTriggerClassName}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="major"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                !isActiveQuestion("major") && "hidden",
                              )}
                            >
                              <FieldLabel required>Major of Study</FieldLabel>
                              <FormControl>
                                <ResponsiveComboBox
                                  items={FORMS.MAJORS}
                                  renderItem={(major) => <div>{major}</div>}
                                  getItemValue={(major) => major}
                                  getItemLabel={(major) => major}
                                  value={field.value}
                                  onItemSelect={(major) =>
                                    field.onChange(major)
                                  }
                                  buttonPlaceholder={getComboBoxDisplayValue(
                                    field.value,
                                    "Select a major",
                                  )}
                                  inputPlaceholder="Search for your major"
                                  triggerClassName={fieldTriggerClassName}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="gradDate"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                "flex flex-col",
                                !isActiveQuestion("gradDate") && "hidden",
                              )}
                            >
                              <FieldLabel required>Graduation Date</FieldLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="shirtSize"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                !isActiveQuestion("shirtSize") && "hidden",
                              )}
                            >
                              <FieldLabel required>Shirt Size</FieldLabel>
                              <FormControl>
                                <ResponsiveComboBox
                                  items={FORMS.SHIRT_SIZES}
                                  renderItem={(size) => <div>{size}</div>}
                                  getItemValue={(size) => size}
                                  getItemLabel={(size) => size}
                                  value={field.value}
                                  onItemSelect={(size) => field.onChange(size)}
                                  buttonPlaceholder={getComboBoxDisplayValue(
                                    field.value,
                                    "Select your shirt size",
                                  )}
                                  inputPlaceholder="Search shirt sizes"
                                  triggerClassName={fieldTriggerClassName}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </section>

                      <section className="space-y-5">
                        <FormField
                          control={form.control}
                          name="survey1"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                !isActiveQuestion("survey1") && "hidden",
                              )}
                            >
                              <FieldLabel required>
                                Why do you want to attend {hackathonName}?
                              </FieldLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Why do you want to attend?"
                                  {...field}
                                  value={field.value}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="survey2"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                !isActiveQuestion("survey2") && "hidden",
                              )}
                            >
                              <FieldLabel required>
                                What do you hope to achieve at {hackathonName}?
                              </FieldLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="What are your goals for this event?"
                                  {...field}
                                  value={field.value}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </section>

                      <section className="space-y-5">
                        <FormField
                          control={form.control}
                          name="githubProfileUrl"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                !isActiveQuestion("githubProfileUrl") &&
                                  "hidden",
                              )}
                            >
                              <FieldLabel optional>GitHub Profile</FieldLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://github.com/knighthacks"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="linkedinProfileUrl"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                !isActiveQuestion("linkedinProfileUrl") &&
                                  "hidden",
                              )}
                            >
                              <FieldLabel optional>LinkedIn Profile</FieldLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://www.linkedin.com/company/knight-hacks"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="websiteUrl"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                !isActiveQuestion("websiteUrl") && "hidden",
                              )}
                            >
                              <FieldLabel optional>Personal Website</FieldLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://knighthacks.org"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="resumeUpload"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                !isActiveQuestion("resumeUpload") && "hidden",
                              )}
                            >
                              <div className="kh-resume-info-row">
                                <FieldLabel optional>Resume</FieldLabel>
                                <ResumeInfoPopover
                                  visualKey={applicationVisualKey}
                                />
                              </div>
                              <FormControl>
                                <Input
                                  type="file"
                                  className="file:bg-white/12 hover:file:bg-white/18 cursor-pointer file:mr-4 file:rounded-md file:border file:border-white/45 file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                                  {...fileRef}
                                  onChange={(event) => {
                                    field.onChange(
                                      event.target.files?.[0]
                                        ? event.target.files
                                        : undefined,
                                    );
                                  }}
                                />
                              </FormControl>

                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </section>

                      <section className="space-y-5">
                        <FormField
                          control={form.control}
                          name="foodAllergies"
                          render={() => {
                            const allergySummary =
                              selectedAllergies.length > 0
                                ? selectedAllergies.join(", ")
                                : "Select allergies";
                            const filteredAllergies = FORMS.ALLERGIES.filter(
                              (allergy) =>
                                allergy
                                  .toLowerCase()
                                  .includes(allergySearch.trim().toLowerCase()),
                            );

                            return (
                              <FormItem
                                className={cn(
                                  !isActiveQuestion("foodAllergies") &&
                                    "hidden",
                                )}
                              >
                                <FieldLabel optional>
                                  Food Allergies/Restrictions
                                </FieldLabel>
                                <FormControl>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          fieldTriggerClassName,
                                          "flex w-full items-center justify-start gap-2",
                                        )}
                                      >
                                        <span
                                          className={cn(
                                            "block min-w-0 flex-1 truncate",
                                            selectedAllergies.length === 0 &&
                                              "text-white/35",
                                          )}
                                        >
                                          {allergySummary}
                                        </span>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                      align="start"
                                      collisionPadding={16}
                                      className="bg-[#030713]/98 flex w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border-white/15 p-0 text-white shadow-2xl"
                                      style={{
                                        maxHeight:
                                          "min(22rem, calc(100svh - 2rem), var(--radix-popover-content-available-height))",
                                      }}
                                    >
                                      <div className="border-white/12 flex h-14 items-center border-b px-3">
                                        <Search
                                          aria-hidden="true"
                                          className="mr-3 h-5 w-5 shrink-0 text-white/55"
                                          strokeWidth={2}
                                        />
                                        <input
                                          aria-label="Search allergies"
                                          value={allergySearch}
                                          onChange={(event) =>
                                            setAllergySearch(event.target.value)
                                          }
                                          placeholder="Search allergies"
                                          className="h-full min-w-0 flex-1 bg-transparent text-base font-medium text-white outline-none placeholder:text-white/45 sm:text-lg"
                                        />
                                      </div>
                                      <div className="flex w-full flex-1 flex-col overflow-y-auto overscroll-contain p-1">
                                        {filteredAllergies.map((allergy) => (
                                          <div
                                            key={allergy}
                                            onClick={() => {
                                              toggleAllergy(allergy);
                                            }}
                                            onKeyDown={(event) => {
                                              if (
                                                event.key === "Enter" ||
                                                event.key === " "
                                              ) {
                                                event.preventDefault();
                                                toggleAllergy(allergy);
                                              }
                                            }}
                                            role="button"
                                            tabIndex={0}
                                            className={cn(
                                              "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-base text-white/90 transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white focus-visible:outline-none sm:text-lg",
                                              selectedAllergies.includes(
                                                allergy,
                                              ) && "bg-[#1f2b3b] text-white",
                                            )}
                                          >
                                            <Checkbox
                                              checked={selectedAllergies.includes(
                                                allergy,
                                              )}
                                              onCheckedChange={() =>
                                                toggleAllergy(allergy)
                                              }
                                              className={checkboxClassName}
                                              onClick={(event) => {
                                                event.stopPropagation();
                                              }}
                                            />
                                            <span>{allergy}</span>
                                          </div>
                                        ))}
                                        {filteredAllergies.length === 0 && (
                                          <div className="px-3 py-6 text-center text-sm font-medium text-white/45">
                                            No allergies found.
                                          </div>
                                        )}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                        <FormField
                          control={form.control}
                          name="isFirstTime"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                "flex flex-row items-start gap-3 space-y-0",
                                !isActiveQuestion("isFirstTime") && "hidden",
                              )}
                            >
                              <FormControl>
                                <Checkbox
                                  checked={!!field.value}
                                  onCheckedChange={field.onChange}
                                  className={cn(checkboxClassName)}
                                />
                              </FormControl>
                              <div className="min-w-0 flex-1 space-y-1 leading-none">
                                <FormLabel
                                  className={firstTimeCheckboxLabelClassName}
                                >
                                  This is my first time participating in a
                                  Hackathon.
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </section>

                      <section className="space-y-5">
                        <FormField
                          control={form.control}
                          name="agreesToMLHCodeOfConduct"
                          render={({ field, fieldState }) => (
                            <FormItem
                              className={cn(
                                "flex flex-row items-start gap-3 space-y-0",
                                fieldState.error && agreementErrorRowClassName,
                                !isActiveQuestion("agreesToMLHCodeOfConduct") &&
                                  "hidden",
                              )}
                            >
                              <FormControl>
                                <Checkbox
                                  checked={!!field.value}
                                  onCheckedChange={(value) => {
                                    field.onChange(value);
                                    if (value) {
                                      form.clearErrors(
                                        "agreesToMLHCodeOfConduct",
                                      );
                                    }
                                  }}
                                  className={cn(
                                    checkboxClassName,
                                    fieldState.error &&
                                      agreementErrorCheckboxClassName,
                                  )}
                                />
                              </FormControl>
                              <div className="min-w-0 flex-1 space-y-1 leading-none">
                                <FormLabel
                                  className={cn(
                                    checkboxLabelClassName,
                                    fieldState.error &&
                                      agreementErrorLabelClassName,
                                  )}
                                >
                                  I have read and agree to the{" "}
                                  <Link
                                    href="https://github.com/MLH/mlh-policies/blob/main/code-of-conduct.md"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={agreementLinkClassName}
                                  >
                                    MLH Code of Conduct
                                  </Link>
                                  .{" "}
                                  <span className={requiredMarkClassName}>
                                    *
                                  </span>
                                </FormLabel>
                                <FormMessage
                                  className={agreementErrorMessageClassName}
                                />
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="agreesToMLHDataSharing"
                          render={({ field, fieldState }) => (
                            <FormItem
                              className={cn(
                                "flex flex-row items-start gap-3 space-y-0",
                                fieldState.error && agreementErrorRowClassName,
                                !isActiveQuestion("agreesToMLHDataSharing") &&
                                  "hidden",
                              )}
                            >
                              <FormControl>
                                <Checkbox
                                  checked={!!field.value}
                                  onCheckedChange={(value) => {
                                    field.onChange(value);
                                    if (value) {
                                      form.clearErrors(
                                        "agreesToMLHDataSharing",
                                      );
                                    }
                                  }}
                                  className={cn(
                                    checkboxClassName,
                                    fieldState.error &&
                                      agreementErrorCheckboxClassName,
                                  )}
                                />
                              </FormControl>
                              <div className="min-w-0 flex-1 space-y-1 leading-none">
                                <FormLabel
                                  className={cn(
                                    checkboxLabelClassName,
                                    fieldState.error &&
                                      agreementErrorLabelClassName,
                                  )}
                                >
                                  I authorize you to share my
                                  application/registration information with
                                  Major League Hacking for event administration,
                                  ranking, and administration (including the
                                  creation of linked accounts on MLH and{" "}
                                  <Link
                                    href="https://dev.to/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={agreementLinkClassName}
                                  >
                                    DEV
                                  </Link>
                                  ) in line with the MLH Privacy Policy. I
                                  further agree to the terms of both the{" "}
                                  <Link
                                    href="https://github.com/MLH/mlh-policies/blob/main/contest-terms.md"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={agreementLinkClassName}
                                  >
                                    MLH Contest Terms and Conditions
                                  </Link>{" "}
                                  and the{" "}
                                  <Link
                                    href="https://github.com/MLH/mlh-policies/blob/main/privacy-policy.md"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={agreementLinkClassName}
                                  >
                                    MLH Privacy Policy
                                  </Link>
                                  .{" "}
                                  <span className={requiredMarkClassName}>
                                    *
                                  </span>
                                </FormLabel>
                                <FormMessage
                                  className={agreementErrorMessageClassName}
                                />
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="agreesToReceiveEmailsFromMLH"
                          render={({ field }) => (
                            <FormItem
                              className={cn(
                                "flex flex-row items-start gap-3 space-y-0",
                                !isActiveQuestion(
                                  "agreesToReceiveEmailsFromMLH",
                                ) && "hidden",
                              )}
                            >
                              <FormControl>
                                <Checkbox
                                  checked={!!field.value}
                                  onCheckedChange={field.onChange}
                                  className={cn(checkboxClassName)}
                                />
                              </FormControl>
                              <div className="min-w-0 flex-1 space-y-1 leading-none">
                                <FormLabel
                                  className={cn(checkboxLabelClassName)}
                                >
                                  I authorize MLH + DEV to send me occasional
                                  emails about relevant events, career
                                  opportunities, and community
                                  announcements.{" "}
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />

                        <div
                          className={cn(
                            "flex flex-row items-start gap-3 space-y-0",
                            tosError ? agreementErrorRowClassName : "py-2",
                            !isActiveQuestion("tosAccepted") && "hidden",
                          )}
                        >
                          <div>
                            <Checkbox
                              checked={tosAccepted}
                              onCheckedChange={(v) => {
                                const isChecked = !!v;
                                setTosAccepted(isChecked);
                                if (isChecked) setTosError(false);
                              }}
                              className={cn(
                                checkboxClassName,
                                tosError && agreementErrorCheckboxClassName,
                              )}
                              aria-invalid={tosError}
                              aria-labelledby="tos-visual-label"
                              aria-describedby={
                                tosError ? "tos-visual-error" : undefined
                              }
                            />
                          </div>

                          <div className="min-w-0 flex-1 space-y-1 leading-none">
                            <div
                              id="tos-visual-label"
                              className={cn(
                                checkboxLabelClassName,
                                tosError && agreementErrorLabelClassName,
                              )}
                            >
                              By checking this box you acknowledge that you
                              agree to the{" "}
                              <Link
                                href="https://knight-hacks.notion.site/knight-hacks-26-tos"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={agreementLinkClassName}
                              >
                                Knight Hacks Terms of Service
                              </Link>
                              . <span className={requiredMarkClassName}>*</span>
                            </div>
                            {tosError && (
                              <p
                                id="tos-visual-error"
                                className={agreementErrorMessageClassName}
                                role="alert"
                              >
                                You must agree to the Knight Hacks Terms of
                                Service
                              </p>
                            )}
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>
                </div>
              </div>
              <div className="kh-application-nav pointer-events-none absolute flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={backButtonNativeDisabled}
                  style={holdSkipStyle}
                  data-hold-active={
                    isHoldSkipActive && holdSkipDirection === "back"
                      ? "true"
                      : undefined
                  }
                  data-hold-skip={
                    canHoldSkipBack || canContinueHoldSkipBack
                      ? "true"
                      : undefined
                  }
                  onPointerCancel={stopHoldSkip}
                  onPointerDown={(event) => {
                    startHoldSkip("back", event);
                  }}
                  onPointerLeave={(event) => {
                    if (
                      !event.currentTarget.hasPointerCapture(event.pointerId)
                    ) {
                      stopHoldSkip(event);
                    }
                  }}
                  onPointerUp={stopHoldSkip}
                  onClick={() => {
                    if (holdSkipActivatedRef.current || isHoldSkipPending) {
                      holdSkipActivatedRef.current = false;
                      return;
                    }
                    if (backButtonDisabled) return;
                    void goToStep(activeStep - 1);
                  }}
                  aria-disabled={backButtonDisabled}
                  data-transitioning={
                    backButtonTransitioning ? "true" : undefined
                  }
                  tabIndex={backButtonUnavailable ? -1 : undefined}
                  size="icon"
                  className={cn(
                    secondaryActionButtonClassName,
                    "pointer-events-auto",
                    backButtonUnavailable && "pointer-events-none opacity-35",
                  )}
                  aria-label={
                    backButtonTransitioning
                      ? "Moving to previous section"
                      : canHoldSkipBack
                        ? "Back. Hold to quick return."
                        : "Back"
                  }
                  title={
                    backButtonTransitioning
                      ? "Moving to previous section"
                      : canHoldSkipBack
                        ? "Back. Hold to quick return."
                        : "Back"
                  }
                >
                  <ArrowLeft className="h-6 w-6 sm:h-7 sm:w-7" />
                </Button>

                {isFinalStep ? (
                  <div className="pointer-events-auto flex min-w-0 items-center gap-3">
                    <div className="flex min-h-9 w-28 shrink-0 items-center justify-end sm:w-36">
                      {loading && (
                        <div
                          aria-live="polite"
                          className="kh-submit-loading bg-[#071d14]/88 flex items-center gap-2 rounded-md border border-white/35 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-[0_16px_42px_rgba(0,0,0,0.32)] backdrop-blur-md sm:text-sm"
                          role="status"
                        >
                          <Loader2
                            aria-hidden="true"
                            className="size-4 animate-spin"
                          />
                          <span>Submitting</span>
                        </div>
                      )}
                    </div>
                    <Button
                      type="submit"
                      disabled={submitButtonNativeDisabled}
                      data-transitioning={
                        submitButtonTransitioning ? "true" : undefined
                      }
                      size="icon"
                      className={cn(
                        actionButtonClassName,
                        "pointer-events-auto",
                        loading && "cursor-wait disabled:opacity-100",
                      )}
                      aria-label={
                        loading
                          ? "Submitting application"
                          : submitButtonTransitioning
                            ? "Finishing section transition"
                            : "Submit application"
                      }
                      title={
                        loading
                          ? "Submitting application"
                          : submitButtonTransitioning
                            ? "Finishing section transition"
                            : "Submit application"
                      }
                    >
                      {loading ? (
                        <Loader2 className="h-6 w-6 animate-spin sm:h-7 sm:w-7" />
                      ) : (
                        <Send className="h-6 w-6 sm:h-7 sm:w-7" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    disabled={forwardButtonNativeDisabled}
                    style={holdSkipStyle}
                    data-hold-active={
                      isHoldSkipActive && holdSkipDirection === "forward"
                        ? "true"
                        : undefined
                    }
                    data-hold-skip={
                      canHoldSkipForward || canContinueHoldSkipForward
                        ? "true"
                        : undefined
                    }
                    onPointerCancel={stopHoldSkip}
                    onPointerDown={(event) => {
                      startHoldSkip("forward", event);
                    }}
                    onPointerLeave={(event) => {
                      if (
                        !event.currentTarget.hasPointerCapture(event.pointerId)
                      ) {
                        stopHoldSkip(event);
                      }
                    }}
                    onPointerUp={stopHoldSkip}
                    onClick={() => {
                      if (holdSkipActivatedRef.current || isHoldSkipPending) {
                        holdSkipActivatedRef.current = false;
                        return;
                      }
                      if (forwardButtonDisabled) return;
                      void goToStep(activeStep + 1);
                    }}
                    aria-disabled={forwardButtonDisabled}
                    data-transitioning={
                      forwardButtonTransitioning ? "true" : undefined
                    }
                    tabIndex={forwardButtonUnavailable ? -1 : undefined}
                    size="icon"
                    className={cn(
                      actionButtonClassName,
                      "pointer-events-auto",
                      forwardButtonUnavailable &&
                        "pointer-events-none opacity-35",
                    )}
                    aria-label={
                      forwardButtonTransitioning
                        ? "Moving to next section"
                        : canHoldSkipForward
                          ? "Next. Hold to quick advance."
                          : "Next"
                    }
                    title={
                      forwardButtonTransitioning
                        ? "Moving to next section"
                        : canHoldSkipForward
                          ? "Next. Hold to quick advance."
                          : "Next"
                    }
                  >
                    <ArrowRight className="h-6 w-6 sm:h-7 sm:w-7" />
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </form>
    </Form>
  );
}
