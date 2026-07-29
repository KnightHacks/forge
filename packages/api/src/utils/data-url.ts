// Upload procedures receive base64 data URLs and record their shape as audit
// metadata. Both the admin and the self-service upload paths need the same
// numbers, so the measurement lives in one place rather than once per router.

export function dataUrlByteSize(fileContent: string) {
  const payload = fileContent.slice(fileContent.indexOf(",") + 1);
  return Buffer.from(payload, "base64").byteLength;
}

export function dataUrlMimeType(fileContent: string) {
  const separatorIndex = fileContent.indexOf(";");
  return separatorIndex > 5
    ? fileContent.slice("data:".length, separatorIndex)
    : "application/octet-stream";
}
