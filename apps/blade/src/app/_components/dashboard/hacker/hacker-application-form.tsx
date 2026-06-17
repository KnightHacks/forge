"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
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
import { z } from "zod";

import { FORMS, MINIO } from "@forge/consts";
import { InsertHackerSchema } from "@forge/db/schemas/knight-hacks";
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

import { api } from "~/trpc/react";
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
  "text-xl font-black text-[#ff4fd8] drop-shadow-[0_0_10px_rgba(255,79,216,0.85)] md:text-2xl";
const checkboxClassName =
  "mt-0.5 flex h-5 w-5 items-center justify-center border-white/45 bg-white/5 text-white shadow-none data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-[#21103d] focus-visible:ring-white/40 [&>span>svg]:h-5 [&>span>svg]:w-5";
const checkboxLabelClassName =
  "text-sm font-medium leading-relaxed text-white/75";
const highlightedCheckboxRowClassName =
  "flex flex-row items-start gap-3 space-y-0 rounded-md border border-white/18 bg-[#06101b]/58 px-3 py-3 shadow-[0_16px_42px_rgba(0,0,0,0.28)] backdrop-blur-sm";
const highlightedCheckboxClassName =
  "h-6 w-6 border-white/70 bg-white/12 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_0_24px_rgba(255,255,255,0.12)] data-[state=checked]:border-white data-[state=checked]:bg-white";
const highlightedCheckboxLabelClassName =
  "text-base font-semibold leading-relaxed text-white/90 drop-shadow-[0_1px_5px_rgba(0,0,0,0.78)]";
const agreementErrorRowClassName =
  "rounded-md bg-[#ff2f6d]/14 px-3 py-3 ring-1 ring-[#ff6f9a]/55 shadow-[0_0_30px_rgba(255,47,109,0.22)]";
const agreementErrorCheckboxClassName =
  "border-[#ff8aaa] bg-[#ff2f6d]/25 text-white shadow-[0_0_0_4px_rgba(255,111,154,0.24),0_0_24px_rgba(255,47,109,0.45)]";
const agreementErrorLabelClassName =
  "text-[#ffd3df] drop-shadow-[0_1px_5px_rgba(0,0,0,0.85)]";
const agreementErrorMessageClassName =
  "mt-2 text-sm font-black tracking-wide text-[#ffadc3] drop-shadow-[0_1px_5px_rgba(0,0,0,0.9)] md:text-base";
const agreementLinkClassName =
  "font-semibold text-white underline underline-offset-4 decoration-white/35 transition-colors hover:text-white/80 hover:decoration-white";
const actionButtonClassName =
  "kh-nav-button size-14 rounded-full bg-white p-0 text-[#21103d] shadow-[0_18px_46px_rgba(0,0,0,0.42)] hover:bg-white/90 sm:size-16";
const secondaryActionButtonClassName =
  "kh-nav-button size-14 rounded-full border-white/45 bg-[#12071f]/75 p-0 text-white shadow-[0_18px_46px_rgba(0,0,0,0.42)] hover:bg-[#12071f]/90 hover:text-white disabled:opacity-35 sm:size-16";
const resumeSponsorDisclosure =
  "Uploaded resumes will be shared with sponsors for potential internships and outreach.";

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

@keyframes khTitleRise {
  from { opacity: 0; transform: translate3d(0, 18px, 0); filter: blur(8px); }
  to { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); }
}

