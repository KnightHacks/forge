/**
 * Upload allowlists.
 *
 * Every upload path in the monorepo used to carry its own answer to "is this
 * file allowed?", and the answers disagreed: three magic-byte tables, two
 * extension rules, four ways of phrasing a rejection, and one path that checked
 * nothing on the client at all. This module owns the mechanism instead.
 *
 * The *policies* stay separate on purpose — a resume is a PDF and a profile
 * picture is not, so folding them together would be wrong in both directions.
 * What is shared is how a policy is enforced:
 *
 *   1. the declared MIME type must name a type the policy allows, or, when the
 *      browser reports no type at all, the file extension must;
 *   2. the byte length must fit;
 *   3. server-side, the leading bytes must match the resolved type's signature.
 *
 * Steps 1 and 2 run on the client so a member finds out before the upload; all
 * three run on the server, which is the only tier that decides anything.
 */

export interface UploadFileType {
  /** Lower-case, no leading dot. First entry is the canonical stored one. */
  readonly extensions: readonly [string, ...string[]];
  readonly mimeType: string;
}

/** The extension an accepted file is stored under. */
export function uploadExtension(type: UploadFileType) {
  return type.extensions[0];
}

export interface UploadPolicy {
  /** Noun for "must be a valid ___." when the bytes contradict the type. */
  readonly contentNoun: string;
  readonly maxBytes: number;
  /** Human size cap, e.g. "2MB". */
  readonly sizeLabel: string;
  /** Sentence subject for rejections, e.g. "Profile picture". */
  readonly subject: string;
  /** Human type list, e.g. "JPEG, PNG, GIF, or WebP image". */
  readonly typeLabel: string;
  readonly types: readonly UploadFileType[];
}

export type UploadRejectionReason =
  | "content_mismatch"
  | "empty"
  | "too_large"
  | "wrong_type";

export type UploadCheck =
  | { ok: false; message: string; reason: UploadRejectionReason }
  | { ok: true; type: UploadFileType };

const JPEG: UploadFileType = {
  extensions: ["jpg", "jpeg"],
  mimeType: "image/jpeg",
};
const PNG: UploadFileType = { extensions: ["png"], mimeType: "image/png" };
const GIF: UploadFileType = { extensions: ["gif"], mimeType: "image/gif" };
const WEBP: UploadFileType = { extensions: ["webp"], mimeType: "image/webp" };
const PDF: UploadFileType = {
  extensions: ["pdf"],
  mimeType: "application/pdf",
};

/**
 * Raster images rendered back into an `<img>`: profile pictures, company
 * logos, alumni bulletin art. All three land in the same bucket, are displayed
 * the same way, and therefore have the same correct answer. SVG is absent
 * deliberately — it is a scriptable document, not a picture.
 */
export const IMAGE_UPLOAD_POLICY: UploadPolicy = {
  contentNoun: "image",
  maxBytes: 2 * 1024 * 1024,
  sizeLabel: "2MB",
  subject: "Image",
  typeLabel: "JPEG, PNG, GIF, or WebP image",
  types: [JPEG, PNG, GIF, WEBP],
};

/** Resumes are read by humans and bundled for sponsors, so: PDF only. */
export const RESUME_UPLOAD_POLICY: UploadPolicy = {
  contentNoun: "PDF",
  maxBytes: 5 * 1000000,
  sizeLabel: "5MB",
  subject: "Resume",
  typeLabel: "PDF",
  types: [PDF],
};

/** The same policy, re-subjected so rejections name what the member picked. */
export function uploadPolicyFor(
  policy: UploadPolicy,
  subject: string,
): UploadPolicy {
  return { ...policy, subject };
}

export const PROFILE_PICTURE_UPLOAD_POLICY = uploadPolicyFor(
  IMAGE_UPLOAD_POLICY,
  "Profile picture",
);
export const COMPANY_IMAGE_UPLOAD_POLICY = uploadPolicyFor(
  IMAGE_UPLOAD_POLICY,
  "Company image",
);
export const BULLETIN_IMAGE_UPLOAD_POLICY = uploadPolicyFor(
  IMAGE_UPLOAD_POLICY,
  "Bulletin image",
);

/** Content types the browser sends when it could not identify the file. */
const UNIDENTIFIED_CONTENT_TYPES = new Set([
  "",
  "application/octet-stream",
  "binary/octet-stream",
]);

/** Lower-cases and drops parameters: `Image/PNG; charset=x` -> `image/png`. */
export function normalizeMimeType(contentType: string) {
  return contentType.toLowerCase().split(";", 1)[0]?.trim() ?? "";
}

/** Last dot-separated segment, lower-cased. `notes` -> `notes`, as before. */
export function uploadFileExtension(fileName: string) {
  return fileName.toLowerCase().split(".").pop() ?? "";
}

