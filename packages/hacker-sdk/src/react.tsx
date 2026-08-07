"use client";

import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import {
  QueryClientProvider,
  QueryClient as TanStackQueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type {
  HackerParticipantClient,
  HackerParticipantClientConfig,
} from "./client";
import type {
  ConfirmAttendanceInput,
  HackerLeaderboardScopeInput,
  IssueHackerCheckInPassInput,
  SubmitApplicationInput,
  UpdateHackerApplicationInput,
  UpdateHackerParticipantInput,
  UpdateHackerProfileInput,
  WithdrawApplicationInput,
} from "./contracts";
import { createHackerParticipantClient } from "./client";
import { parseHackerSdkError } from "./errors";
import { hackerSdkQueryKeys } from "./query-keys";

interface HackerSdkContextValue {
  client: HackerParticipantClient;
  portalKey: string;
}

const HackerSdkContext = createContext<HackerSdkContextValue | null>(null);

export interface HackerSdkProviderProps {
  children: ReactNode;
  client?: HackerParticipantClient;
  clientOptions?: Omit<HackerParticipantClientConfig, "portalKey">;
  portalKey: string;
  queryClient?: QueryClient;
}

export function shouldRetryHackerSdkRequest(
  failureCount: number,
  cause: unknown,
) {
  return failureCount < 2 && parseHackerSdkError(cause).retryable;
}

export function hackerSdkRetryDelay(attemptIndex: number) {
  return Math.min(500 * 2 ** attemptIndex, 2_000);
}

export function canLoadCheckedInParticipantData(status: string | undefined) {
  return status === "checkedin";
}

export async function invalidateHackerParticipantQueries(
  queryClient: QueryClient,
  portalKey: string,
) {
  await queryClient.invalidateQueries({
    queryKey: hackerSdkQueryKeys.participant(portalKey),
  });
}

export function createSdkQueryClient() {
  return new TanStackQueryClient({
    defaultOptions: {
      mutations: {
        retry: shouldRetryHackerSdkRequest,
        retryDelay: hackerSdkRetryDelay,
      },
      queries: {
        retry: shouldRetryHackerSdkRequest,
        retryDelay: hackerSdkRetryDelay,
        staleTime: 30_000,
      },
    },
  });
}

export function HackerSdkProvider({
  children,
  client,
  clientOptions,
  portalKey,
  queryClient,
}: HackerSdkProviderProps) {
  const [ownedQueryClient] = useState(createSdkQueryClient);
  const [ownedClient] = useState(() =>
    createHackerParticipantClient({ ...clientOptions, portalKey }),
  );
  const activeClient = client ?? ownedClient;

  return (
    <HackerSdkContext.Provider value={{ client: activeClient, portalKey }}>
      <QueryClientProvider client={queryClient ?? ownedQueryClient}>
        {children}
      </QueryClientProvider>
    </HackerSdkContext.Provider>
  );
}

export function useHackerSdkClient() {
  const context = useContext(HackerSdkContext);
  if (!context) {
    throw new Error("Hacker SDK hooks must be used inside HackerSdkProvider.");
  }
  return context;
}

export function usePublicHackathon() {
  const { client, portalKey } = useHackerSdkClient();
  return useQuery({
    queryFn: () => client.getPublicHackathon(),
    queryKey: hackerSdkQueryKeys.publicHackathon(portalKey),
  });
}

export function useHackerSession() {
  const { client, portalKey } = useHackerSdkClient();
  return useQuery({
    queryFn: () => client.getSession(),
    queryKey: hackerSdkQueryKeys.session(portalKey),
  });
}

export function useHackerApplication() {
  const { client, portalKey } = useHackerSdkClient();
  return useQuery({
    queryFn: () => client.getApplicationContext(),
    queryKey: hackerSdkQueryKeys.application(portalKey),
  });
}

export function useHackerDashboard() {
  const { client, portalKey } = useHackerSdkClient();
  return useQuery({
    queryFn: () => client.getDashboard(),
    queryKey: hackerSdkQueryKeys.dashboard(portalKey),
  });
}

interface HackerSdkQueryOptions {
  enabled?: boolean;
}

export function useHackerResume(options: HackerSdkQueryOptions = {}) {
  const { client, portalKey } = useHackerSdkClient();
  return useQuery({
    enabled: options.enabled ?? true,
    queryFn: () => client.getResume(),
    queryKey: hackerSdkQueryKeys.resume(portalKey),
  });
}

export function useHackerSchedule(options: HackerSdkQueryOptions = {}) {
  const { client, portalKey } = useHackerSdkClient();
  const dashboard = useHackerDashboard();
  return useQuery({
    enabled:
      (options.enabled ?? true) &&
      canLoadCheckedInParticipantData(dashboard.data?.application?.status),
    queryFn: () => client.getSchedule(),
    queryKey: hackerSdkQueryKeys.schedule(portalKey),
  });
}

export function useHackerAttendance(options: HackerSdkQueryOptions = {}) {
  const { client, portalKey } = useHackerSdkClient();
  const dashboard = useHackerDashboard();
  return useQuery({
    enabled:
      (options.enabled ?? true) &&
      canLoadCheckedInParticipantData(dashboard.data?.application?.status),
    queryFn: () => client.getMyAttendance(),
    queryKey: hackerSdkQueryKeys.attendance(portalKey),
  });
}

export function useHackerPoints(options: HackerSdkQueryOptions = {}) {
  const { client, portalKey } = useHackerSdkClient();
  const dashboard = useHackerDashboard();
  return useQuery({
    enabled:
      (options.enabled ?? true) &&
      canLoadCheckedInParticipantData(dashboard.data?.application?.status),
    queryFn: () => client.getMyPoints(),
    queryKey: hackerSdkQueryKeys.points(portalKey),
  });
}

export function useHackerLeaderboard(
  scope: HackerLeaderboardScopeInput,
  options: HackerSdkQueryOptions = {},
) {
  const { client, portalKey } = useHackerSdkClient();
  const dashboard = useHackerDashboard();
  const status = dashboard.data?.application?.status;
  const scopeKey =
    scope.scope === "overall" ? "overall" : `class:${scope.classId}`;
  return useQuery({
    enabled:
      (options.enabled ?? true) &&
      (status === "confirmed" || status === "checkedin"),
    queryFn: () => client.getLeaderboard(scope),
    queryKey: hackerSdkQueryKeys.leaderboard(portalKey, scopeKey),
  });
}

function useParticipantMutation<TInput, TOutput>(
  mutation: (input: TInput) => Promise<TOutput>,
) {
  const { portalKey } = useHackerSdkClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mutation,
    retry: shouldRetryHackerSdkRequest,
    retryDelay: hackerSdkRetryDelay,
    async onSuccess() {
      await invalidateHackerParticipantQueries(queryClient, portalKey);
    },
  });
}

