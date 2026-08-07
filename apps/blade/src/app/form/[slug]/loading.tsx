import { RespondentFormSkeleton } from "~/app/_components/forms/generic-form-respondent";
import { AuthenticatedShellSkeleton } from "~/app/_components/shared/authenticated-shell-skeleton";

export default function FormLoading() {
  return (
    <AuthenticatedShellSkeleton>
      <RespondentFormSkeleton />
    </AuthenticatedShellSkeleton>
  );
}
