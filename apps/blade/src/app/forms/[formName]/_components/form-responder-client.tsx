"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import type { FormType } from "@forge/consts/knight-hacks";
import { Card } from "@forge/ui/card";

import { api } from "~/trpc/react";
import { useSubmissionSuccess } from "../_hooks/useSubmissionSuccess";
import FormNotFound from "./form-not-found";
import { FormRunner } from "./form-runner";
import { SubmissionSuccessCard } from "./form-submitted-success";
import { type FormResponsePayload } from "./utils";
import Link from "next/link";
import { Button } from "@forge/ui/button";

interface FormResponderWrapperProps {
  formName: string;
  userName: string;
  handleCallbacks: (response: Record<string, unknown>) => void;
}

export function FormResponderWrapper({
  formName,
  userName,
  handleCallbacks,
}: FormResponderWrapperProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { showCheckmark, showText, redirectCountdown } =
    useSubmissionSuccess(isSubmitted);

  const formQuery = api.forms.getForm.useQuery({ slug_name: formName });
  const duesQuery = api.duesPayment.validatePaidDues.useQuery();
  const existingResponseQuery = api.forms.getUserResponse.useQuery({
    form: formQuery.data?.id ?? "",
  });

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

  // loading
  if (
    formQuery.isLoading ||
    duesQuery.isLoading ||
    existingResponseQuery.isLoading
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary/5 p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // not found
  if (formQuery.error || !formQuery.data) return <FormNotFound />;
  if (existingResponseQuery.error || !existingResponseQuery.data) return (<div>Error Loading existing response</div>);


  const form = formQuery.data.formData;
  const formId = formQuery.data.id;

  const zodValidator = formQuery.data.zodValidator;
  const isDuesOnly = formQuery.data.duesOnly;
  const allowResubmission = formQuery.data.allowResubmission;
  const allowEdit = formQuery.data.allowEdit;


  const duesCheckFailed = !!duesQuery.error;
  const hasPaidDues = duesCheckFailed
    ? true
    : (duesQuery.data?.duesPaid ?? false);

  const hasAlreadySubmitted = (existingResponseQuery.data.length ?? 0) !== 0;

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
  if (hasAlreadySubmitted && !allowResubmission) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary/5 p-6">
        <Card className="max-w-md p-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h1 className="mb-2 text-2xl font-bold">Already Submitted</h1>
          <p className="text-muted-foreground">
            You have already submitted a response to this form.
          </p>
          {existingResponseQuery.data[0] && (
            <Link
              href={`/forms/${existingResponseQuery.data[0].formSlug ?? ""}/${existingResponseQuery.data[0].id}`}
            >
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
    submitResponse.mutate({
      form: formId,
      responseData: payload,
    });
  };

  return (
    <FormRunner
      isReview={false}
      form={form as FormType}
      formId={formId}
      userName={userName}
      zodValidator={zodValidator}
      allowEdit={true}
      isSubmitting={submitResponse.isPending}
      submitError={submitError}
      onSubmit={onSubmit}
    />
  );
}