/**
 * The `accept` attribute for a policy. Derived rather than written out so the
 * file picker and the check that follows it can never drift apart.
 */
export function uploadAccept(policy: UploadPolicy) {
  return [
    ...policy.types.map(({ mimeType }) => mimeType),
    ...policy.types.flatMap(({ extensions }) =>
      extensions.map((extension) => `.${extension}`),
    ),
  ].join(",");
}

export function uploadRejectionMessage(
  policy: UploadPolicy,
  reason: UploadRejectionReason,
) {
  switch (reason) {
    case "content_mismatch":
      return `${policy.subject} must be a valid ${policy.contentNoun}.`;
    case "empty":
      return `${policy.subject} data is missing or invalid.`;
    case "too_large":
      return `${policy.subject} must be ${policy.sizeLabel} or smaller.`;
    case "wrong_type":
      return `${policy.subject} must be a ${policy.typeLabel}.`;
  }
}

function reject(
  policy: UploadPolicy,
  reason: UploadRejectionReason,
): UploadCheck {
  return { message: uploadRejectionMessage(policy, reason), ok: false, reason };
}

/**
 * The declared type wins. Only when the browser reports no type at all does the
 * extension get a say — that is the "member legitimately has this file but
 * their OS has no mapping for it" case, and the signature check still guards
 * it. A file whose declared type is simply wrong is rejected, not re-labelled.
 */
export function resolveUploadType(
  policy: UploadPolicy,
  input: { contentType: string; fileName?: string },
): UploadFileType | null {
  const mimeType = normalizeMimeType(input.contentType);
  const declared = policy.types.find((type) => type.mimeType === mimeType);
  if (declared) return declared;
  if (!UNIDENTIFIED_CONTENT_TYPES.has(mimeType)) return null;

  const extension = uploadFileExtension(input.fileName ?? "");
  return (
    policy.types.find((type) => type.extensions.includes(extension)) ?? null
  );
}

/** Client tier: everything knowable before the bytes are sent. */
export function checkUploadMetadata(
  policy: UploadPolicy,
  input: { contentType: string; fileName?: string; size: number },
): UploadCheck {
  const type = resolveUploadType(policy, input);
  if (!type) return reject(policy, "wrong_type");
  if (input.size <= 0) return reject(policy, "empty");
  if (input.size > policy.maxBytes) return reject(policy, "too_large");
  return { ok: true, type };
}

/** Server tier: the metadata checks plus the only one that cannot be faked. */
export function checkUploadContent(
  policy: UploadPolicy,
  input: { bytes: Uint8Array; contentType: string; fileName?: string },
): UploadCheck {
  const metadata = checkUploadMetadata(policy, {
    contentType: input.contentType,
    fileName: input.fileName,
    size: input.bytes.length,
  });
  if (!metadata.ok) return metadata;
  if (matchesUploadSignature(metadata.type.mimeType, input.bytes) !== true) {
    return reject(policy, "content_mismatch");
  }
  return metadata;
}

function startsWithBytes(bytes: Uint8Array, signature: readonly number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

function asciiAt(bytes: Uint8Array, start: number, value: string) {
  if (bytes.length < start + value.length) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (bytes[start + index] !== value.charCodeAt(index)) return false;
  }
  return true;
}

const ZIP_CONTAINER = (bytes: Uint8Array) =>
  startsWithBytes(bytes, [0x50, 0x4b, 0x03, 0x04]) ||
  startsWithBytes(bytes, [0x50, 0x4b, 0x05, 0x06]) ||
  startsWithBytes(bytes, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]);

