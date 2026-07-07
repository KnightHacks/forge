"use client";

import type { QueryClient } from "@tanstack/react-query";
import type { TRPCClient } from "@trpc/client";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createTRPCClient, unstable_httpBatchStreamLink } from "@trpc/client";
import SuperJSON from "superjson";

import type { ParticipantRouter } from "@forge/api/participant";

import type { HackathonPortalConfig } from "./config";
import type { PortalApplicationInput } from "./types";
import {
  createHackerApplicationClientSchema,
  createHackerProfileClientSchema,
  getHackerApplicationPrefill,
  HACKER_APPLICATION_DEFAULT_VALUES,
} from "./application-schema";
import { createHackathonQueryClient } from "./query-client";

export type {
  HackerApplicationFormValues,
  HackerProfileFormValues,
} from "./application-schema";

const PortalConfigContext = createContext<HackathonPortalConfig | null>(null);
type PortalTRPCClient = TRPCClient<ParticipantRouter>;

const PortalClientContext = createContext<PortalTRPCClient | null>(null);
let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") return createHackathonQueryClient();
  return (browserQueryClient ??= createHackathonQueryClient());
}

export function HackathonPortalProvider({
  children,
  config,
}: {
  children: ReactNode;
  config: HackathonPortalConfig;
}) {
  const queryClient = getQueryClient();
  const [trpcClient] = useState(() =>
    createTRPCClient<ParticipantRouter>({
      links: [
        unstable_httpBatchStreamLink({
          transformer: SuperJSON,
          url: "/api/trpc",
          headers: { "x-trpc-source": "hackathon-portal" },
        }),
      ],
    }),
  );

  return (
    <PortalConfigContext.Provider value={config}>
      <PortalClientContext.Provider value={trpcClient}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </PortalClientContext.Provider>
    </PortalConfigContext.Provider>
  );
}

export function useHackathonPortalConfig() {
  const config = useContext(PortalConfigContext);
  if (!config) {
    throw new Error(
      "useHackathonPortalConfig must be used inside HackathonPortalProvider.",
    );
  }
  return config;
}

function usePortalClient() {
  const client = useContext(PortalClientContext);
  if (!client) {
    throw new Error(
      "Hackathon portal hooks must be used inside HackathonPortalProvider.",
    );
  }
  return client;
}

function portalQueryKey(name: string, hackathonName: string) {
  return ["hackathon-portal", name, hackathonName] as const;
}

export function useHackerApplicationFlow({
  hackathonStartDate,
}: {
  hackathonStartDate: string;
}) {
  const config = useHackathonPortalConfig();
  const client = usePortalClient();
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState(0);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isStepTransitioning, setIsStepTransitioning] = useState(false);
  const [stepDirection, setStepDirection] = useState<"forward" | "back">(
    "forward",
  );
  const [tosAccepted, setTosAccepted] = useState(false);
  const [tosError, setTosError] = useState(false);
  const [transitionStep, setTransitionStep] = useState<number | null>(null);
  const contextKey = portalQueryKey(
    "application-context",
    config.hackathonName,
  );
  const dashboardKey = portalQueryKey("dashboard", config.hackathonName);
  const contextQuery = useQuery({
    queryKey: contextKey,
    queryFn: () =>
      client.portal.getApplicationContext.query({
        hackathonName: config.hackathonName,
      }),
  });
  const applicationSchema = useMemo(
    () => createHackerApplicationClientSchema(hackathonStartDate),
    [hackathonStartDate],
  );
  const applicationPrefill = useMemo(
    () => getHackerApplicationPrefill(contextQuery.data),
    [contextQuery.data],
  );

  useEffect(() => {
    const hydrationTimeout = window.setTimeout(() => setHasHydrated(true), 0);
    return () => window.clearTimeout(hydrationTimeout);
  }, []);
  const uploadMutation = useMutation({
    mutationFn: ({
      fileContent,
      fileName,
    }: {
      fileContent: string;
      fileName: string;
    }) =>
      client.portal.uploadResume.mutate({
        fileContent,
        fileName,
        hackathonName: config.hackathonName,
      }),
  });
  const submitMutation = useMutation({
    mutationFn: (application: PortalApplicationInput) =>
      client.portal.submitApplication.mutate({
        ...application,
        hackathonName: config.hackathonName,
      }),
    async onSuccess() {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: contextKey }),
        queryClient.invalidateQueries({ queryKey: dashboardKey }),
      ]);
    },
  });

  return {
    activeStep,
    applicationContext: contextQuery.data,
    applicationPrefill,
    applicationSchema,
    applicationSubmitted,
    contextQuery,
    defaultValues: HACKER_APPLICATION_DEFAULT_VALUES,
    hasExistingApplication: Boolean(contextQuery.data?.existingApplication),
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
    submitApplication: submitMutation.mutateAsync,
    submitMutation,
    tosAccepted,
    tosError,
    transitionStep,
    uploadResume: (fileName: string, fileContent: string) =>
      uploadMutation.mutateAsync({ fileContent, fileName }),
    uploadMutation,
  };
}

