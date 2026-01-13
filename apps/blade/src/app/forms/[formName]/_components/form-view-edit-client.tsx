"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Card } from "@forge/ui/card";

import { QuestionResponseCard } from "~/app/forms/[formName]/_components/question-response-card";
import { api } from "~/trpc/react";

interface FormReviewClientProps {
  formName: string;
  userName: string;
  responseId?: string;
}

export function FormReviewClient({
  formName,
  userName,
  responseId,
}: FormReviewClientProps) {
  const router = useRouter();
  const [responses, setResponses] = useState<
    Record<string, string | string[] | number | Date | null>
  >({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [showText, setShowText] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  const formQuery = api.forms.getForm.useQuery({
    slug_name: formName,
  });

  // use responseId to query singular response to view
  const responseQuery = api.forms.getUserResponse.useQuery({
    responseId,
  });

  // TODO: WILL USE FOR EDIT
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

  useEffect(() => {
    const data = responseQuery.data ? responseQuery.data[0] : null;
    if (!data?.responseData) return;

    const hydrated: Record<string, string | string[] | number | Date | null> =
      {};

    for (const [questionText, raw] of Object.entries(data.responseData)) {
      if (raw === null) hydrated[questionText] = null;
      else if (typeof raw === "string") {
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw))
          hydrated[questionText] = new Date(raw);
        else if (/^\d{2}:\d{2}$/.test(raw))
          hydrated[questionText] = new Date(`1970-01-01T${raw}`);
        else hydrated[questionText] = raw;
      } else if (typeof raw === "number") hydrated[questionText] = raw;
      else if (Array.isArray(raw) && raw.every((v) => typeof v === "string"))
        hydrated[questionText] = raw;
      else hydrated[questionText] = null;
    }

    setResponses(hydrated);
  }, [responseId, responseQuery.data]);

  useEffect(() => {
    setResponses({});
  }, [responseId]);

  // Staggered animation for success screen
  useEffect(() => {
    if (isSubmitted) {
      const checkTimer = setTimeout(() => setShowCheckmark(true), 100);
      const textTimer = setTimeout(() => setShowText(true), 400);

      // countdown
      const countdownInterval = setInterval(() => {
        setRedirectCountdown((prev) => prev - 1);
      }, 1000);

      const redirectTimer = setTimeout(() => {
        router.push("/");
      }, 5000);

      return () => {
        clearTimeout(checkTimer);
        clearTimeout(textTimer);
        clearInterval(countdownInterval);
        clearTimeout(redirectTimer);
      };
    }
  }, [isSubmitted, router]);

  // wait for all queries to load
  if (
    formQuery.isLoading ||
    responseQuery.isLoading ||
    Object.keys(responses).length === 0
  )
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary/5 p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  // if form fails to load show error
  if (formQuery.error || !formQuery.data) {
    return <FormNotFound />;
  }

  if (responseQuery.error || !responseQuery.data) {
    return <ResponseNotFound />;
  }

  const form = formQuery.data.formData;

  // TODO: Implement editing
  const allowEdit = false;

  const formDisabled = !allowEdit;

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
            <p className="mt-4 text-sm text-muted-foreground">
              Redirecting in {redirectCountdown}...
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

  // TODO: WILL USE FOR EDIT
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      form: formQuery.data.id,
      responseData,
    });
  };

  // TODO: WILL USE FOR EDIT
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    <div className="min-h-screen overflow-x-visible bg-primary/5 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Banner */}
        {form.banner && <div className="overflow-hidden rounded-lg"></div>}

        {/* Header */}
        <Card className="border-t-8 border-t-primary duration-500 animate-in fade-in slide-in-from-top-4">
          <div className="space-y-2 p-6">
            {/* Implement View/Edit Title */}
            {/* <h1 className="text-3xl font-bold">{`${allowEdit ? "Edit" : "View"} - ${form.name}`}</h1> */}
            <h1 className="text-3xl font-bold">{`${"View"} - ${form.name}`}</h1>

            {form.description && (
              <p className="text-muted-foreground">{form.description}</p>
            )}
          </div>
        </Card>

        {/* Questions */}
        <div className="space-y-4 overflow-visible">
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
                  disabled={formDisabled}
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
        <div className="flex justify-between">
          {/* Implement disabling form */}
          {/* {!formDisabled && (
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid() || submitResponse.isPending}
              size="lg"
            >
              {submitResponse.isPending ? "Submitting..." : "Submit"}
            </Button>
          )} */}
          <Button
            onClick={() => router.push("/")}
            size="lg"
            className="ml-auto"
          >
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}

function FormNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary/5 p-6">
      <Card className="max-w-md p-8 text-center">
        <XCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
        <h1 className="mb-2 text-2xl font-bold">Form Not Found</h1>
        <p className="text-muted-foreground">
          This form doesn&apos;t exist or may have been removed.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Please let a team member know if you think this is an error.
        </p>
      </Card>
    </div>
  );
}

function ResponseNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary/5 p-6">
      <Card className="max-w-md p-8 text-center">
        <XCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
        <h1 className="mb-2 text-2xl font-bold">Response Not Found</h1>
        <p className="text-muted-foreground">
          This response doesn&apos;t exist or might not match the current user.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Please let a team member know if you think this is an error.
        </p>
      </Card>
    </div>
  );
}
