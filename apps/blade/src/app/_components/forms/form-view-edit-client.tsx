"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import type { FormType } from "@forge/consts/knight-hacks";

import type { FormResponsePayload, FormResponseUI } from "./utils";
import { api } from "~/trpc/react";
import { useSubmissionSuccess } from "./_hooks/useSubmissionSuccess";
import FormNotFound from "./form-not-found";
import { FormRunner } from "./form-runner";
import { SubmissionSuccessCard } from "./form-submitted-success";
import ResponseNotFound from "./response-not-found";

interface FormReviewWrapperProps {
  formName: string;
  userName: string;
  responseId: string;
}

export function FormReviewWrapper({
  formName,
  userName,
  responseId,
}: FormReviewWrapperProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { showCheckmark, showText, redirectCountdown } =
    useSubmissionSuccess(isSubmitted);

  const formQuery = api.forms.getForm.useQuery({ slug_name: formName });

  const responseQuery = api.forms.getUserResponse.useQuery(
    { responseId },
    { enabled: !!responseId, staleTime: 0 },
  );

  const editResponse = api.forms.editResponse.useMutation({
    onSuccess: () => {
      setSubmitError(null);
      setIsSubmitted(true);
    },
    onError: (error) => {
      setSubmitError(
        error.message || "Failed to submit response edit. Please try again.",
      );
    },
  });

  const form = formQuery.data;
  const formData = form?.formData;

  const stored = (responseQuery.data?.[0]?.responseData ??
    {}) as FormResponsePayload;

  const initialResponses = useMemo(() => {
    if (!formData) return {};
    return payloadToUI(stored, formData);
  }, [stored, form]);

  if (formQuery.isLoading || responseQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary/5 p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (formQuery.error || !formData) return <FormNotFound />;
  if (responseQuery.error || !responseQuery.data) return <ResponseNotFound />;

  const zodValidator = form.zodValidator;

  const allowEdit = form.allowEdit;

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
    editResponse.mutate({
      id: responseId,
      responseData: payload,
    });
  };

  return (
    <FormRunner
      isReview={true}
      form={formData as FormType}
      formId={form.id}
      userName={userName}
      zodValidator={zodValidator}
      initialResponses={initialResponses}
      allowEdit={allowEdit}
      isSubmitting={editResponse.isPending}
      submitError={submitError}
      onSubmit={onSubmit}
    />
  );
}

// Form response payload -> UI conversion
function payloadToUI(
  payload: FormResponsePayload,
  form: FormType,
): FormResponseUI {
  const out: FormResponseUI = {};

  for (const q of form.questions) {
    const key = q.question;
    const raw = payload[key];

    if (raw === undefined) continue;
    if (raw === null) {
      out[key] = null;
      continue;
    }

    switch (q.type) {
      case "DATE":
        out[key] = typeof raw === "string" ? new Date(`${raw}T00:00:00`) : null;
        break;
      case "TIME":
        out[key] =
          typeof raw === "string" ? new Date(`1970-01-01T${raw}:00`) : null;
        break;
      case "BOOLEAN":
        out[key] =
          typeof raw === "boolean"
            ? raw
            : raw === "true"
              ? true
              : raw === "false"
                ? false
                : null;
        break;
      default:
        out[key] = raw;
        break;
    }
  }

  return out;
}
