export function normalizePublicGuildText(value: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed;
}

export function normalizePublicGuildUrl(value: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  for (const candidate of [
    trimmed,
    trimmed.includes("://") ? null : `https://${trimmed}`,
  ]) {
    if (!candidate) continue;

    try {
      const url = new URL(candidate);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.toString();
      }
    } catch {
      // Try the next safe normalization before omitting malformed legacy data.
    }
  }

  return null;
}
