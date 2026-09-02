import { describe, expect, it } from "vitest";

import {
  RequestBodyTooLargeError,
  requestWithLimitedBody,
} from "~/lib/limited-request-body";

describe("limited request bodies", () => {
  it("rebuilds requests that fit within the byte limit", async () => {
    const request = new Request("https://blade.test/import", {
      body: "project data",
      method: "POST",
    });

    const limited = await requestWithLimitedBody(request, 12);

    await expect(limited.text()).resolves.toBe("project data");
  });

  it("stops reading once the byte limit is exceeded", async () => {
    const request = new Request("https://blade.test/import", {
      body: "project data",
      method: "POST",
    });

    await expect(requestWithLimitedBody(request, 11)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });
});
