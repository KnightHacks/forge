import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { HackerSdkError } from "../errors";
import { hackerSdkQueryKeys } from "../query-keys";
import {
  canLoadCheckedInParticipantData,
  createSdkQueryClient,
  hackerSdkRetryDelay,
  invalidateHackerParticipantQueries,
  shouldRetryHackerSdkRequest,
} from "../react";

describe("Hacker SDK React behavior", () => {
  it("gates private event data until check-in", () => {
    expect(canLoadCheckedInParticipantData("confirmed")).toBe(false);
    expect(canLoadCheckedInParticipantData("checkedin")).toBe(true);
    expect(canLoadCheckedInParticipantData(undefined)).toBe(false);
  });

  it("retries only retryable SDK failures and caps the retry window", () => {
    const retryable = new HackerSdkError({
      code: "REFRESH_RETRY",
      message: "Retry refresh.",
      retryable: true,
    });
    const terminal = new HackerSdkError({
      code: "VALIDATION_ERROR",
      message: "Invalid input.",
      retryable: false,
    });

    expect(shouldRetryHackerSdkRequest(0, retryable)).toBe(true);
    expect(shouldRetryHackerSdkRequest(1, retryable)).toBe(true);
    expect(shouldRetryHackerSdkRequest(2, retryable)).toBe(false);
    expect(shouldRetryHackerSdkRequest(0, terminal)).toBe(false);
    expect(hackerSdkRetryDelay(0)).toBe(500);
    expect(hackerSdkRetryDelay(8)).toBe(2_000);
  });

  it("retries a participant mutation with the original idempotency key", async () => {
    const queryClient = createSdkQueryClient();
    const attempts: string[] = [];
    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationFn: (input: { idempotencyKey: string }) => {
        attempts.push(input.idempotencyKey);
        if (attempts.length === 1) {
          return Promise.reject(
            new HackerSdkError({
              code: "REFRESH_RETRY",
              retryable: true,
            }),
          );
        }
        return Promise.resolve("saved");
      },
      retryDelay: 0,
    });

    await expect(
      mutation.execute({ idempotencyKey: "profile:stable" }),
    ).resolves.toBe("saved");
    expect(attempts).toEqual(["profile:stable", "profile:stable"]);
  });

  it("invalidates every participant query after a successful mutation", async () => {
    const queryClient = new QueryClient();
    const portalKey = "kh-x";
    const applicationKey = hackerSdkQueryKeys.application(portalKey);
    const dashboardKey = hackerSdkQueryKeys.dashboard(portalKey);
    queryClient.setQueryData(applicationKey, { application: null });
    queryClient.setQueryData(dashboardKey, { application: null });

    await invalidateHackerParticipantQueries(queryClient, portalKey);

    expect(queryClient.getQueryState(applicationKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(dashboardKey)?.isInvalidated).toBe(true);
  });
});
