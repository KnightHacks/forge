"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";

import type { EmailAudienceDefinition } from "@forge/validators";

import type { EmailAudienceResolution } from "./email-portal-types";

/** Debounce applied to audience checkbox churn before hitting the resolver. */
export const AUDIENCE_RESOLUTION_DEBOUNCE_MS = 180;

/**
 * Resolves the selected audience groups into a concrete recipient list.
 *
 * Two things make this worth naming: the resolver call is debounced, and every
 * request carries a sequence number so a slow response for a stale selection
 * cannot overwrite a newer one. Manual exclusions are pruned to the resolved
 * pool, which is why the caller hands in a dispatcher for that field rather
 * than the hook owning it — the exclusions are part of the persisted draft.
 */
export function useAudienceResolution({
  audiences,
  resolve,
  setExcludedRecipients,
}: {
  audiences: EmailAudienceDefinition[];
  resolve?: (
    audiences: EmailAudienceDefinition[],
  ) => Promise<EmailAudienceResolution>;
  setExcludedRecipients: Dispatch<SetStateAction<Set<string>>>;
}) {
  const [resolution, setResolution] = useState<EmailAudienceResolution | null>(
    null,
  );
  const [isResolving, setIsResolving] = useState(false);
  const request = useRef(0);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect --
       Both writes below have to land in the same commit as the selection
       change: the spinner must appear the moment a checkbox is ticked, and
       clearing the last box must empty the recipient list before the next
       paint rather than one render later. Deriving either during render
       instead would make the first render report "resolving", which the
       server render would then emit. This is the behaviour that shipped; the
       rule did not fire on it while it was inlined in the 1,100-line
       workspace component only because that function defeated the analysis. */
    if (!resolve || audiences.length === 0) {
      // Bump the sequence here too, not just on the resolving path. Clearing
      // the last audience while a resolve is already dispatched used to leave
      // `request.current` untouched, so the in-flight response still matched
      // its own sequence, passed the staleness guard, and repopulated the
      // recipient list the admin had just emptied. Cancelling the timeout does
      // not help once the request has gone out.
      request.current += 1;
      setResolution(null);
      setExcludedRecipients(new Set());
      setIsResolving(false);
      return;
    }
    const sequence = ++request.current;
    setIsResolving(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const timeout = window.setTimeout(() => {
      void resolve(audiences)
        .then((result) => {
          if (request.current !== sequence) return;
          const pool = new Set(result.recipients.map(({ email }) => email));
          setResolution(result);
          setExcludedRecipients(
            (current) =>
              new Set([...current].filter((email) => pool.has(email))),
          );
        })
        .catch(() => {
          if (request.current === sequence) {
            setResolution(null);
          }
        })
        .finally(() => {
          if (request.current === sequence) {
            setIsResolving(false);
          }
        });
    }, AUDIENCE_RESOLUTION_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [audiences, resolve, setExcludedRecipients]);

  return { isResolving, resolution };
}