export function useSubmitHackerApplication() {
  const { client } = useHackerSdkClient();
  return useParticipantMutation((input: SubmitApplicationInput) =>
    client.submitApplication(input),
  );
}

export function useUpdateHackerProfile() {
  const { client } = useHackerSdkClient();
  return useParticipantMutation((input: UpdateHackerProfileInput) =>
    client.updateProfile(input),
  );
}

export function useUpdateHackerApplication() {
  const { client } = useHackerSdkClient();
  return useParticipantMutation((input: UpdateHackerApplicationInput) =>
    client.updateApplication(input),
  );
}

export function useUpdateHackerParticipant() {
  const { client } = useHackerSdkClient();
  return useParticipantMutation((input: UpdateHackerParticipantInput) =>
    client.updateParticipant(input),
  );
}

export function useConfirmHackerAttendance() {
  const { client } = useHackerSdkClient();
  return useParticipantMutation((input: ConfirmAttendanceInput) =>
    client.confirmAttendance(input),
  );
}

export function useWithdrawHackerApplication() {
  const { client } = useHackerSdkClient();
  return useParticipantMutation((input: WithdrawApplicationInput) =>
    client.withdrawApplication(input),
  );
}

export function useRemoveHackerResume() {
  const { client } = useHackerSdkClient();
  return useParticipantMutation((input: { idempotencyKey: string }) =>
    client.removeResume(input),
  );
}

/** Explicitly rotates the participant's opaque pass; never runs on refocus. */
export function useIssueHackerCheckInPass() {
  const { client } = useHackerSdkClient();
  return useParticipantMutation((input: IssueHackerCheckInPassInput) =>
    client.getCheckInPass(input),
  );
}

export function useUploadHackerResume() {
  const { client } = useHackerSdkClient();
  return useParticipantMutation(
    (input: { file: Blob; fileName: string; idempotencyKey: string }) =>
      client.uploadResume(input.file, input),
  );
}

export function useHackerSignOut() {
  const { client, portalKey } = useHackerSdkClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (options?: { returnTo?: string }) =>
      client.signOut(options?.returnTo),
    async onSuccess() {
      await queryClient.resetQueries({
        queryKey: hackerSdkQueryKeys.participant(portalKey),
      });
    },
  });
}