@keyframes khFieldIn {
  from { opacity: 0; transform: translate3d(18px, 10px, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}

@keyframes khUnderlinePulse {
  0%, 100% { box-shadow: 0 8px 26px rgba(255, 255, 255, 0); }
  50% { box-shadow: 0 10px 34px rgba(255, 255, 255, 0.14); }
}

@keyframes khSubmitLoadingIn {
  from { opacity: 0; transform: translate3d(0, 8px, 0) scale(0.98); }
  to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
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
  animation: khTitleRise 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
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

.kh-step-content > section > div:not(.hidden) {
  animation: khFieldIn 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.kh-step-content > section > div:not(.hidden):nth-child(2) { animation-delay: 20ms; }
.kh-step-content > section > div:not(.hidden):nth-child(3) { animation-delay: 40ms; }
.kh-step-content > section > div:not(.hidden):nth-child(4) { animation-delay: 60ms; }
.kh-step-content > section > div:not(.hidden):nth-child(5) { animation-delay: 80ms; }
.kh-step-content > section > div:not(.hidden):nth-child(6) { animation-delay: 100ms; }
.kh-step-content > section > div:not(.hidden):nth-child(7) { animation-delay: 120ms; }
.kh-step-content > section > div:not(.hidden):nth-child(8) { animation-delay: 140ms; }

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
    background-color 180ms ease,
    border-color 180ms ease;
}

.kh-nav-button:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.04);
  box-shadow: 0 22px 54px rgba(0, 0, 0, 0.5);
}

.kh-nav-button:active:not(:disabled) {
  transform: translateY(0) scale(0.96);
}

.kh-application-form {
  height: 100svh;
  min-height: 100svh;
  overflow: hidden;
}

.kh-application-nav {
  inset-inline: 1.25rem;
  bottom: calc(1.25rem + env(safe-area-inset-bottom, 0px));
  z-index: 80;
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
  .kh-step-title,
  .kh-submit-loading,
  .kh-submitted-mark,
  .kh-submitted-screen,
  .kh-submitted-copy,
  .kh-submitted-action,
  .kh-step-content > section > div:not(.hidden),
  .kh-step-content :is(input, textarea, button):focus-visible {
    animation: none;
  }

  .kh-nav-button {
    transition: none;
  }
}
`;

const APPLICATION_STEPS = [
  {
    id: "profile",
    title: "Basics",
    eyebrow: "Start",
    fields: ["firstName", "lastName"],
  },
  {
    id: "contact",
    title: "Contact",
    eyebrow: "Reachability",
    fields: ["email", "phoneNumber"],
  },
  {
    id: "identity",
    title: "About You",
    eyebrow: "Profile",
    fields: ["dob", "country", "gender", "raceOrEthnicity"],
  },
  {
    id: "education",
    title: "School",
    eyebrow: "Education",
    fields: ["levelOfStudy", "school", "major", "gradDate", "shirtSize"],
  },
  {
    id: "application",
    title: "Application",
    eyebrow: "Application",
    fields: ["survey1", "survey2"],
  },
  {
    id: "links",
    title: "Links",
    eyebrow: "Portfolio",
    fields: [
      "githubProfileUrl",
      "linkedinProfileUrl",
      "websiteUrl",
      "resumeUpload",
    ],
  },
  {
    id: "event",
    title: "Event Details",
    eyebrow: "Event Details",
    fields: ["foodAllergies", "isFirstTime"],
  },
  {
    id: "tosAccepted",
    title: "Agreements",
    eyebrow: "Finalize",
    fields: [
      "agreesToMLHCodeOfConduct",
      "agreesToMLHDataSharing",
      "agreesToReceiveEmailsFromMLH",
    ],
  },
] as const;

type ApplicationFieldName =
  (typeof APPLICATION_STEPS)[number]["fields"][number];

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

function getDateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? ""
      : value.toISOString().slice(0, 10);
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toISOString().slice(0, 10);
}

function shouldUseMobileEnterNavigation() {
  if (typeof window === "undefined") return false;

  return (
    window.navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(hover: none)").matches
  );
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
  const [tosAccepted, setTosAccepted] = useState(false);
  const [tosError, setTosError] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [transitionStep, setTransitionStep] = useState<number | null>(null);
  const [isStepTransitioning, setIsStepTransitioning] = useState(false);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [stepDirection, setStepDirection] = useState<"forward" | "back">(
    "forward",
  );
  const pendingMobileFocusField = useRef<ApplicationFieldName | null>(null);
  const prefillAppliedRef = useRef(false);
  const existingApplicationRedirectedRef = useRef(false);
  const utils = api.useUtils();
  const applicationVisualBackgroundKey =
    getHackerApplicationBackgroundKey(applicationBackgroundKey) ??
    getApplicationVisualFallbackKey(hackathonId);
  const applicationVisualConfig = getHackerApplicationBackground(
    applicationVisualBackgroundKey,
  );
  const applicationVisualKey = applicationVisualConfig.key;
  const applicationStyles = `${applicationAnimationStyles}\n${applicationVisualConfig.styles ?? ""}`;
  const stepTransitionMs = applicationVisualConfig.stepTransitionMs ?? 0;
  const questionTransitionMs =
    applicationVisualConfig.questionTransitionMs ?? stepTransitionMs;

  // Get previous hacker profile to pre-fill form
  const { data: previousHacker } = api.hackathon.getPreviousHacker.useQuery();
  const { data: memberProfile } = api.member.getMember.useQuery();
  const { data: existingApplication } = api.hackerQuery.getHacker.useQuery(
    { hackathonName: hackathonId },
    { retry: false },
  );

  const uploadResume = api.resume.uploadResume.useMutation({
    onError() {
      toast.error("There was a problem storing your resume, please try again!");
    },
    async onSettled() {
      await utils.resume.invalidate();
    },
  });

  const createHacker = api.hackerMutation.createHacker.useMutation({
    onSuccess() {
      setApplicationSubmitted(true);
      void utils.hackerQuery.getHacker.invalidate({
        hackathonName: hackathonId,
      });
    },
    onError(error) {
      toast.error(
        error.message || "Oops! Something went wrong. Please try again later.",
      );
    },
    onSettled() {
      setLoading(false);
    },
  });

  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies((prev) => {
      const next = prev.includes(allergy)
        ? prev.filter((a) => a !== allergy)
        : [...prev, allergy];

      form.setValue("foodAllergies", next.join(","));
      return next;
    });
  };

  // Helper function to calculate age
  const calculateAge = (birthDate: Date, referenceDate: Date): number => {
    let age = referenceDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = referenceDate.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  // Setup React Hook Form
  const form = useForm({
    schema: InsertHackerSchema.extend({
      userId: z.undefined(),
      firstName: z.string().min(1, "Required"),
      lastName: z.string().min(1, "Required"),
      age: z.undefined(),
      email: z.string().email("Invalid email").min(1, "Required"),
      phoneNumber: z
        .string()
        .regex(/^\d{10}|\d{3}-\d{3}-\d{4}$|^$/, "Invalid phone number"),
      country: z.enum(FORMS.COUNTRIES, {
        error: "Select your country",
      }),
      school: z.enum(FORMS.SCHOOLS, {
        error: "Select a school",
      }),
      levelOfStudy: z.enum(FORMS.LEVELS_OF_STUDY, {
        error: "Select your level of study",
      }),
      major: z.enum(FORMS.MAJORS, {
        error: "Select a major",
      }),
      gender: z
        .enum(FORMS.GENDERS, {
          error: "Select a valid gender",
        })
        .optional(),
      raceOrEthnicity: z
        .enum(FORMS.RACES_OR_ETHNICITIES, {
          error: "Select a valid race or ethnicity",
        })
        .optional(),
      shirtSize: z.enum(FORMS.SHIRT_SIZES, {
        error: "Select your shirt size",
      }),
      dob: z
        .string()
        .pipe(z.coerce.date())
        .refine(
          (date) => {
            const hackathonDate = new Date(hackathonStartDate);
            const age = calculateAge(date, hackathonDate);

            return age >= 18;
          },
          {
            message:
              "You must be at least 18 years old by the hackathon start date to participate",
          },
        )
        .transform((date) => date.toISOString()),
      gradDate: z
        .string()
        .pipe(z.coerce.date())
        .transform((date) => date.toISOString()),
      survey1: z.string().min(1, "Required"),
      survey2: z.string().min(1, "Required"),
      githubProfileUrl: z
        .string()
        .regex(/^https:\/\/.+/, "Invalid URL: Please try again with https://")
        .regex(
          /^https:\/\/(www\.)?github\.com\/.+/,
          "Invalid URL: Enter a valid GitHub link",
        )
        .url({ message: "Invalid URL" })
        .optional()
        .or(z.literal("")),
      linkedinProfileUrl: z
        .string()
        .regex(/^https:\/\/.+/, "Invalid URL: Please try again with https://")
        .regex(
          /^https:\/\/(www\.)?linkedin\.com\/.+/,
          "Invalid URL: Enter a valid LinkedIn link",
        )
        .regex(
          /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/,
          "Invalid URL: Do not use a mobile URL/excessively long URL",
        )
        .url({ message: "Invalid URL" })
        .optional()
        .or(z.literal("")),
      websiteUrl: z
        .string()
        .regex(
          /^https?:\/\/.+/,
          "Invalid URL: Please try again with https:// or http://",
        )
        .url({ message: "Invalid URL" })
        .optional()
        .or(z.literal("")),
      resumeUpload: z
        .instanceof(FileList)
        .superRefine((fileList, ctx) => {
          // Validate number of files is 0 or 1
          if (fileList.length !== 0 && fileList.length !== 1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Only 0 or 1 files allowed",
            });
          }

          if (fileList.length === 1) {
            // Validate type of object in FileList is File
            if (fileList[0] instanceof File) {
              // Validate file extension is PDF
              const fileExtension = fileList[0].name.split(".").pop();
              if (fileExtension !== "pdf") {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "Resume must be a PDF",
                });
              }

              // Validate file size is <= 5MB
              if (fileList[0].size > MINIO.MAX_RESUME_SIZE) {
                ctx.addIssue({
                  code: z.ZodIssueCode.too_big,
                  origin: "number",
                  maximum: MINIO.MAX_RESUME_SIZE,
                  inclusive: true,
                  exact: false,
                  message: "File too large: maximum 5MB",
                });
              }
            } else {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Object in FileList is undefined",
              });
            }
          }
        })
        .optional(),
      agreesToMLHCodeOfConduct: z.boolean().refine((val) => val === true, {
        message: "You must agree to the MLH Code of Conduct",
      }),
      agreesToMLHDataSharing: z.boolean().refine((val) => val === true, {
        message: "You must agree to the MLH data sharing terms",
      }),
      agreesToReceiveEmailsFromMLH: z.boolean().refine((val) => val === true, {
        message: "You must authorize MLH email updates",
      }),
    }),
    defaultValues: {
      firstName: "",
      lastName: "",
      gender: undefined,
      discordUser: "",
      email: "",
      phoneNumber: "",
      country: undefined,
      school: undefined,
      levelOfStudy: undefined,
      major: undefined,
      raceOrEthnicity: undefined,
      shirtSize: undefined,
      githubProfileUrl: "",
      linkedinProfileUrl: "",
      websiteUrl: "",
      resumeUrl: "",
      dob: "",
      gradDate: "",
      survey1: "",
      survey2: "",
      isFirstTime: false,
      foodAllergies: "",
      agreesToReceiveEmailsFromMLH: false,
      agreesToMLHCodeOfConduct: false,
      agreesToMLHDataSharing: false,
    },
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
  }, [applicationSubmitted, existingApplication, router]);

  useEffect(() => {
    if (prefillAppliedRef.current) return;

    if (previousHacker) {
      form.reset({
        firstName: previousHacker.firstName,
        lastName: previousHacker.lastName,
        gender: previousHacker.gender,
        raceOrEthnicity: previousHacker.raceOrEthnicity,
        discordUser: previousHacker.discordUser,
        email: previousHacker.email,
        phoneNumber: previousHacker.phoneNumber ?? undefined,
        country: previousHacker.country,
        school: previousHacker.school,
        levelOfStudy: previousHacker.levelOfStudy,
        major: previousHacker.major,
        shirtSize: previousHacker.shirtSize,
        githubProfileUrl: previousHacker.githubProfileUrl ?? undefined,
        linkedinProfileUrl: previousHacker.linkedinProfileUrl ?? undefined,
        websiteUrl: previousHacker.websiteUrl ?? undefined,
        resumeUrl: previousHacker.resumeUrl ?? "", // Keep existing resume URL
        dob: getDateInputValue(previousHacker.dob),
        gradDate: getDateInputValue(previousHacker.gradDate),
        survey1: "", // Keep survey answers empty for new applications
        survey2: "", // Keep survey answers empty for new applications
        isFirstTime: previousHacker.isFirstTime,
        foodAllergies: previousHacker.foodAllergies,
        agreesToReceiveEmailsFromMLH: false, // Always require fresh opt-in
        agreesToMLHCodeOfConduct: false, // Always require fresh consent
        agreesToMLHDataSharing: false, // Always require fresh consent
      });

      // Set selected allergies for the UI
      if (previousHacker.foodAllergies) {
        const allergies = previousHacker.foodAllergies.split(",");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedAllergies(allergies);
      }

      prefillAppliedRef.current = true;
      return;
    }

    if (previousHacker === null && memberProfile) {
      form.reset({
        firstName: memberProfile.firstName,
        lastName: memberProfile.lastName,
        gender: memberProfile.gender,
        raceOrEthnicity: memberProfile.raceOrEthnicity,
        discordUser: memberProfile.discordUser,
        email: memberProfile.email,
        phoneNumber: memberProfile.phoneNumber ?? undefined,
        country: undefined,
        school: memberProfile.school,
        levelOfStudy: memberProfile.levelOfStudy,
        major: memberProfile.major,
        shirtSize: memberProfile.shirtSize,
        githubProfileUrl: memberProfile.githubProfileUrl ?? undefined,
        linkedinProfileUrl: memberProfile.linkedinProfileUrl ?? undefined,
        websiteUrl: memberProfile.websiteUrl ?? undefined,
        resumeUrl: memberProfile.resumeUrl ?? "",
        dob: getDateInputValue(memberProfile.dob),
        gradDate: getDateInputValue(memberProfile.gradDate),
        survey1: "",
        survey2: "",
        isFirstTime: false,
        foodAllergies: "",
        agreesToReceiveEmailsFromMLH: false,
        agreesToMLHCodeOfConduct: false,
        agreesToMLHDataSharing: false,
      });

      setSelectedAllergies([]);
      prefillAppliedRef.current = true;
    }
  }, [memberProfile, previousHacker, form]);

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
  const isActiveQuestion = (id: string) =>
    currentStep.id === id ||
    currentStep.fields.some((fieldName) => fieldName === id);
  const isFinalStep = activeStep === APPLICATION_STEPS.length - 1;
  const progressStep = transitionStep ?? activeStep;
  const progressRatio = progressStep / (APPLICATION_STEPS.length - 1);

  const goToStep = async (nextStep: number) => {
    const boundedNextStep = Math.min(
      Math.max(nextStep, 0),
      APPLICATION_STEPS.length - 1,
    );

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

    if (stepTransitionMs <= 0) {
      setActiveStep(boundedNextStep);
      return true;
    }

    setTransitionStep(boundedNextStep);
    setIsStepTransitioning(true);
    return true;
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
    }, stepTransitionMs);

    return () => {
      window.clearTimeout(questionTimeout);
      window.clearTimeout(transitionTimeout);
    };
  }, [
    isStepTransitioning,
    questionTransitionMs,
    stepTransitionMs,
    transitionStep,
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
        className="kh-application-form bg-primary/5 text-foreground"
        data-application-visual={applicationVisualKey}
        aria-busy={loading}
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
            const latestApplication =
              existingApplication ??
              (await utils.hackerQuery.getHacker.fetch({
                hackathonName: hackathonId,
              }));

            if (latestApplication) {
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
              resumeUrl = await uploadResume.mutateAsync({
                fileName: file.name,
                fileContent: base64File,
              });
            }

            createHacker.mutate({
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
              hackathonName: hackathonId,
            });
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
          className="kh-application-shell relative h-svh min-h-svh overflow-hidden bg-[linear-gradient(135deg,#10071d_0%,#271148_48%,#0b0614_100%)] text-white"
          data-application-visual={applicationVisualKey}
        >
          <HackerApplicationBackground
            backgroundKey={applicationVisualKey}
            isTransitioning={!applicationSubmitted && isStepTransitioning}
            progress={progressRatio}
            transitionDirection={stepDirection}
          />
          {applicationSubmitted ? (
            <main
              aria-live="polite"
              className="kh-readable-text kh-submitted-screen relative z-10 flex h-svh min-h-svh w-full flex-col overflow-y-auto overscroll-contain px-5 py-8 sm:px-6 md:px-20 md:py-14"
            >
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-white/60">
                <span>{hackathonName}</span>
                <span>Submitted</span>
              </div>

              <section className="flex flex-1 items-center py-12">
                <div className="w-full max-w-4xl">
                  <div className="kh-submitted-mark bg-white/14 mb-8 inline-flex size-16 items-center justify-center rounded-full border border-white/35 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:size-20">
                    <CheckCircle2 className="size-9 text-white sm:size-11" />
                  </div>

                  <div className="kh-submitted-copy">
                    <p className="mb-4 text-sm font-black uppercase tracking-[0.24em] text-white/65">
                      Application confirmed
                    </p>
                    <h1 className="kh-step-title max-w-4xl text-5xl font-black leading-none tracking-normal text-white sm:text-6xl md:text-8xl">
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
                      className="h-12 rounded-full bg-white px-6 text-base font-black text-[#21103d] shadow-[0_18px_46px_rgba(0,0,0,0.42)] hover:bg-white/90"
                    >
                      <Link href="/dashboard">
                        Go to dashboard
                        <ArrowRight className="ml-2 size-4" />
                      </Link>
                    </Button>
                    <p className="text-sm font-semibold text-white/55">
                      Your dashboard will show your current application status.
                    </p>
                  </div>
                </div>
              </section>
            </main>
          ) : (
            <>
              <div className="kh-readable-text relative z-10 flex h-svh min-h-svh w-full flex-col overflow-y-auto overscroll-contain px-5 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 md:px-20 md:pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:pt-14">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-white/60">
                  <span>{currentStep.eyebrow}</span>
                  <span>
                    {activeStep + 1}/{APPLICATION_STEPS.length}
                  </span>
                </div>

                {previousHacker && activeStep === 0 && (
                  <div className="mt-6 max-w-xl border-l-2 border-white/35 pl-4 text-sm font-medium text-white/65">
                    Information from your previous application is pre-filled.
                  </div>
                )}

                <div className="kh-application-stage flex flex-1 items-start py-8 md:items-center md:py-10">
                  <div className="kh-application-panel w-full max-w-3xl">
                    <h1
                      key={currentStep.id}
                      className="kh-step-title text-4xl font-black leading-none tracking-normal text-white sm:text-5xl md:text-7xl"
                    >
                      {currentStep.title}
                    </h1>

                    <div
                      className={cn(
                        "kh-step-content",
                        "animate-in fade-in mt-10 duration-200 sm:mt-14 md:mt-16",
                        stepDirection === "forward"
                          ? "slide-in-from-right-4"
                          : "slide-in-from-left-4",
                        "[&_input]:h-12 [&_input]:rounded-none [&_input]:border-x-0 [&_input]:border-b-2 [&_input]:border-t-0 [&_input]:border-white/75 [&_input]:bg-transparent [&_input]:px-0 [&_input]:text-lg [&_input]:font-medium [&_input]:text-white [&_input]:shadow-none [&_input]:transition-colors [&_input]:placeholder:text-white/35 [&_input]:focus-visible:border-white [&_input]:focus-visible:ring-0 sm:[&_input]:h-14 sm:[&_input]:text-xl md:[&_input]:text-2xl",
                        "[&_textarea]:min-h-32 [&_textarea]:rounded-none [&_textarea]:border-x-0 [&_textarea]:border-b-2 [&_textarea]:border-t-0 [&_textarea]:border-white/75 [&_textarea]:bg-transparent [&_textarea]:px-0 [&_textarea]:text-lg [&_textarea]:font-medium [&_textarea]:text-white [&_textarea]:shadow-none [&_textarea]:transition-colors [&_textarea]:placeholder:text-white/35 [&_textarea]:focus-visible:border-white [&_textarea]:focus-visible:ring-0 sm:[&_textarea]:min-h-36 sm:[&_textarea]:text-xl",
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
                                    field.value || "Select your gender"
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
                                    field.value ||
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
                                  className="cursor-pointer file:mr-4 file:rounded-full file:border file:border-white/35 file:bg-white/10 file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-white/15"
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
                                highlightedCheckboxRowClassName,
                                !isActiveQuestion("isFirstTime") && "hidden",
                              )}
                            >
                              <FormControl>
                                <Checkbox
                                  checked={!!field.value}
                                  onCheckedChange={field.onChange}
                                  className={cn(
                                    checkboxClassName,
                                    highlightedCheckboxClassName,
                                  )}
                                />
                              </FormControl>
                              <div className="min-w-0 flex-1 space-y-1 leading-none">
                                <FormLabel
                                  className={highlightedCheckboxLabelClassName}
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
                          render={({ field, fieldState }) => (
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
                  onClick={() => void goToStep(activeStep - 1)}
                  disabled={activeStep === 0 || loading || isStepTransitioning}
                  size="icon"
                  className={cn(
                    secondaryActionButtonClassName,
                    "pointer-events-auto",
                  )}
                  aria-label="Back"
                  title="Back"
                >
                  <ArrowLeft className="h-6 w-6 sm:h-7 sm:w-7" />
                </Button>

                {isFinalStep ? (
                  <div className="pointer-events-auto flex min-w-0 items-center gap-3">
                    {loading && (
                      <div
                        aria-live="polite"
                        className="kh-submit-loading bg-[#12071f]/72 flex items-center gap-2 rounded-full border border-white/30 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/85 shadow-[0_16px_42px_rgba(0,0,0,0.32)] backdrop-blur-md sm:text-sm"
                        role="status"
                      >
                        <Loader2
                          aria-hidden="true"
                          className="size-4 animate-spin"
                        />
                        <span>Submitting</span>
                      </div>
                    )}
                    <Button
                      type="submit"
                      disabled={loading || isStepTransitioning}
                      size="icon"
                      className={cn(
                        actionButtonClassName,
                        "pointer-events-auto",
                        loading && "cursor-wait disabled:opacity-100",
                      )}
                      aria-label={
                        loading
                          ? "Submitting application"
                          : "Submit application"
                      }
                      title={
                        loading
                          ? "Submitting application"
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
                    onClick={() => void goToStep(activeStep + 1)}
                    disabled={loading || isStepTransitioning}
                    size="icon"
                    className={cn(actionButtonClassName, "pointer-events-auto")}
                    aria-label="Next"
                    title="Next"
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
