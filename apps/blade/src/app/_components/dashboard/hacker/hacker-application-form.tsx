"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Send } from "lucide-react";
import { z } from "zod";

import { FORMS, MINIO } from "@forge/consts";
import { InsertHackerSchema } from "@forge/db/schemas/knight-hacks";
import { HACKATHON_TEMPLATE_IDS } from "@forge/email/client";
import { cn } from "@forge/ui";
import { Badge } from "@forge/ui/badge";
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
import { getHackerApplicationBackground } from "./hackbackgrounds";
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
const agreementLinkClassName =
  "font-semibold text-white underline underline-offset-4 decoration-white/35 transition-colors hover:text-white/80 hover:decoration-white";
const actionButtonClassName =
  "kh-nav-button size-14 rounded-full bg-white p-0 text-[#21103d] shadow-[0_18px_46px_rgba(0,0,0,0.42)] hover:bg-white/90 sm:size-16";
const secondaryActionButtonClassName =
  "kh-nav-button size-14 rounded-full border-white/45 bg-[#12071f]/75 p-0 text-white shadow-[0_18px_46px_rgba(0,0,0,0.42)] hover:bg-[#12071f]/90 hover:text-white disabled:opacity-35 sm:size-16";

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
  animation: khTitleRise 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.kh-readable-text {
  text-shadow:
    0 2px 18px rgba(0, 0, 0, 0.55),
    0 1px 2px rgba(0, 0, 0, 0.55);
}

