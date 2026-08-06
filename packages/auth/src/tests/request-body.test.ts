import { describe, expect, it } from "vitest";

import {
  readBoundedJson,
  readBoundedRequestBody,
  RequestBodyLimitError,
} from "../request-body";

function streamedRequest(chunks: readonly Uint8Array[]) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  const init: RequestInit & { duplex: "half" } = {
    body: stream,
    duplex: "half",
    method: "POST",
  };
  return new Request("https://blade.knighthacks.org/token", init);
}

describe("bounded request bodies", () => {
  it("reads JSON without requiring a Content-Length header", async () => {
    const request = streamedRequest([new TextEncoder().encode('{"ok":true}')]);

    await expect(readBoundedJson(request, 32)).resolves.toEqual({ ok: true });
  });

  it("stops a streamed body at the actual byte limit", async () => {
    const request = streamedRequest([new Uint8Array(8), new Uint8Array(9)]);

    await expect(readBoundedRequestBody(request, 16)).rejects.toBeInstanceOf(
      RequestBodyLimitError,
    );
  });

  it("rejects invalid and oversized declared lengths before reading", async () => {
    for (const contentLength of ["invalid", "-1", "17"]) {
      const request = new Request("https://blade.knighthacks.org/token", {
        body: "{}",
        headers: { "content-length": contentLength },
        method: "POST",
      });
      await expect(readBoundedRequestBody(request, 16)).rejects.toBeInstanceOf(
        RequestBodyLimitError,
      );
    }
  });
});
