export interface CleanupAttachmentCandidate {
  createdAt: Date;
  finalizedAt: Date | null;
  id: string;
  objectName: string;
  responseId: string | null;
}

export function selectAbandonedFormAttachments({
  candidates,
  cutoff,
  retainedAttachmentIds,
}: {
  candidates: readonly CleanupAttachmentCandidate[];
  cutoff: Date;
  retainedAttachmentIds: ReadonlySet<string>;
}) {
  return candidates.filter(
    (candidate) =>
      candidate.createdAt < cutoff && !retainedAttachmentIds.has(candidate.id),
  );
}
