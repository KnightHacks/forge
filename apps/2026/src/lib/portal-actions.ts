export async function persistBeforeOptionalResumeUpload({
  file,
  persist,
  uploadResume,
}: {
  file?: File;
  persist: () => Promise<void>;
  uploadResume: (file: File) => Promise<unknown>;
}) {
  await persist();
  if (!file) return { resumeError: null };

  try {
    await uploadResume(file);
    return { resumeError: null };
  } catch (resumeError) {
    return { resumeError };
  }
}

export function shouldRedirectExistingApplication({
  applicationSubmitted,
  existingApplication,
  submissionInProgress,
}: {
  applicationSubmitted: boolean;
  existingApplication: boolean;
  submissionInProgress: boolean;
}) {
  return existingApplication && !applicationSubmitted && !submissionInProgress;
}

export function canEditHackerProfile(
  applicationEditable: boolean,
  actions: readonly { action: string; allowed: boolean }[] | null | undefined,
) {
  return (
    applicationEditable &&
    actions?.some(
      (action) => action.action === "edit_profile" && action.allowed,
    ) === true
  );
}