.kh-step-content > section > div:not(.hidden) {
  animation: khFieldIn 460ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.kh-step-content > section > div:not(.hidden):nth-child(2) { animation-delay: 45ms; }
.kh-step-content > section > div:not(.hidden):nth-child(3) { animation-delay: 90ms; }
.kh-step-content > section > div:not(.hidden):nth-child(4) { animation-delay: 135ms; }
.kh-step-content > section > div:not(.hidden):nth-child(5) { animation-delay: 180ms; }
.kh-step-content > section > div:not(.hidden):nth-child(6) { animation-delay: 225ms; }
.kh-step-content > section > div:not(.hidden):nth-child(7) { animation-delay: 270ms; }
.kh-step-content > section > div:not(.hidden):nth-child(8) { animation-delay: 315ms; }

.kh-step-content :is(input, textarea, button):focus-visible {
  animation: khUnderlinePulse 1.8s ease-in-out infinite;
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

@media (orientation: landscape) and (max-height: 560px) {
  .kh-readable-text {
    min-height: 100svh;
    padding-block: 0.75rem calc(4.75rem + env(safe-area-inset-bottom));
    padding-inline: max(1rem, env(safe-area-inset-left)) max(1rem, env(safe-area-inset-right));
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
    inset-inline: max(1rem, env(safe-area-inset-left)) max(1rem, env(safe-area-inset-right));
    bottom: calc(0.75rem + env(safe-area-inset-bottom));
  }

  .kh-application-nav .kh-nav-button {
    width: clamp(3.15rem, 12vh, 3.75rem);
    height: clamp(3.15rem, 12vh, 3.75rem);
  }
}

@media (orientation: landscape) and (max-height: 430px) {
  .kh-readable-text {
    padding-block: 0.6rem calc(4.15rem + env(safe-area-inset-bottom));
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

function getComboBoxDisplayValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
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
  const [loading, setLoading] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [transitionStep, setTransitionStep] = useState<number | null>(null);
  const [isStepTransitioning, setIsStepTransitioning] = useState(false);
  const [stepDirection, setStepDirection] = useState<"forward" | "back">(
    "forward",
  );
  const pendingMobileFocusField = useRef<ApplicationFieldName | null>(null);
  const utils = api.useUtils();
  const applicationVisualConfig = getHackerApplicationBackground(
    applicationBackgroundKey,
  );
  const stepTransitionMs = applicationVisualConfig.stepTransitionMs ?? 0;
  const questionTransitionMs =
    applicationVisualConfig.questionTransitionMs ?? stepTransitionMs;

  // Get previous hacker profile to pre-fill form
  const { data: previousHacker } = api.hackathon.getPreviousHacker.useQuery();

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
      toast.success("Application submitted successfully!");
      // user gets sent back to homepage upon successful form submission
      router.push("/dashboard");
      router.refresh();
    },
    onError() {
      toast.error("Oops! Something went wrong. Please try again later.");
    },
    onSettled() {
      setLoading(false);
    },
  });

  const sendEmail = api.email.sendEmail.useMutation();

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
        shirtSize: previousHacker.shirtSize,
        githubProfileUrl: previousHacker.githubProfileUrl ?? undefined,
        linkedinProfileUrl: previousHacker.linkedinProfileUrl ?? undefined,
        websiteUrl: previousHacker.websiteUrl ?? undefined,
        resumeUrl: previousHacker.resumeUrl, // Keep existing resume URL
        dob: getDateInputValue(previousHacker.dob),
        gradDate: getDateInputValue(previousHacker.gradDate),
        survey1: "", // Keep survey answers empty for new applications
        survey2: "", // Keep survey answers empty for new applications
        isFirstTime: previousHacker.isFirstTime,
        foodAllergies: previousHacker.foodAllergies,
        agreesToReceiveEmailsFromMLH:
          previousHacker.agreesToReceiveEmailsFromMLH,
        agreesToMLHCodeOfConduct: false, // Always require fresh consent
        agreesToMLHDataSharing: false, // Always require fresh consent
      });

      // Set selected allergies for the UI
      if (previousHacker.foodAllergies) {
        const allergies = previousHacker.foodAllergies.split(",");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedAllergies(allergies);
      }
    }
  }, [previousHacker, form]);

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

  return (
    <Form {...form}>
      <style>{applicationAnimationStyles}</style>
      <form
        className="min-h-screen bg-primary/5 text-foreground"
        noValidate
        onKeyDown={(event) => {
          void handleMobileInputEnter(event);
        }}
        onSubmit={form.handleSubmit(async (values) => {
          setLoading(true);

          if (!tosAccepted) {
            toast.error("Please Accept the Knight Hacks Terms of Service");
            setLoading(false);
            return;
          }

          try {
            let resumeUrl = "";
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

            sendEmail.mutate({
              from: "donotreply@knighthacks.org",
              to: values.email,
              subject: "Knight Hacks VIII - We recieved your application!",
              template_id: HACKATHON_TEMPLATE_IDS.Apply,
              data: {
                name: values.firstName,
                hackathon: hackathonName,
              },
            });
          } catch (error) {
            // TODO: look into not logging into the console
            // eslint-disable-next-line no-console
            console.error("Error uploading resume or creating hacker:", error);
            toast.error(
              "Something went wrong while processing your application.",
            );
          }
        })}
      >
        <div className="kh-application-shell relative min-h-svh overflow-x-hidden bg-[linear-gradient(135deg,#10071d_0%,#271148_48%,#0b0614_100%)] text-white">
          <HackerApplicationBackground
            backgroundKey={applicationBackgroundKey}
            isTransitioning={isStepTransitioning}
            progress={progressRatio}
            transitionDirection={stepDirection}
          />
          <div className="kh-readable-text relative z-10 flex min-h-svh w-full flex-col px-5 pb-32 pt-5 sm:px-6 md:px-20 md:pb-28 md:pt-14">
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
                    "animate-in fade-in mt-10 duration-500 sm:mt-14 md:mt-16",
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
                            <Input type="text" placeholder="Lenny" {...field} />
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
                          className={cn(!isActiveQuestion("email") && "hidden")}
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
                          <FieldLabel optional>Phone Number</FieldLabel>
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
                          <FieldLabel required>Country of Residence</FieldLabel>
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
                              onItemSelect={(gender) => field.onChange(gender)}
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
                            !isActiveQuestion("raceOrEthnicity") && "hidden",
                          )}
                        >
                          <FieldLabel optional>Race or Ethnicity</FieldLabel>
                          <FormControl>
                            <ResponsiveComboBox
                              items={FORMS.RACES_OR_ETHNICITIES}
                              renderItem={(race) => <div>{race}</div>}
                              getItemValue={(race) => race}
                              getItemLabel={(race) => race}
                              value={field.value}
                              onItemSelect={(race) => field.onChange(race)}
                              buttonPlaceholder={
                                field.value || "Select your race or ethnicity"
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
                              onItemSelect={(level) => field.onChange(level)}
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
                              onItemSelect={(school) => field.onChange(school)}
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
                          className={cn(!isActiveQuestion("major") && "hidden")}
                        >
                          <FieldLabel required>Major of Study</FieldLabel>
                          <FormControl>
                            <ResponsiveComboBox
                              items={FORMS.MAJORS}
                              renderItem={(major) => <div>{major}</div>}
                              getItemValue={(major) => major}
                              getItemLabel={(major) => major}
                              value={field.value}
                              onItemSelect={(major) => field.onChange(major)}
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
                            !isActiveQuestion("githubProfileUrl") && "hidden",
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
                            !isActiveQuestion("linkedinProfileUrl") && "hidden",
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
                          <FieldLabel optional>Resume</FieldLabel>
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
                        return (
                          <FormItem
                            className={cn(
                              !isActiveQuestion("foodAllergies") && "hidden",
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
                                    className="flex h-auto min-h-14 w-full flex-wrap items-center justify-start gap-2 rounded-none border-x-0 border-b-2 border-t-0 border-white/75 bg-transparent px-0 py-3 text-left text-white shadow-none transition-colors hover:border-white hover:bg-transparent hover:text-white"
                                  >
                                    <span className="text-sm font-semibold text-white/45">
                                      Select Allergies:
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                      {selectedAllergies.length > 0 ? (
                                        selectedAllergies.map((allergy) => (
                                          <Badge
                                            key={allergy}
                                            variant="secondary"
                                            className="border border-white/20 bg-white/10 px-2 py-1 text-xs text-white"
                                          >
                                            {allergy}
                                          </Badge>
                                        ))
                                      ) : (
                                        <span className="text-sm font-medium text-white/40">
                                          None selected
                                        </span>
                                      )}
                                    </div>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  align="start"
                                  className="min-w-(--radix-popover-trigger-width) w-full max-w-none border-white/15 bg-[#160828]/95 p-1 text-white shadow-2xl"
                                >
                                  <div className="flex w-full flex-col">
                                    {FORMS.ALLERGIES.map((allergy) => (
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
                                        className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
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
                              className={checkboxClassName}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className={checkboxLabelClassName}>
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
                      render={({ field }) => (
                        <FormItem
                          className={cn(
                            "flex flex-row items-start gap-3 space-y-0",
                            !isActiveQuestion("agreesToMLHCodeOfConduct") &&
                              "hidden",
                          )}
                        >
                          <FormControl>
                            <Checkbox
                              checked={!!field.value}
                              onCheckedChange={field.onChange}
                              className={checkboxClassName}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className={checkboxLabelClassName}>
                              I have read and agree to the{" "}
                              <Link
                                href="https://github.com/MLH/mlh-policies/blob/main/code-of-conduct.md"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={agreementLinkClassName}
                              >
                                MLH Code of Conduct
                              </Link>
                              . <span className={requiredMarkClassName}>*</span>
                            </FormLabel>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="agreesToMLHDataSharing"
                      render={({ field }) => (
                        <FormItem
                          className={cn(
                            "flex flex-row items-start gap-3 space-y-0",
                            !isActiveQuestion("agreesToMLHDataSharing") &&
                              "hidden",
                          )}
                        >
                          <FormControl>
                            <Checkbox
                              checked={!!field.value}
                              onCheckedChange={field.onChange}
                              className={checkboxClassName}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className={checkboxLabelClassName}>
                              I authorize you to share my
                              application/registration information with Major
                              League Hacking for event administration, ranking,
                              and MLH administration in-line with the{" "}
                              <Link
                                href="https://github.com/MLH/mlh-policies/blob/main/privacy-policy.md"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={agreementLinkClassName}
                              >
                                MLH Privacy Policy
                              </Link>
                              . I further agree to the terms of both the{" "}
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
                              . <span className={requiredMarkClassName}>*</span>
                            </FormLabel>
                          </div>
                          <FormMessage />
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
                            !isActiveQuestion("agreesToReceiveEmailsFromMLH") &&
                              "hidden",
                          )}
                        >
                          <FormControl>
                            <Checkbox
                              checked={!!field.value}
                              onCheckedChange={field.onChange}
                              className={checkboxClassName}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className={checkboxLabelClassName}>
                              I authorize MLH to send me occasional emails about
                              relevant events, career opportunities, and
                              community announcements.
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <div
                      className={cn(
                        "flex flex-row items-start gap-3 space-y-0 py-2",
                        !isActiveQuestion("tosAccepted") && "hidden",
                      )}
                    >
                      <div>
                        <Checkbox
                          checked={tosAccepted}
                          onCheckedChange={(v) => setTosAccepted(!!v)}
                          className={checkboxClassName}
                          aria-labelledby="tos-visual-label"
                        />
                      </div>

                      <div className="space-y-1 leading-none">
                        <div
                          id="tos-visual-label"
                          className={checkboxLabelClassName}
                        >
                          By checking this box you acknowledge that you agree to
                          the{" "}
                          <Link
                            href="https://knight-hacks.notion.site/kh-25-tos"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={agreementLinkClassName}
                          >
                            Knight Hacks Terms of Service
                          </Link>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="kh-application-nav fixed inset-x-5 bottom-5 z-30 flex items-center justify-between [bottom:calc(1.25rem+env(safe-area-inset-bottom))] md:inset-x-16 md:bottom-10">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void goToStep(activeStep - 1)}
                    disabled={
                      activeStep === 0 || loading || isStepTransitioning
                    }
                    size="icon"
                    className={secondaryActionButtonClassName}
                    aria-label="Back"
                    title="Back"
                  >
                    <ArrowLeft className="h-6 w-6 sm:h-7 sm:w-7" />
                  </Button>

                  {isFinalStep ? (
                    <Button
                      type="submit"
                      disabled={loading || isStepTransitioning}
                      size="icon"
                      className={actionButtonClassName}
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
                  ) : (
                    <Button
                      type="button"
                      onClick={() => void goToStep(activeStep + 1)}
                      disabled={loading || isStepTransitioning}
                      size="icon"
                      className={actionButtonClassName}
                      aria-label="Next"
                      title="Next"
                    >
                      <ArrowRight className="h-6 w-6 sm:h-7 sm:w-7" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
