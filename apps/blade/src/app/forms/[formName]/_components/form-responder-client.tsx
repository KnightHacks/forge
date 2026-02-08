"use client";

import { useState } from "react";
import Link from "next/link";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import type { FORMS } from "@forge/consts";
import { Button } from "@forge/ui/button";
import { Card } from "@forge/ui/card";

import type { FormResponsePayload } from "./utils";
import type { FormResponsePayload } from "./utils";
import { api } from "~/trpc/react";
import { useSubmissionSuccess } from "../_hooks/useSubmissionSuccess";
import FormNotFound from "./form-not-found";
import { FormRunner } from "./form-runner";
import { SubmissionSuccessCard } from "./form-submitted-success";
import { useSubmissionSuccess } from "../_hooks/useSubmissionSuccess";
import FormNotFound from "./form-not-found";
import { FormRunner } from "./form-runner";
import { SubmissionSuccessCard } from "./form-submitted-success";

interface FormResponderWrapperProps {
interface FormResponderWrapperProps {
  formName: string;
  userName: string;
  handleCallbacks: (response: Record<string, unknown>) => void;
}

export function FormResponderWrapper({
export function FormResponderWrapper({
  formName,
  userName,
  handleCallbacks,
}: FormResponderWrapperProps) {
}: FormResponderWrapperProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { showCheckmark, showText, redirectCountdown } =
    useSubmissionSuccess(isSubmitted);
  const { showCheckmark, showText, redirectCountdown } =
    useSubmissionSuccess(isSubmitted);

  const formQuery = api.forms.getForm.useQuery({ slug_name: formName });
  const formQuery = api.forms.getForm.useQuery({ slug_name: formName });
  const duesQuery = api.duesPayment.validatePaidDues.useQuery();

  const formIdGate = formQuery.data?.id;

  const existingResponseQuery = api.forms.getUserResponse.useQuery(
    { form: formIdGate },
    { enabled: !!formIdGate },
  );
  const formIdGate = formQuery.data?.id;

  const existingResponseQuery = api.forms.getUserResponse.useQuery(
    { form: formIdGate },
    { enabled: !!formIdGate },
  );

  const submitResponse = api.forms.createResponse.useMutation({
    onSuccess: (_data, variables) => {
      setSubmitError(null);
      setIsSubmitted(true);
      handleCallbacks(variables.responseData as Record<string, unknown>);
    },
    onError: (error) => {
      setSubmitError(
        error.message || "Failed to submit response. Please try again.",
      );
    },
  });

  if (
    formQuery.isLoading ||
    duesQuery.isLoading ||
    existingResponseQuery.isLoading
  ) {
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary/5 p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (formQuery.error || !formQuery.data) return <FormNotFound />;

  const formId = formQuery.data.id;

  // not found
  if (existingResponseQuery.error)
    return <div>Error Loading existing response</div>;

  const form = formQuery.data.formData as FORMS.FormType;
  const zodValidator = formQuery.data.zodValidator;
  const isDuesOnly = formQuery.data.duesOnly;
  const allowResubmission = formQuery.data.allowResubmission;
  const allowEdit = formQuery.data.allowEdit;

  const duesCheckFailed = !!duesQuery.error;
  const hasPaidDues = duesCheckFailed
    ? true
    : (duesQuery.data?.duesPaid ?? false);

  const hasAlreadySubmitted = (existingResponseQuery.data?.length ?? 0) !== 0;
  const hasAlreadySubmitted = (existingResponseQuery.data?.length ?? 0) !== 0;

  // dues gate
  // dues gate
  if (isDuesOnly && !hasPaidDues) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary/5 p-6">
        <Card className="max-w-md p-8 text-center">
          <XCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
          <h1 className="mb-2 text-2xl font-bold">Dues Required</h1>
          <p className="text-muted-foreground">
            This form is only available to members who have paid their dues.
          </p>
        </Card>
      </div>
    );
  }

  // already submitted gate
  // already submitted gate
  if (hasAlreadySubmitted && !allowResubmission) {
    const existing = existingResponseQuery.data?.[0];
    const existing = existingResponseQuery.data?.[0];
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary/5 p-6">
        <Card className="max-w-md p-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h1 className="mb-2 text-2xl font-bold">Already Submitted</h1>
          <p className="text-muted-foreground">
            You have already submitted a response to this form.
          </p>

          {existing && (
            <Link href={`/forms/${existing.formSlug ?? ""}/${existing.id}`}>
              <Button size="sm">
                {allowEdit ? "Edit " : "View "} Response
              </Button>
            </Link>
          )}

          {existing && (
            <Link href={`/forms/${existing.formSlug ?? ""}/${existing.id}`}>
              <Button size="sm">
                {allowEdit ? "Edit " : "View "} Response
              </Button>
            </Link>
          )}
        </Card>
      </div>
    );
  }

  // success
  // success
  if (isSubmitted) {
    return (
      <SubmissionSuccessCard
        userName={userName}
        formName={form.name}
        showCheckmark={showCheckmark}
        showText={showText}
        redirectCountdown={redirectCountdown}
      />
    );
  }

  const onSubmit = (payload: FormResponsePayload) => {
      <SubmissionSuccessCard
        userName={userName}
        formName={form.name}
        showCheckmark={showCheckmark}
        showText={showText}
        redirectCountdown={redirectCountdown}
      />
    );
  }

  const onSubmit = (payload: FormResponsePayload) => {
    submitResponse.mutate({
      form: formId,
      responseData: payload,
      form: formId,
      responseData: payload,
    });
  };

  return (
    <FormRunner
      isReview={false}
      form={form}
      formId={formId}
      userName={userName}
      zodValidator={zodValidator}
      allowEdit={true} // always true on first submission
      isSubmitting={submitResponse.isPending}
      submitError={submitError}
      onSubmit={onSubmit}
    />
  );
}
