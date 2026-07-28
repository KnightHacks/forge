/**
 * The single "suppressed" figure the preflight and the confirmation dialog
 * both show: blocklisted plus unsubscribed recipients.
 */
export function suppressedRecipientCount(counts: {
  excludedBlocklisted: number;
  excludedUnsubscribed: number;
}) {
  return counts.excludedBlocklisted + counts.excludedUnsubscribed;
}