const OLE_CONTAINER = (bytes: Uint8Array) =>
  startsWithBytes(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

const SIGNATURES: Record<string, (bytes: Uint8Array) => boolean> = {
  "application/pdf": (bytes) => asciiAt(bytes, 0, "%PDF-"),
  "application/x-7z-compressed": ZIP_CONTAINER,
  "application/zip": ZIP_CONTAINER,
  "image/gif": (bytes) =>
    asciiAt(bytes, 0, "GIF87a") || asciiAt(bytes, 0, "GIF89a"),
  "image/jpeg": (bytes) => startsWithBytes(bytes, [0xff, 0xd8, 0xff]),
  "image/png": (bytes) =>
    startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/webp": (bytes) =>
    asciiAt(bytes, 0, "RIFF") && asciiAt(bytes, 8, "WEBP"),
  "video/mp4": (bytes) => asciiAt(bytes, 4, "ftyp"),
  "video/webm": (bytes) => startsWithBytes(bytes, [0x1a, 0x45, 0xdf, 0xa3]),
};

/** Formats that share a container signature with a whole family of types. */
function signatureFor(mimeType: string) {
  const known = SIGNATURES[mimeType];
  if (known) return known;
  if (mimeType.startsWith("application/vnd.openxmlformats-officedocument")) {
    return ZIP_CONTAINER;
  }
  if (
    mimeType === "application/msword" ||
    mimeType.startsWith("application/vnd.ms-")
  ) {
    return OLE_CONTAINER;
  }
  return null;
}

/**
 * `true`/`false` when the type has a known signature, `null` when it has none
 * and the caller has to decide what silence means. Closed policies require
 * `true`; the open form-attachment bound treats `null` as "no opinion".
 */
export function matchesUploadSignature(
  contentType: string,
  bytes: Uint8Array,
): boolean | null {
  const signature = signatureFor(normalizeMimeType(contentType));
  return signature ? signature(bytes) : null;
}

/** Program images, regardless of what the upload claims to be. */
export function hasExecutableSignature(bytes: Uint8Array) {
  return (
    startsWithBytes(bytes, [0x4d, 0x5a]) ||
    startsWithBytes(bytes, [0x7f, 0x45, 0x4c, 0x46]) ||
    startsWithBytes(bytes, [0xfe, 0xed, 0xfa, 0xce]) ||
    startsWithBytes(bytes, [0xfe, 0xed, 0xfa, 0xcf]) ||
    startsWithBytes(bytes, [0xcf, 0xfa, 0xed, 0xfe]) ||
    startsWithBytes(bytes, [0xca, 0xfe, 0xba, 0xbe]) ||
    startsWithBytes(bytes, [0x23, 0x21])
  );
}

/**
 * Extensions that make a browser or a runtime execute what it downloaded.
 * The markup ones matter because a stored file is served from the object
 * store's own origin.
 */
const BLOCKED_UPLOAD_EXTENSIONS = new Set([
  "bat",
  "cmd",
  "com",
  "exe",
  "htm",
  "html",
  "jar",
  "js",
  "mjs",
  "ps1",
  "sh",
  "svg",
  "svgz",
  "vbs",
  "xhtml",
]);

/** Types that carry script even though their family is otherwise harmless. */
const SCRIPTABLE_MIME_TYPES = new Set([
  "application/xhtml+xml",
  "image/svg",
  "image/svg+xml",
  "text/html",
]);

const FORM_ATTACHMENT_TYPE_PATTERNS = [
  /^application\/(json|msword|pdf|rtf|vnd\.|x-7z-compressed|zip$)/,
  /^image\//,
  /^text\/(csv|plain|rtf)/,
  /^video\//,
] as const;

export function isBlockedUploadExtension(fileName: string) {
  return BLOCKED_UPLOAD_EXTENSIONS.has(uploadFileExtension(fileName));
}

/**
 * The outer bound on form attachments. Unlike the closed policies this one is
 * family-shaped, because the per-question allowlist is authored by an admin and
 * members bring whatever their phone produced — enumerating types here would
 * reject HEIC photos and .mov clips that are perfectly legitimate.
 */
export function isAllowedFormAttachmentType(contentType: string) {
  const normalized = normalizeMimeType(contentType);
  if (SCRIPTABLE_MIME_TYPES.has(normalized)) return false;
  return FORM_ATTACHMENT_TYPE_PATTERNS.some((pattern) =>
    pattern.test(normalized),
  );
}

/** A question's own allowlist, which may use `type/*` wildcards. */
export function mimeTypeAllowed(
  contentType: string,
  allowedMimeTypes: readonly string[],
) {
  const normalized = normalizeMimeType(contentType);
  return allowedMimeTypes.some((allowed) => {
    const candidate = allowed.toLowerCase().trim();
    return (
      candidate === normalized ||
      (candidate.endsWith("/*") &&
        normalized.startsWith(candidate.slice(0, -1)))
    );
  });
}

export function megabyteLabel(bytes: number) {
  const megabytes = bytes / (1024 * 1024);
  return `${Number.isInteger(megabytes) ? megabytes : Math.round(megabytes * 10) / 10} MB`;
}

/**
 * A `data:` URL split into its declared type and its base64 payload. Decoding
 * the payload is the caller's job — this package stays runtime-neutral.
 */
export function parseBase64DataUrl(value: string) {
  const match = /^data:([\w.+-]+\/[\w.+-]+)?;base64,/i.exec(value);
  if (!match) return null;
  return {
    base64: value.slice(match[0].length),
    contentType: match[1] ?? "",
  };
}

const BASE64_CONTENT = /^[A-Za-z0-9+/]*={0,2}$/;

export function isValidBase64(value: string) {
  return (
    value.length > 0 && value.length % 4 !== 1 && BASE64_CONTENT.test(value)
  );
}

/** Longest `data:` URL that can hold `maxBytes`, for cheap early rejection. */
export function maxDataUrlLength(policy: UploadPolicy) {
  return Math.ceil((policy.maxBytes * 4) / 3) + 128;
}
