export interface CampaignFailure {
  smtpCode: number | null;
  subscriberId: number;
}

/** Logs are evidence only when they cover one complete, unambiguous run. */
export function parseCampaignFailures(logs: unknown, name: string) {
  const entries = Array.isArray(logs)
    ? logs.filter((line): line is string => typeof line === "string")
    : [];
  const starts = entries.flatMap((line, index) =>
    line.includes(`start processing campaign (${name})`) ? [index] : [],
  );
  const finishes = entries.flatMap((line, index) =>
    line.includes(`campaign (${name}) finished`) ? [index] : [],
  );
  const start = starts[0];
  const finish = finishes[0];
  if (
    starts.length !== 1 ||
    finishes.length !== 1 ||
    start === undefined ||
    finish === undefined ||
    start >= finish
  ) {
    return { completeRun: false, failures: [] as CampaignFailure[] };
  }
  const marker = `error sending message in campaign ${name}: subscriber `;
  const failures: CampaignFailure[] = [];
  for (const line of entries.slice(start + 1, finish)) {
    const position = line.indexOf(marker);
    if (position < 0) continue;
    const match = /^(\d+): ([\s\S]*)$/.exec(
      line.slice(position + marker.length),
    );
    if (!match?.[1]) continue;
    const subscriberId = Number(match[1]);
    if (!Number.isSafeInteger(subscriberId) || subscriberId < 1) continue;
    // A timeout/disconnect is ambiguous: only an explicit SMTP refusal is safe.
    const code = /^([45]\d{2})(?:[ -]|$)/.exec(match[2] ?? "");
    failures.push({
      subscriberId,
      smtpCode: code?.[1] ? Number(code[1]) : null,
    });
  }
  return {
    completeRun:
      new Set(failures.map((item) => item.subscriberId)).size ===
      failures.length,
    failures,
  };
}