export function useHackerDashboardFlow() {
  const config = useHackathonPortalConfig();
  const client = usePortalClient();
  const queryClient = useQueryClient();
  const dashboardKey = portalQueryKey("dashboard", config.hackathonName);
  const dashboardQuery = useQuery({
    queryKey: dashboardKey,
    queryFn: () =>
      client.portal.getDashboard.query({
        hackathonName: config.hackathonName,
      }),
  });
  const dashboard = dashboardQuery.data;
  const isCheckedIn = dashboard?.participant?.status === "checkedin";
  const scheduleQuery = useQuery({
    enabled: isCheckedIn,
    queryKey: portalQueryKey("schedule", config.hackathonName),
    queryFn: () =>
      client.portal.getSchedule.query({
        hackathonName: config.hackathonName,
      }),
  });
  const resumeQuery = useQuery({
    enabled: Boolean(dashboard?.participant),
    queryKey: portalQueryKey("resume", config.hackathonName),
    queryFn: () =>
      client.portal.getResume.query({
        hackathonName: config.hackathonName,
      }),
  });
  const refreshDashboard = () =>
    queryClient.invalidateQueries({ queryKey: dashboardKey });
  const confirmMutation = useMutation({
    mutationFn: () =>
      client.portal.confirmAttendance.mutate({
        hackathonName: config.hackathonName,
      }),
    onSuccess: refreshDashboard,
  });
  const withdrawMutation = useMutation({
    mutationFn: () =>
      client.portal.withdrawAttendance.mutate({
        hackathonName: config.hackathonName,
      }),
    onSuccess: refreshDashboard,
  });
  const qrMutation = useMutation({
    mutationFn: () =>
      client.portal.getQRCode.query({
        hackathonName: config.hackathonName,
      }),
  });
  const reportIssueMutation = useMutation({
    mutationFn: (description: string) =>
      client.portal.reportIssue.mutate({
        description,
        hackathonName: config.hackathonName,
      }),
  });

  return {
    config,
    confirmAttendance: confirmMutation.mutateAsync,
    confirmMutation,
    dashboard,
    dashboardQuery,
    loadQRCode: qrMutation.mutateAsync,
    qrCode: qrMutation.data?.qrCodeUrl,
    qrMutation,
    reportIssue: reportIssueMutation.mutateAsync,
    reportIssueMutation,
    resumeUrl: resumeQuery.data?.url,
    resumeQuery,
    schedule: scheduleQuery.data ?? [],
    scheduleQuery,
    withdrawAttendance: withdrawMutation.mutateAsync,
    withdrawMutation,
  };
}

export function useHackerProfileFlow() {
  const config = useHackathonPortalConfig();
  const client = usePortalClient();
  const queryClient = useQueryClient();
  const dashboardKey = portalQueryKey("dashboard", config.hackathonName);
  const profileSchema = useMemo(() => createHackerProfileClientSchema(), []);
  const dashboardQuery = useQuery({
    queryKey: dashboardKey,
    queryFn: () =>
      client.portal.getDashboard.query({
        hackathonName: config.hackathonName,
      }),
  });
  const uploadMutation = useMutation({
    mutationFn: ({
      fileContent,
      fileName,
    }: {
      fileContent: string;
      fileName: string;
    }) =>
      client.portal.uploadResume.mutate({
        fileContent,
        fileName,
        hackathonName: config.hackathonName,
      }),
  });
  const updateMutation = useMutation({
    mutationFn: (profile: PortalApplicationInput) =>
      client.portal.updateProfile.mutate({
        ...profile,
        hackathonName: config.hackathonName,
      }),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });
  const reportIssueMutation = useMutation({
    mutationFn: (description: string) =>
      client.portal.reportIssue.mutate({
        description,
        hackathonName: config.hackathonName,
      }),
  });

  return {
    participant: dashboardQuery.data?.participant,
    dashboardQuery,
    profileSchema,
    reportIssue: reportIssueMutation.mutateAsync,
    reportIssueMutation,
    updateProfile: updateMutation.mutateAsync,
    updateMutation,
    uploadResume: (fileName: string, fileContent: string) =>
      uploadMutation.mutateAsync({ fileContent, fileName }),
    uploadMutation,
  };
}
