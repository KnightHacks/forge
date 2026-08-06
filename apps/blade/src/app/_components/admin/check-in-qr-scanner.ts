export const CHECK_IN_QR_SCANNER_OPTIONS = {
  allowMultiple: true,
  scanDelay: 3000,
} as const;

export const CHECK_IN_QR_ABSENCE_REARM_MS = 1000;

export function observeCheckInQrPayloads(
  lastSeenAt: Map<string, number>,
  detectedCodes: readonly { rawValue: string }[],
  now = Date.now(),
) {
  for (const { rawValue } of detectedCodes) {
    if (rawValue) lastSeenAt.set(rawValue, now);
  }
}

export function rearmAbsentCheckInQrPayloads(
  handledPayloads: Set<string>,
  lastSeenAt: Map<string, number>,
  now = Date.now(),
) {
  for (const payload of handledPayloads) {
    const lastSeen = lastSeenAt.get(payload);
    if (
      lastSeen === undefined ||
      now - lastSeen >= CHECK_IN_QR_ABSENCE_REARM_MS
    ) {
      handledPayloads.delete(payload);
      lastSeenAt.delete(payload);
    }
  }
}

export function claimCheckInQrPayload(
  lock: { current: boolean },
  handledPayloads: Set<string>,
  detectedCodes: readonly { rawValue: string }[],
) {
  if (lock.current) return null;
  const payload = detectedCodes.find(
    ({ rawValue }) => rawValue && !handledPayloads.has(rawValue),
  )?.rawValue;
  if (!payload) return null;
  lock.current = true;
  handledPayloads.add(payload);
  return payload;
}

export function releaseCheckInQrPayload(lock: { current: boolean }) {
  lock.current = false;
}
