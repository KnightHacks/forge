"use client";

import { useEffect, useState } from "react";

import type { FormType, InstructionValidatorType } from "@forge/consts/knight-hacks";
import { Button } from "@forge/ui/button";
import { Card } from "@forge/ui/card";

import type { FormResponsePayload, FormResponseUI } from "./utils";
import { InstructionResponseCard } from "~/app/forms/[formName]/_components/instruction-response-card";
import { QuestionResponseCard } from "~/app/forms/[formName]/_components/question-response-card";
import { getValidationError, isFormValid, normalizeResponses } from "./utils";

/**
 * Shared renderer for "fill out form" and "review/edit response".
 * - Renders header + questions + instructions
 * - Manages responses state (UI shape)
 * - Calls `onSubmit` with normalized payload
 */
export function FormRunner({
  isReview = false,
  form,
  formId,
  zodValidator,
  initialResponses,
  allowEdit = true,
  isSubmitting = false,
  submitError,
  onSubmit,
}: {
  isReview?: boolean;
  form: FormType;

  formId: string;

  userName?: string;

  zodValidator: string;

  /** For edit/review mode: prefill UI responses */
  initialResponses?: FormResponseUI;

  /** Disable editing inputs (view-only) */
  allowEdit?: boolean;

  isSubmitting?: boolean;

  submitError?: string | null;

  /** Parent provides submit handler, FormRunner will normalize first */
  onSubmit: (payload: FormResponsePayload) => void;
}) {
  const [responses, setResponses] = useState<FormResponseUI>(
    initialResponses ?? {},
  );

  // If initialResponses, hydrate once it changes.
  useEffect(() => {
    if (!initialResponses) return;
    setResponses(initialResponses);
  }, [initialResponses]);

  const handleResponseChange = (
    questionText: string,
    value: string | string[] | number | Date | boolean | null,
  ) => {
    // If view-only, ignore changes
    if (!allowEdit) return;

    setResponses((prev) => {
      if (
        value == null ||
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0)
      ) {
        const { [questionText]: _, ...rest } = prev;
        return rest;
      }

      return { ...prev, [questionText]: value };
    });
  };

  const canSubmit =
    allowEdit && !isSubmitting && isFormValid(zodValidator, responses, form);

  const handleSubmit = () => {
    const payload = normalizeResponses(responses, form);
    onSubmit(payload);
  };

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

  const questionsWithType: QuestionWithOrder[] = form.questions.map((q) => ({
    ...q,
    itemType: "question" as const,
  }));

  const instructionsWithType: InstructionWithOrder[] = (
    (form).instructions || []
  ).map((inst: InstructionValidatorType) => ({
    ...inst,
    itemType: "instruction" as const,
  }));

  const allItems = [...questionsWithType, ...instructionsWithType].sort(
    (a, b) => (a.order ?? 999) - (b.order ?? 999),
  );

  return (
    <div className="min-h-screen overflow-x-visible bg-primary/5 p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Banner */}
        {form.banner && <div className="overflow-hidden rounded-lg"></div>}

        {/* Header */}
        <Card className="border-t-8 border-t-primary duration-500 animate-in fade-in slide-in-from-top-4">
          <div className="space-y-2 p-6">
            <h1 className="text-3xl font-bold">
              {isReview && `${allowEdit ? "Edit" : "View"} - `}
              {form.name}
            </h1>

            {form.description && (
              <p className="text-muted-foreground">{form.description}</p>
            )}
          </div>
        </Card>

        {/* Questions + Instructions */}
        <div className="space-y-4 overflow-visible">
          {allItems.map((item, index) => {
            const isInstruction = item.itemType === "instruction";

            return (
              <div
                key={`${isInstruction ? "inst" : "q"}-${index}`}
                className={`duration-500 animate-in fade-in slide-in-from-bottom-4 ${
                  isInstruction ? "mt-8" : ""
                }`}
                style={{
                  animationDelay: `${(index + 1) * 100}ms`,
                  animationFillMode: "backwards",
                }}
              >
                {isInstruction ? (
                  <>
                    <InstructionResponseCard instruction={item} />
                  </>
                ) : (
                  <QuestionResponseCard
                    question={item}
                    value={responses[item.question] ?? null}
                    onChange={(
                      value: string | string[] | number | Date | boolean | null,
                    ) => {
                      handleResponseChange(item.question, value);
                    }}
                    formId={formId}
                    error={getValidationError(
                      item,
                      zodValidator,
                      responses,
                      form,
                    )}
                    disabled={!allowEdit}
                  />
                )}
              </div>
            );
          })}
        </div>

        {submitError && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
            {submitError}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between">
          {!isReview ? (
            <Button onClick={handleSubmit} disabled={!canSubmit} size="lg">
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          ) : (
            allowEdit && (
              <Button onClick={handleSubmit} disabled={!canSubmit} size="lg">
                {isSubmitting ? "Submitting Edits..." : "Submit Edits"}
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
