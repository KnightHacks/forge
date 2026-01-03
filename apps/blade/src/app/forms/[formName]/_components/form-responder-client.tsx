"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Card } from "@forge/ui/card";

import { QuestionResponseCard } from "~/app/forms/[formName]/_components/question-response-card";
import { api } from "~/trpc/react";

interface FormResponderClientProps {
  formName: string;
  userName: string;
}

export function FormResponderClient({
  formName,
  userName,
}: FormResponderClientProps) {
  const [responses, setResponses] = useState<
    Record<string, string | string[] | number | Date | null>
  >({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [showText, setShowText] = useState(false);

  const formQuery = api.forms.getForm.useQuery({
    name: formName,
  });

  // is bro a dues paying member?
  const duesQuery = api.duesPayment.validatePaidDues.useQuery();

  // did bro submit alr?
  const existingResponseQuery = api.forms.getUserResponse.useQuery({
    form: formName,
  });

  const [submitError, setSubmitError] = useState<string | null>(null);

  const submitResponse = api.forms.createResponse.useMutation({
    onSuccess: () => {
      setSubmitError(null);
      setIsSubmitted(true);
    },
    onError: (error) => {
      setSubmitError(
        error.message || "Failed to submit response. Please try again.",
      );
    },
  });

  // Staggered animation for success screen
  useEffect(() => {
    if (isSubmitted) {
      const checkTimer = setTimeout(() => setShowCheckmark(true), 100);
      const textTimer = setTimeout(() => setShowText(true), 400);
      return () => {
        clearTimeout(checkTimer);
        clearTimeout(textTimer);
      };
    }
  }, [isSubmitted]);

  // wait for all queries to load
  if (
    formQuery.isLoading ||
    duesQuery.isLoading ||
    existingResponseQuery.isLoading
  )
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary/5 p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  // if form fails to load show error
  if (formQuery.error)
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary/5 p-6">
        Error loading form
      </div>
    );

  const duesCheckFailed = !!duesQuery.error;
  const hasPaidDues = duesCheckFailed
    ? true
    : (duesQuery.data?.duesPaid ?? false);

  const form = formQuery.data?.formData;
  const isDuesOnly = formQuery.data?.duesOnly ?? false;
  const allowResubmission = formQuery.data?.allowResubmission ?? false;
  const hasAlreadySubmitted = existingResponseQuery.data?.hasSubmitted ?? false;

  if (!form)
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary/5 p-6">
        Form not found
      </div>
    );

  // BRO DID NOT PAY DUES!!!
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

  // dude they're trying to over throw the elections with multiple submissions
  if (hasAlreadySubmitted && !allowResubmission) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary/5 p-6">
        <Card className="max-w-md p-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h1 className="mb-2 text-2xl font-bold">Already Submitted</h1>
          <p className="text-muted-foreground">
            You have already submitted a response to this form.
          </p>
        </Card>
      </div>
    );
  }

  // SUCESSSSS
  if (isSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary/5 p-6">
        <Card className="max-w-md p-8 text-center">
          <div
            className={`transition-all duration-500 ease-out ${showCheckmark ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}
          >
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
          </div>
          <div
            className={`mt-4 transition-all duration-500 ease-out ${showText ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
          >
            <h1 className="mb-2 text-2xl font-bold">Thanks, {userName}!</h1>
            <p className="text-muted-foreground">
              Your response to &quot;{form.name}&quot; has been recorded.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const handleResponseChange = (
    questionText: string,
    value: string | string[] | number | Date | null,
  ) => {
    setResponses((prev) => ({
      ...prev,
      [questionText]: value,
    }));
  };

  const handleSubmit = () => {
    // Build response data object
    const responseData: Record<string, unknown> = {};

    form.questions.forEach((question) => {
      const response = responses[question.question];

      // Only include non-empty responses
      if (response !== null && response !== undefined && response !== "") {
        if (Array.isArray(response) && response.length === 0) {
          return; // Skip empty arrays
        }
        // Convert Date objects to ISO strings
        if (response instanceof Date) {
          if (question.type === "DATE") {
            responseData[question.question] = response
              .toISOString()
              .split("T")[0];
          } else if (question.type === "TIME") {
            responseData[question.question] = response
              .toTimeString()
              .slice(0, 5);
          }
        } else {
          responseData[question.question] = response;
        }
      }
    });

    submitResponse.mutate({
      form: formName,
      responseData,
    });
  };

  const isFormValid = () => {
    // Check if all required questions have responses
    return form.questions.every((question) => {
      if (question.optional) return true; // Optional questions don't need validation

      const response = responses[question.question];
      if (response === null || response === undefined || response === "")
        return false;
      if (Array.isArray(response) && response.length === 0) return false;
      return true;
    });
  };

  return (
    <div className="min-h-screen bg-primary/5 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Banner */}
        {form.banner && <div className="overflow-hidden rounded-lg"></div>}

        {/* Header */}
        <Card className="border-t-8 border-t-primary duration-500 animate-in fade-in slide-in-from-top-4">
          <div className="space-y-2 p-6">
            <h1 className="text-3xl font-bold">{form.name}</h1>

            {form.description && (
              <p className="text-muted-foreground">{form.description}</p>
            )}
          </div>
        </Card>

        {/* Questions */}
        <div className="space-y-4">
          {form.questions.map((q, index) => {
            const questionText = q.question;
            const responseValue:
              | string
              | string[]
              | number
              | Date
              | null
              | undefined = responses[questionText];
            return (
              <div
                key={`${questionText}-${index}`}
                className="duration-500 animate-in fade-in slide-in-from-bottom-4"
                style={{
                  animationDelay: `${(index + 1) * 100}ms`,
                  animationFillMode: "backwards",
                }}
              >
                <QuestionResponseCard
                  question={q}
                  value={responseValue ?? null}
                  onChange={(
                    value: string | string[] | number | Date | null,
                  ) => {
                    handleResponseChange(questionText, value);
                  }}
                />
              </div>
            );
          })}
        </div>

        {submitError && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
            {submitError}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid() || submitResponse.isPending}
            size="lg"
          >
            {submitResponse.isPending ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
}
