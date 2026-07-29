import { TRPCError } from "@trpc/server";

import type { UploadFileType, UploadPolicy } from "@forge/validators";
import {
  checkUploadContent,
  isValidBase64,
  maxDataUrlLength,
  parseBase64DataUrl,
  uploadRejectionMessage,
} from "@forge/validators";

/**
 * The one place a `data:` URL upload is decoded and checked. Every rejection
 * leaves here as a `BAD_REQUEST` carrying the policy's own wording, so the
 * message a member sees from the server is the message the client would have
 * shown had it caught the problem first.
 */
export function decodeUploadDataUrl(
  policy: UploadPolicy,
  input: { dataUrl: string; fileName?: string },
): { contentType: string; fileBuffer: Buffer; type: UploadFileType } {
  const parsed = parseBase64DataUrl(input.dataUrl);
  if (!parsed) {
    throw badRequest(policy, "wrong_type");
  }
  if (input.dataUrl.length > maxDataUrlLength(policy)) {
    throw badRequest(policy, "too_large");
  }
  if (!isValidBase64(parsed.base64)) {
    throw badRequest(policy, "empty");
  }

  const fileBuffer = Buffer.from(parsed.base64, "base64");
  const check = checkUploadContent(policy, {
    bytes: fileBuffer,
    contentType: parsed.contentType,
    fileName: input.fileName,
  });
  if (!check.ok) {
    throw new TRPCError({ code: "BAD_REQUEST", message: check.message });
  }

  return { contentType: check.type.mimeType, fileBuffer, type: check.type };
}

function badRequest(
  policy: UploadPolicy,
  reason: Parameters<typeof uploadRejectionMessage>[1],
) {
  return new TRPCError({
    code: "BAD_REQUEST",
    message: uploadRejectionMessage(policy, reason),
  });
}
