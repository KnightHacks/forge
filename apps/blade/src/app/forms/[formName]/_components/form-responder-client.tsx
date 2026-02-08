"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { z } from "zod";

import type { FORMS } from "@forge/consts";
import { Button } from "@forge/ui/button";
import { Card } from "@forge/ui/card";

import { InstructionResponseCard } from "~/app/forms/[formName]/_components/instruction-response-card";
import { QuestionResponseCard } from "~/app/forms/[formName]/_components/question-response-card";
import { api } from "~/trpc/react";

const emailSchema = z.string().email("Invalid email address");
const phoneSchema = z.string().regex(/^\+?\d{7,15}$/, "Invalid phone number");
const linkSchema = z.string().url("Please enter a valid URL");

interface FormResponderClientProps {
  formName: string;
  userName: string;
  handleCallbacks: (response: Record<string, unknown>) => void;
}

export function FormResponderClient({
  formName,
  userName,
  handleCallbacks,
}: FormResponderClientProps) {
  const router = useRouter();
  const [responses, setResponses] = useState<
    Record<string, string | string[] | number | Date | null>
  >({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [showText, setShowText] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  const formQuery = api.forms.getForm.useQuery({
    slug_name: formName,
  });

  // is bro a dues paying member?
  const duesQuery = api.duesPayment.validatePaidDues.useQuery();

  // did bro submit alr?
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
    duesQuery.isLoading ||
    existingResponseQuery.isLoading
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

  const duesCheckFailed = !!duesQuery.error;
  const hasPaidDues = duesCheckFailed
    ? true
    : (duesQuery.data?.duesPaid ?? false);

  const form = formQuery.data.formData as FORMS.FormType;
  const isDuesOnly = formQuery.data.duesOnly;
  const allowResubmission = formQuery.data.allowResubmission;
  const hasAlreadySubmitted = existingResponseQuery.data?.length !== 0;

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

  const handleFieldBlur = (questionText: string) => {
    setTouchedFields((prev) => new Set(prev).add(questionText));
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
          // Convert boolean strings to actual booleans for BOOLEAN question type
          if (question.type === "BOOLEAN" && typeof response === "string") {
            responseData[question.question] = response === "true";
          } else {
            responseData[question.question] = response;
          }
        }
      }
    });

    submitResponse.mutate({
      form: formQuery.data.id,
      responseData,
    });
  };

  const getValidationError = (question: (typeof form.questions)[number]) => {
    if (!touchedFields.has(question.question)) {
      return null;
    }

    const response = responses[question.question];

    if (question.optional) {
      if (
        !response ||
        response === "" ||
        (Array.isArray(response) && response.length === 0)
      ) {
        return null;
      }
    } else {
      if (response === null || response === undefined || response === "") {
        return "This field is required.";
      }
      if (Array.isArray(response) && response.length === 0) {
        return "This field is required.";
      }
      // For required BOOLEAN questions, must be checked (true)
      if (question.type === "BOOLEAN") {
        const isChecked =
          (typeof response === "string" && response === "true") ||
          (typeof response === "boolean" && response === true);
        if (!isChecked) {
          return "You must accept this to continue.";
        }
      }
    }

    if (question.type === "EMAIL" && typeof response === "string") {
      const result = emailSchema.safeParse(response);
      if (!result.success) {
        return "Please enter a valid email address";
      }
    }
    if (question.type === "PHONE" && typeof response === "string") {
      const result = phoneSchema.safeParse(response);
      if (!result.success) {
        return "Please enter a valid phone number (7-15 digits, optional + prefix)";
      }
    }
    if (question.type === "LINK" && typeof response === "string") {
      const result = linkSchema.safeParse(response);
      if (!result.success) {
        return "Please enter a valid URL";
      }
    }

    return null;
  };

  const isFormValid = () => {
    // Check if all required questions have responses
    return form.questions.every((question) => {
      if (question.optional) {
        const response = responses[question.question];
        if (
          !response ||
          response === "" ||
          (Array.isArray(response) && response.length === 0)
        ) {
          return true;
        }

        if (question.type === "EMAIL" && typeof response === "string") {
          return emailSchema.safeParse(response).success;
        }
        if (question.type === "PHONE" && typeof response === "string") {
          return phoneSchema.safeParse(response).success;
        }
        if (question.type === "LINK" && typeof response === "string") {
          return linkSchema.safeParse(response).success;
        }
        return true;
      }

      const response = responses[question.question];
      if (response === null || response === undefined || response === "")
        return false;
      if (Array.isArray(response) && response.length === 0) return false;

      // For required BOOLEAN questions, must be checked (true), not false
      if (question.type === "BOOLEAN") {
        if (typeof response === "string") {
          return response === "true"; // Must be "true" string
        }
        if (typeof response === "boolean") {
          return response === true; // Must be true boolean
        }
        return false; // Missing or invalid
      }

      if (question.type === "EMAIL" && typeof response === "string") {
        return emailSchema.safeParse(response).success;
      }
      if (question.type === "PHONE" && typeof response === "string") {
        return phoneSchema.safeParse(response).success;
      }
      if (question.type === "LINK" && typeof response === "string") {
        return linkSchema.safeParse(response).success;
      }

      return true;
    });
  };

  return (
    <div className="min-h-screen overflow-x-visible bg-primary/5 p-6">
      <div className="mx-auto max-w-3xl space-y-4">
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

        {/* Questions and Instructions */}
        <div className="space-y-4 overflow-visible">
          {(() => {
            /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
            // Combine questions and instructions, sort by order
            type QuestionWithOrder = (typeof form.questions)[number] & {
              itemType: "question";
            };
            interface InstructionWithOrder {
              itemType: "instruction";
              title: string;
              content?: string;
              imageUrl?: string;
              videoUrl?: string;
              order?: number;
            }

            const questionsWithType: QuestionWithOrder[] = form.questions.map(
              (q) => ({
                ...q,
                itemType: "question" as const,
              }),
            );

            const instructionsWithType: InstructionWithOrder[] = (
              (form as any).instructions || []
            ).map((inst: any) => ({
              ...inst,
              itemType: "instruction" as const,
            }));

            const allItems = [
              ...questionsWithType,
              ...instructionsWithType,
            ].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

            return allItems.map((item, index) => {
              const isInstruction = item.itemType === "instruction";

              return (
                <div
                  key={`${isInstruction ? "inst" : "q"}-${index}`}
                  className={`duration-500 animate-in fade-in slide-in-from-bottom-4 ${isInstruction ? "mt-8" : ""}`}
                  style={{
                    animationDelay: `${(index + 1) * 100}ms`,
                    animationFillMode: "backwards",
                  }}
                >
                  {isInstruction ? (
                    <InstructionResponseCard instruction={item as any} />
                  ) : (
                    <QuestionResponseCard
                      question={item}
                      value={responses[item.question] ?? null}
                      onChange={(
                        value: string | string[] | number | Date | null,
                      ) => {
                        handleResponseChange(item.question, value);
                      }}
                      onBlur={() => handleFieldBlur(item.question)}
                      formId={formQuery.data.id}
                      error={getValidationError(item)}
                    />
                  )}
                </div>
              );
            });
            /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
          })()}
        </div>

        {submitError && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
            {submitError}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between">
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
