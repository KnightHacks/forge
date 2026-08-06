import { describe, expect, it } from "vitest";

import { HackerSdkError, parseHackerSdkError } from "../errors";

describe("Hacker SDK domain errors", () => {
  it("TC-SDK-004 retains stable machine-readable error context", () => {
    const error = parseHackerSdkError({
      error: {
        data: {
          domain: {
            code: "STALE_PROFILE_REVISION",
            fieldIssues: [
              {
                code: "stale",
                message: "Reload this profile.",
                path: ["expectedRevision"],
              },
            ],
            message: "Mutable display copy",
            requestId: "request-42",
            retryable: true,
          },
        },
      },
    });

    expect(error).toBeInstanceOf(HackerSdkError);
    expect(error).toMatchObject({
      code: "STALE_PROFILE_REVISION",
      fieldIssues: [
        {
          code: "stale",
          message: "Reload this profile.",
          path: ["expectedRevision"],
        },
      ],
      requestId: "request-42",
      retryable: true,
    });
  });

  it("classifies a failed upstream response without requiring a message", () => {
    expect(parseHackerSdkError(undefined, { status: 503 })).toMatchObject({
      code: "NETWORK_ERROR",
      retryable: true,
    });
  });
});
