import { describe, expect, it, vi } from "vitest";

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
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      cancel,
      start(controller) {
        controller.enqueue(new TextEncoder().encode("project "));
        controller.enqueue(new TextEncoder().encode("data"));
      },
    });
    const request = new Request("https://blade.test/import", {
      body,
      duplex: "half",
      method: "POST",
    } as RequestInit & { duplex: "half" });

    await expect(requestWithLimitedBody(request, 11)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
    expect(cancel).toHaveBeenCalledOnce();
  });
});
