"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import QRCode from "qrcode";

import type {
  HackerAgreementAcceptanceInput,
  HackerApplicationDto,
  HackerApplicationStatus,
  HackerProfileDto,
  PublicHackathonDto,
} from "@forge/hacker-sdk";
import { WITHDRAWAL_ACKNOWLEDGEMENT } from "@forge/hacker-sdk";
import {
  HackerSdkProvider,
  useConfirmHackerAttendance,
  useHackerApplication,
  useHackerDashboard,
  useHackerResume,
  useHackerSchedule,
  useHackerSdkClient,
  useHackerSession,
  useIssueHackerCheckInPass,
  usePublicHackathon,
  useSubmitHackerApplication,
  useUpdateHackerApplication,
  useUpdateHackerProfile,
  useUploadHackerResume,
  useWithdrawHackerApplication,
} from "@forge/hacker-sdk/react";

import type {
  HackerApplicationFormValues,
  PortalApplicationInput,
} from "./portal-form-schema";
import { canEditHackerProfile } from "./portal-actions";
import { portalFormSchema } from "./portal-form-schema";

export type {
  HackerApplicationFormValues,
  HackerProfileFormValues,
  PortalApplicationInput,
} from "./portal-form-schema";

export { getHackerLifecycleState } from "./portal-lifecycle";

export interface HackathonPortalConfig {
  routes: {
    apply: string;
    dashboard: string;
    home: string;
    profile: string;
  };
  termsUrl: string;
  guideUrl: string;
  copy: {
    applicationName: string;
    supportChannelUrl: string;
  };
}

const PortalConfigContext = createContext<HackathonPortalConfig | null>(null);

export const APPLICATION_STEPS = [
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

export type ApplicationFieldName =
  (typeof APPLICATION_STEPS)[number]["fields"][number];
export type HackerStatus = HackerApplicationStatus;

export interface PortalParticipant extends HackerApplicationFormValues {
  points: number;
  status: HackerStatus;
  timeApplied: Date;
  timeConfirmed: Date | null;
}

const DEFAULT_VALUES: Partial<HackerApplicationFormValues> = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  dob: "",
  gradDate: "",
  survey1: "",
  survey2: "",
  isFirstTime: false,
  foodAllergies: "",
  githubProfileUrl: "",
  linkedinProfileUrl: "",
  websiteUrl: "",
  resumeUrl: "",
  agreesToMLHCodeOfConduct: false,
  agreesToMLHDataSharing: false,
  agreesToReceiveEmailsFromMLH: false,
};

function idempotencyKey(operation: string) {
  return `${operation}:${crypto.randomUUID()}`;
}

function useIdempotencyLease(operation: string) {
  const keyRef = useRef<string | null>(null);
  const acquire = useCallback(() => {
    keyRef.current ??= idempotencyKey(operation);
    return keyRef.current;
  }, [operation]);
  const release = useCallback(() => {
    keyRef.current = null;
  }, []);
  return { acquire, release };
}

function dateOnly(value: string) {
  return value.slice(0, 10);
}

function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function profileInput(input: PortalApplicationInput) {
  return {
    country: input.country,
    dob: dateOnly(input.dob),
    email: input.email,
    firstName: input.firstName,
    foodAllergies: nullable(input.foodAllergies),
    gender: input.gender ?? "Prefer not to answer",
    githubProfileUrl: nullable(input.githubProfileUrl),
    gradDate: dateOnly(input.gradDate),
    lastName: input.lastName,
    levelOfStudy: input.levelOfStudy,
    linkedinProfileUrl: nullable(input.linkedinProfileUrl),
    major: input.major,
    phoneNumber: input.phoneNumber,
    raceOrEthnicity: input.raceOrEthnicity ?? "Prefer not to answer",
    school: input.school,
    shirtSize: input.shirtSize,
    websiteUrl: nullable(input.websiteUrl),
  };
}

