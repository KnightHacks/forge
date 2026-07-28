/** @vitest-environment jsdom */
import type { Dispatch, SetStateAction } from "react";
import type { Mock } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EmailAudienceDefinition } from "@forge/validators";

import type { EmailAudienceResolution } from "~/app/_components/admin/email/email-portal-types";
import { useAudienceResolution } from "~/app/_components/admin/email/use-audience-resolution";

// This hook decides who actually receives a campaign, and its two safeguards —
// the debounce and the stale-response guard — were unreachable by a test while
// they lived inline in the workspace component.

function resolutionOf(emails: string[]): EmailAudienceResolution {
  return {
    counts: {
      duplicatesCollapsed: 0,
      excludedBlocklisted: 0,
      excludedInvalid: 0,
      excludedUnsubscribed: 0,
      finalUnique: emails.length,
      rawMatches: emails.length,
    },
    recipients: emails.map((email) => ({
      attributes: {},
      email,
      matchReasons: [],
      name: email,
    })),
  };
}

function deferred<T>() {
  let settle!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    settle = resolve;
  });
  return { promise, settle };
}

const CURRENT_MEMBERS: EmailAudienceDefinition[] = [
  { kind: "current_members" },
];
const ALUMNI: EmailAudienceDefinition[] = [{ kind: "alumni" }];

type ExcludedRecipientsDispatch = Dispatch<SetStateAction<Set<string>>>;

let setExcludedRecipients: Mock<ExcludedRecipientsDispatch>;

beforeEach(() => {
  setExcludedRecipients = vi.fn<ExcludedRecipientsDispatch>();
});

describe("useAudienceResolution", () => {
  it("debounces the resolver instead of calling it during the effect", async () => {
    const resolve = vi
      .fn()
      .mockResolvedValue(resolutionOf(["a@knighthacks.org"]));
    const { result } = renderHook(() =>
      useAudienceResolution({
        audiences: CURRENT_MEMBERS,
        resolve,
        setExcludedRecipients,
      }),
    );

    // The spinner is on immediately, but nothing has been requested yet.
    expect(result.current.isResolving).toBe(true);
    expect(resolve).not.toHaveBeenCalled();

    await waitFor(() => expect(result.current.isResolving).toBe(false));
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(result.current.resolution?.recipients).toHaveLength(1);
  });

  it("collapses a burst of selection changes into one resolver call", async () => {
    const resolve = vi.fn().mockResolvedValue(resolutionOf([]));
    const { rerender, result } = renderHook(
      (props: { audiences: EmailAudienceDefinition[] }) =>
        useAudienceResolution({
          audiences: props.audiences,
          resolve,
          setExcludedRecipients,
        }),
      { initialProps: { audiences: CURRENT_MEMBERS } },
    );

    rerender({ audiences: ALUMNI });
    rerender({ audiences: CURRENT_MEMBERS });

    await waitFor(() => expect(result.current.isResolving).toBe(false));
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenLastCalledWith(CURRENT_MEMBERS);
  });

  it("ignores a slow response for a selection that has been replaced", async () => {
    const first = deferred<EmailAudienceResolution>();
    const second = deferred<EmailAudienceResolution>();
    const resolve = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { rerender, result } = renderHook(
      (props: { audiences: EmailAudienceDefinition[] }) =>
        useAudienceResolution({
          audiences: props.audiences,
          resolve,
          setExcludedRecipients,
        }),
      { initialProps: { audiences: CURRENT_MEMBERS } },
    );

    await waitFor(() => expect(resolve).toHaveBeenCalledTimes(1));
    rerender({ audiences: ALUMNI });
    await waitFor(() => expect(resolve).toHaveBeenCalledTimes(2));

    second.settle(resolutionOf(["newest@knighthacks.org"]));
    await waitFor(() => expect(result.current.isResolving).toBe(false));

    // The stale request lands last and must not overwrite the newer answer.
    first.settle(resolutionOf(["stale@knighthacks.org"]));
    await Promise.resolve();
    await waitFor(() =>
      expect(result.current.resolution?.recipients[0]?.email).toBe(
        "newest@knighthacks.org",
      ),
    );
    expect(result.current.isResolving).toBe(false);
  });

  it("drops manual exclusions that are no longer in the resolved pool", async () => {
    const resolve = vi
      .fn()
      .mockResolvedValue(resolutionOf(["kept@knighthacks.org"]));
    const { result } = renderHook(() =>
      useAudienceResolution({
        audiences: CURRENT_MEMBERS,
        resolve,
        setExcludedRecipients,
      }),
    );

    await waitFor(() => expect(result.current.isResolving).toBe(false));

    const updater = setExcludedRecipients.mock.calls.at(-1)?.[0];
    if (typeof updater !== "function") throw new Error("expected an updater");
    expect([
      ...updater(new Set(["kept@knighthacks.org", "gone@knighthacks.org"])),
    ]).toEqual(["kept@knighthacks.org"]);
  });

  it("clears the pool when nothing is selected and never calls the resolver", () => {
    const resolve = vi.fn();
    const { result } = renderHook(() =>
      useAudienceResolution({ audiences: [], resolve, setExcludedRecipients }),
    );

    expect(resolve).not.toHaveBeenCalled();
    expect(result.current.isResolving).toBe(false);
    expect(result.current.resolution).toBeNull();
    expect(setExcludedRecipients).toHaveBeenCalledWith(new Set());
  });

  it("stops resolving without a resolver, so a read-only caller shows no spinner", () => {
    const { result } = renderHook(() =>
      useAudienceResolution({
        audiences: CURRENT_MEMBERS,
        resolve: undefined,
        setExcludedRecipients,
      }),
    );

    expect(result.current.isResolving).toBe(false);
    expect(result.current.resolution).toBeNull();
  });

  it("drops the resolution when the resolver rejects", async () => {
    const resolve = vi.fn().mockRejectedValue(new Error("upstream is down"));
    const { result } = renderHook(() =>
      useAudienceResolution({
        audiences: CURRENT_MEMBERS,
        resolve,
        setExcludedRecipients,
      }),
    );

    await waitFor(() => expect(result.current.isResolving).toBe(false));
    expect(result.current.resolution).toBeNull();
  });
});
