export class RequestBodyLimitError extends Error {
  constructor(readonly maxBytes: number) {
    super(`Request body exceeds the ${maxBytes} byte limit.`);
    this.name = "RequestBodyLimitError";
  }
}

function declaredContentLength(request: Request, maxBytes: number) {
  const header = request.headers.get("content-length");
  if (header === null) return;
  const length = Number(header);
  if (!Number.isSafeInteger(length) || length < 0 || length > maxBytes) {
    throw new RequestBodyLimitError(maxBytes);
  }
}

export async function readBoundedRequestBody(
  request: Request,
  maxBytes: number,
) {
  declaredContentLength(request, maxBytes);
  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    received += result.value.byteLength;
    if (received > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new RequestBodyLimitError(maxBytes);
    }
    chunks.push(result.value);
  }

  const body = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function readBoundedJson(request: Request, maxBytes: number) {
  const body = await readBoundedRequestBody(request, maxBytes);
  return JSON.parse(new TextDecoder().decode(body)) as unknown;
}
