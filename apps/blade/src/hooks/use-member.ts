"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import type { RouterOutputs } from "@forge/api";

import { api } from "~/trpc/react";

export type CurrentMember = NonNullable<RouterOutputs["member"]["getMember"]>;

export function useMember({
  redirectNoMemberTo,
  redirectUnauthenticatedTo = "/",
}: {
  redirectNoMemberTo?: string;
  redirectUnauthenticatedTo?: string;
} = {}) {
  const router = useRouter();
  const memberQuery = api.member.getMember.useQuery(undefined, {
    retry(failureCount, error) {
      if (error.data?.code === "UNAUTHORIZED") return false;
      return failureCount < 2;
    },
  });

  const isUnauthenticated = memberQuery.error?.data?.code === "UNAUTHORIZED";
  const hasNoMember = memberQuery.isSuccess && !memberQuery.data;

  useEffect(() => {
    if (!isUnauthenticated) return;

    router.replace(redirectUnauthenticatedTo);
  }, [isUnauthenticated, redirectUnauthenticatedTo, router]);

  useEffect(() => {
    if (!redirectNoMemberTo || !hasNoMember) return;

    router.replace(redirectNoMemberTo);
  }, [hasNoMember, redirectNoMemberTo, router]);

  return useMemo(
    () => ({
      error: memberQuery.error,
      hasMember: Boolean(memberQuery.data),
      isError: memberQuery.isError,
      isLoading: memberQuery.isPending,
      isRedirecting:
        isUnauthenticated || (Boolean(redirectNoMemberTo) && hasNoMember),
      member: memberQuery.data ?? null,
      refetch: memberQuery.refetch,
    }),
    [
      hasNoMember,
      isUnauthenticated,
      memberQuery.data,
      memberQuery.error,
      memberQuery.isError,
      memberQuery.isPending,
      memberQuery.refetch,
      redirectNoMemberTo,
    ],
  );
}