function toParticipant(
  profile: HackerProfileDto | null,
  application: HackerApplicationDto | null,
  resumeUrl: string,
): PortalParticipant | null {
  if (!profile || !application) return null;
  return {
    ...profile,
    dob: dateOnly(profile.dob),
    gradDate: dateOnly(profile.gradDate),
    githubProfileUrl: profile.githubProfileUrl ?? "",
    linkedinProfileUrl: profile.linkedinProfileUrl ?? "",
    websiteUrl: profile.websiteUrl ?? "",
    foodAllergies: profile.foodAllergies ?? "",
    survey1: application.survey1 ?? "",
    survey2: application.survey2 ?? "",
    isFirstTime: application.firstTime ?? false,
    resumeUrl,
    agreesToMLHCodeOfConduct: false,
    agreesToMLHDataSharing: false,
    agreesToReceiveEmailsFromMLH: false,
    points: 0,
    status: application.status,
    timeApplied: new Date(application.submittedAt),
    timeConfirmed: application.confirmedAt
      ? new Date(application.confirmedAt)
      : null,
  };
}

function toHackathon(hackathon: PublicHackathonDto) {
  return {
    ...hackathon,
    applicationBackgroundEnabled: true,
    applicationBackgroundKey: hackathon.theme,
    applicationOpen: new Date(hackathon.applicationOpen),
    applicationDeadline: new Date(hackathon.applicationDeadline),
    confirmationDeadline: new Date(hackathon.confirmationDeadline),
    startDate: new Date(hackathon.startDate),
    endDate: new Date(hackathon.endDate),
  };
}

function applicationPrefill(
  profile: HackerProfileDto | null,
  resumeUrl: string,
) {
  if (!profile) return null;
  return {
    source: "hacker" as const,
    selectedAllergies: profile.foodAllergies?.split(",").filter(Boolean) ?? [],
    values: {
      ...profile,
      dob: dateOnly(profile.dob),
      gradDate: dateOnly(profile.gradDate),
      githubProfileUrl: profile.githubProfileUrl ?? "",
      linkedinProfileUrl: profile.linkedinProfileUrl ?? "",
      websiteUrl: profile.websiteUrl ?? "",
      foodAllergies: profile.foodAllergies ?? "",
      resumeUrl,
      survey1: "",
      survey2: "",
      isFirstTime: false,
      agreesToMLHCodeOfConduct: false,
      agreesToMLHDataSharing: false,
      agreesToReceiveEmailsFromMLH: false,
    } satisfies Partial<HackerApplicationFormValues>,
  };
}

export function HackathonPortalProvider({
  children,
  config,
  portalKey,
}: {
  children: ReactNode;
  config: HackathonPortalConfig;
  portalKey: string;
}) {
  return (
    <PortalConfigContext.Provider value={config}>
      <HackerSdkProvider portalKey={portalKey}>{children}</HackerSdkProvider>
    </PortalConfigContext.Provider>
  );
}

function usePortalConfig() {
  const config = useContext(PortalConfigContext);
  if (!config) throw new Error("Portal hooks require HackathonPortalProvider.");
  return config;
}

export function PortalAuthBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const session = useHackerSession();
  const { client } = useHackerSdkClient();

  useEffect(() => {
    if (session.data && !session.data.authenticated) {
      window.location.replace(client.signInPath(pathname));
    }
  }, [client, pathname, session.data]);

  if (session.isError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07150f] px-4 text-white">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-bold">Secure sign-in did not load.</h1>
          <p className="text-sm text-white/70">
            Check your connection, then retry the session request.
          </p>
          <button
            className="rounded-md bg-[#d7ff76] px-5 py-3 font-bold text-[#07150f]"
            disabled={session.isFetching}
            onClick={() => void session.refetch()}
            type="button"
          >
            {session.isFetching ? "Retrying…" : "Try again"}
          </button>
        </div>
      </main>
    );
  }

  if (!session.data?.authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07150f] px-4 text-white">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#d7ff76]">
          Opening secure hacker sign-in…
        </p>
      </main>
    );
  }

  return children;
}

export function useHackerApplicationFlow({
  hackathonStartDate: _hackathonStartDate,
}: {
  hackathonStartDate: string;
}) {
  const contextQuery = useHackerApplication();
  const submitMutation = useSubmitHackerApplication();
  const uploadMutation = useUploadHackerResume();
  const [activeStep, setActiveStep] = useState(0);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isStepTransitioning, setIsStepTransitioning] = useState(false);
  const [stepDirection, setStepDirection] = useState<"forward" | "back">(
    "forward",
  );
  const [tosError, setTosError] = useState(false);
  const [transitionStep, setTransitionStep] = useState<number | null>(null);
  const submitKey = useIdempotencyLease("submit");
  const resumeKey = useIdempotencyLease("resume");
  const resumeUrl = contextQuery.data?.resume
    ? "/api/hacker-sdk/resume/download"
    : "";

  useEffect(() => {
    const timer = window.setTimeout(() => setHasHydrated(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  return {
    activeStep,
    applicationContext: contextQuery.data
      ? {
          existingApplication: toParticipant(
            contextQuery.data.profile,
            contextQuery.data.application,
            resumeUrl,
          ),
          previousHacker: contextQuery.data.profile,
        }
      : undefined,
    applicationPrefill: applicationPrefill(
      contextQuery.data?.profile ?? null,
      resumeUrl,
    ),
    applicationSchema: portalFormSchema,
    applicationAgreements:
      contextQuery.data?.agreements.filter(
        (definition) => definition.stage === "application",
      ) ?? [],
    agreementAcceptances: contextQuery.data?.agreementAcceptances ?? [],
    applicationSubmitted,
    contextQuery,
    defaultValues: DEFAULT_VALUES,
    hasExistingApplication: Boolean(contextQuery.data?.application),
    hasHydrated,
    isStepTransitioning,
    setActiveStep,
    setApplicationSubmitted,
    setIsStepTransitioning,
    setStepDirection,
    setTosError,
    setTransitionStep,
    stepDirection,
    submitApplication: async (
      input: PortalApplicationInput,
      agreements: HackerAgreementAcceptanceInput[],
    ) => {
      const result = await submitMutation.mutateAsync({
        agreements,
        firstTime: input.isFirstTime,
        idempotencyKey: submitKey.acquire(),
        profile: profileInput(input),
        survey1: input.survey1,
        survey2: input.survey2,
      });
      submitKey.release();
      return result;
    },
    submitMutation,
    tosError,
    transitionStep,
    uploadResume: async (file: File) => {
      await uploadMutation.mutateAsync({
        file,
        fileName: file.name,
        idempotencyKey: resumeKey.acquire(),
      });
      resumeKey.release();
      return "/api/hacker-sdk/resume/download";
    },
    uploadMutation,
  };
}

export function useHackerDashboardFlow() {
  const config = usePortalConfig();
  const publicQuery = usePublicHackathon();
  const dashboardQuery = useHackerDashboard();
  const resumeQuery = useHackerResume();
  const scheduleQuery = useHackerSchedule();
  const issuePassMutation = useIssueHackerCheckInPass();
  const confirmMutation = useConfirmHackerAttendance();
  const withdrawMutation = useWithdrawHackerApplication();
  const { client } = useHackerSdkClient();
  const confirmKey = useIdempotencyLease("confirm");
  const withdrawKey = useIdempotencyLease("withdraw");
  const checkInPassKey = useIdempotencyLease("check-in-pass");
  const qrMutation = useMutation({
    mutationFn: async () => {
      const pass = await issuePassMutation.mutateAsync({
        idempotencyKey: checkInPassKey.acquire(),
      });
      checkInPassKey.release();
      return QRCode.toDataURL(pass.payload, { margin: 1, width: 320 });
    },
  });
  const reportIssueMutation = useMutation({
    mutationFn: async (_description: string) => {
      await navigator.clipboard.writeText(_description).catch(() => undefined);
      window.open(
        config.copy.supportChannelUrl,
        "_blank",
        "noopener,noreferrer",
      );
      return { submitted: true as const };
    },
  });
  const application = dashboardQuery.data?.application ?? null;
  const profile = dashboardQuery.data?.profile ?? null;
  const participant = toParticipant(
    profile,
    application,
    dashboardQuery.data?.resume ? client.resumeDownloadPath : "",
  );
  const confirmAction = dashboardQuery.data?.allowedActions.find(
    (action) => action.action === "confirm",
  );
  const hackathon = publicQuery.data
    ? toHackathon(publicQuery.data)
    : undefined;
  const dashboard =
    hackathon && dashboardQuery.data
      ? {
          confirmedCount:
            confirmAction?.reason === "capacity_reached"
              ? (hackathon.confirmationCapacity ?? 0)
              : 0,
          hackathon,
          participant,
        }
      : undefined;

  return {
    config,
    confirmationAgreements:
      publicQuery.data?.agreements.filter(
        (definition) => definition.stage === "confirmation",
      ) ?? [],
    confirmAttendance: async (agreements: HackerAgreementAcceptanceInput[]) => {
      const result = await confirmMutation.mutateAsync({
        agreements,
        idempotencyKey: confirmKey.acquire(),
      });
      confirmKey.release();
      return result;
    },
    confirmMutation,
    dashboard,
    dashboardQuery: {
      ...dashboardQuery,
      isPending: dashboardQuery.isPending || publicQuery.isPending,
      isError: dashboardQuery.isError || publicQuery.isError,
    },
    loadQRCode: qrMutation.mutateAsync,
    qrCode: qrMutation.data,
    qrMutation,
    reportIssue: reportIssueMutation.mutateAsync,
    reportIssueMutation,
    resumeUrl: dashboardQuery.data?.resume
      ? client.resumeDownloadPath
      : undefined,
    resumeQuery,
    schedule:
      scheduleQuery.data?.events.map((event) => ({
        ...event,
        startDateTime: new Date(event.startAt),
        endDateTime: new Date(event.endAt),
      })) ?? [],
    scheduleQuery,
    withdrawAttendance: async () => {
      const result = await withdrawMutation.mutateAsync({
        acknowledgement: WITHDRAWAL_ACKNOWLEDGEMENT,
        idempotencyKey: withdrawKey.acquire(),
      });
      withdrawKey.release();
      return result;
    },
    withdrawMutation,
  };
}

export function useHackerProfileFlow() {
  const config = usePortalConfig();
  const dashboardQuery = useHackerDashboard();
  const applicationQuery = useHackerApplication();
  const updateProfileMutation = useUpdateHackerProfile();
  const updateApplicationMutation = useUpdateHackerApplication();
  const uploadMutation = useUploadHackerResume();
  const { client } = useHackerSdkClient();
  const profileKey = useIdempotencyLease("profile");
  const applicationKey = useIdempotencyLease("application");
  const resumeKey = useIdempotencyLease("resume");
  const participant = toParticipant(
    dashboardQuery.data?.profile ?? null,
    dashboardQuery.data?.application ?? null,
    dashboardQuery.data?.resume ? client.resumeDownloadPath : "",
  );
  const updateMutation = {
    error: updateProfileMutation.error ?? updateApplicationMutation.error,
    isPending:
      updateProfileMutation.isPending || updateApplicationMutation.isPending,
  };

  return {
    applicationAgreements:
      applicationQuery.data?.agreements.filter(
        (definition) => definition.stage === "application",
      ) ?? [],
    agreementAcceptances: applicationQuery.data?.agreementAcceptances ?? [],
    editable: canEditHackerProfile(
      applicationQuery.data?.editable === true,
      dashboardQuery.data?.allowedActions,
    ),
    participant,
    dashboardQuery,
    profileSchema: portalFormSchema,
    reportIssue: async (_description: string) => {
      await navigator.clipboard.writeText(_description).catch(() => undefined);
      window.open(
        config.copy.supportChannelUrl,
        "_blank",
        "noopener,noreferrer",
      );
      return { submitted: true as const };
    },
    reportIssueMutation: { isPending: false },
    updateProfile: async (
      input: PortalApplicationInput,
      agreements: HackerAgreementAcceptanceInput[],
    ) => {
      const revision = dashboardQuery.data?.profile?.revision;
      if (!revision) throw new Error("Your profile could not be loaded.");
      await updateApplicationMutation.mutateAsync({
        agreements,
        firstTime: input.isFirstTime,
        idempotencyKey: applicationKey.acquire(),
        survey1: input.survey1,
        survey2: input.survey2,
      });
      applicationKey.release();
      await updateProfileMutation.mutateAsync({
        expectedRevision: revision,
        idempotencyKey: profileKey.acquire(),
        profile: profileInput(input),
      });
      profileKey.release();
    },
    updateMutation,
    uploadResume: async (file: File) => {
      await uploadMutation.mutateAsync({
        file,
        fileName: file.name,
        idempotencyKey: resumeKey.acquire(),
      });
      resumeKey.release();
      return client.resumeDownloadPath;
    },
    uploadMutation,
  };
}

export async function signOut({ redirectTo }: { redirectTo: string }) {
  const response = await fetch("/api/hacker-sdk/sign-out", {
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  if (!response.ok) throw new Error("Could not sign out.");
  window.location.assign(redirectTo);
}
