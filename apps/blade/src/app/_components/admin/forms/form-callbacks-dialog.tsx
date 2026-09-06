"use client";

import type { Dispatch, SetStateAction } from "react";

import type { FormQuestion } from "@forge/validators";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";

import type { FormResponseMode } from "./form-availability-draft";
import type { CallbackCatalogItem } from "./form-builder-types";
import type {
  ConfiguredFormCallback,
  FormCallbackDraft,
  FormCallbackDraftSource,
} from "./form-callback-mappings";
import {
  callbackSourceSummary,
  emptyCallbackDraft,
  isCallbackDraftComplete,
  respondentValueLabels,
  savedCallbackDraft,
} from "./form-callback-mappings";

const allRespondentValues = Object.keys(
  respondentValueLabels,
) as (keyof typeof respondentValueLabels)[];

function sourceSelectValue(source: FormCallbackDraftSource | undefined) {
  if (!source) return undefined;
  if (source.kind === "fixed") return "fixed";
  if (source.kind === "respondent") return `respondent:${source.value}`;
  return source.questionId ? `question:${source.questionId}` : undefined;
}

export function FormCallbacksDialog({
  callbackDraft,
  callbacks,
  configureCallbackPending,
  configuredCallbacks,
  disableCallbackPending,
  error,
  onAddCallback,
  onClose,
  onDisableCallback,
  onEnableCallback,
  onOpenChange,
  open,
  questions,
  responseMode,
  setCallbackDraft,
}: {
  callbackDraft: FormCallbackDraft;
  callbacks: CallbackCatalogItem[];
  configureCallbackPending: boolean;
  configuredCallbacks: ConfiguredFormCallback[];
  disableCallbackPending: boolean;
  error?: string | null;
  onAddCallback: () => Promise<void>;
  onClose: () => void;
  onDisableCallback: (callbackSlug: string) => Promise<void>;
  onEnableCallback: (callbackDraft: FormCallbackDraft) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  questions: FormQuestion[];
  responseMode: FormResponseMode;
  setCallbackDraft: Dispatch<SetStateAction<FormCallbackDraft>>;
}) {
  const selected = callbacks.find(({ slug }) => slug === callbackDraft.slug);
  const pending = configureCallbackPending || disableCallbackPending;
  const editable = responseMode !== "single_editable";
  const usedQuestionIds = new Set(
    Object.values(callbackDraft.mappings).flatMap((source) =>
      source.kind === "question" && source.questionId
        ? [source.questionId]
        : [],
    ),
  );

  function selectCallback(slug: string) {
    const catalog = callbacks.find((callback) => callback.slug === slug);
    const saved = configuredCallbacks.find(
      (callback) => callback.callbackSlug === slug,
    );
    setCallbackDraft(
      saved ? savedCallbackDraft(saved, catalog) : emptyCallbackDraft(catalog),
    );
  }

  function updateSource(inputKey: string, value: string) {
    setCallbackDraft((current) => {
      let source: FormCallbackDraftSource;
      if (value === "fixed") {
        const existing = current.mappings[inputKey];
        source = {
          kind: "fixed",
          value: existing?.kind === "fixed" ? existing.value : "",
        };
      } else if (value.startsWith("respondent:")) {
        source = {
          kind: "respondent",
          value: value.slice(
            "respondent:".length,
          ) as keyof typeof respondentValueLabels,
        };
      } else {
        source = {
          kind: "question",
          questionId: value.slice("question:".length),
        };
      }
      return {
        ...current,
        invalidSavedMappings: false,
        mappings: { ...current.mappings, [inputKey]: source },
      };
    });
  }

  function updateFixedValue(inputKey: string, value: string) {
    setCallbackDraft((current) => ({
      ...current,
      invalidSavedMappings: false,
      mappings: {
        ...current.mappings,
        [inputKey]: { kind: "fixed", value },
      },
    }));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90svh] w-[calc(100vw-2rem)] min-w-0 max-w-2xl overflow-y-auto p-4 sm:p-6 [&>button]:right-1 [&>button]:top-1 [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center">
        <DialogHeader className="min-w-0 text-left">
          <DialogTitle>Callbacks</DialogTitle>
          <DialogDescription>
            Map each procedure input to one form answer, respondent field, or
            manual value. Changes apply to future responses only.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-w-0 gap-4">
          {configuredCallbacks.map((callback) => {
            const catalog = callbacks.find(
              ({ slug }) => slug === callback.callbackSlug,
            );
            const saved = savedCallbackDraft(callback, catalog);
            return (
              <div
                className="grid min-w-0 gap-3 rounded-md border border-white/10 bg-background/60 p-3 text-sm"
                key={callback.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 break-words font-medium">
                    {catalog?.label ?? callback.callbackSlug}
                  </span>
                  <Badge variant="outline">
                    {callback.active ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                {catalog && saved.invalidSavedMappings && (
                  <p role="alert" className="text-sm text-destructive">
                    These saved mappings use an older format. Edit and resave
                    them before this callback can run.
                  </p>
                )}
                {catalog && !saved.invalidSavedMappings && (
                  <dl className="grid min-w-0 gap-1 text-muted-foreground">
                    {catalog.inputs.map((input) => {
                      const source = saved.mappings[input.key];
                      const question =
                        source?.kind === "question"
                          ? questions.find(({ id }) => id === source.questionId)
                          : undefined;
                      return (
                        <div
                          className="grid min-w-0 grid-cols-[auto_1fr] gap-2"
                          key={input.key}
                        >
                          <dt className="font-medium text-foreground">
                            {input.label}:
                          </dt>
                          <dd className="min-w-0 break-words">
                            {callbackSourceSummary(source, question?.prompt)}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="min-h-11"
                    size="sm"
                    variant="outline"
                    disabled={pending || !catalog?.available || !editable}
                    onClick={() => selectCallback(callback.callbackSlug)}
                  >
                    Edit mappings
                  </Button>
                  {callback.active && (
                    <Button
                      className="min-h-11"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        void onDisableCallback(callback.callbackSlug)
                      }
                    >
                      Disable
                    </Button>
                  )}
                  {!callback.active && !saved.invalidSavedMappings && (
                    <Button
                      className="min-h-11"
                      size="sm"
                      disabled={
                        pending ||
                        !catalog?.available ||
                        !editable ||
                        !isCallbackDraftComplete(saved)
                      }
                      onClick={() => void onEnableCallback(saved)}
                    >
                      Enable
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          <div className="grid min-w-0 gap-2">
            <Label htmlFor="callback-action">Procedure</Label>
            <Select
              value={callbackDraft.slug}
              onValueChange={selectCallback}
              disabled={pending || !editable}
            >
              <SelectTrigger
                id="callback-action"
                className="h-auto min-h-11 min-w-0 whitespace-normal text-left [overflow-wrap:anywhere] [&>span]:line-clamp-none [&>span]:min-w-0 [&>svg]:shrink-0"
              >
                <SelectValue placeholder="No available procedures" />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">
                {callbacks.map((callback) => (
                  <SelectItem
                    className="min-h-11 whitespace-normal [overflow-wrap:anywhere]"
                    disabled={!callback.available}
                    key={callback.slug}
                    value={callback.slug}
                  >
                    {callback.label}
                    {callback.available
                      ? ""
                      : ` (requires ${callback.requiredPermission})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected && (
            <div className="grid min-w-0 gap-3">
              <p className="text-sm text-muted-foreground">
                {selected.description}
              </p>
              {callbackDraft.invalidSavedMappings && (
                <p role="alert" className="text-sm text-destructive">
                  Choose a current source for the saved inputs before saving.
                </p>
              )}
              {selected.inputs.map((input) => {
                const source = callbackDraft.mappings[input.key];
                const compatibleQuestions = questions.filter(
                  (question) =>
                    !question.retired &&
                    (!input.questionTypes ||
                      input.questionTypes.includes(question.type)),
                );
                const respondentValues =
                  input.respondentValues ?? allRespondentValues;
                return (
                  <section
                    className="grid min-w-0 gap-2 rounded-md border border-white/10 p-3"
                    key={input.key}
                  >
                    <div className="grid min-w-0 gap-1">
                      <Label htmlFor={`callback-source-${input.key}`}>
                        {input.label}
                      </Label>
                      {input.description && (
                        <p className="text-sm text-muted-foreground">
                          {input.description}
                        </p>
                      )}
                    </div>
                    <Select
                      value={sourceSelectValue(source)}
                      disabled={pending || !editable}
                      onValueChange={(value) => updateSource(input.key, value)}
                    >
                      <SelectTrigger
                        id={`callback-source-${input.key}`}
                        aria-label={`${input.label} source`}
                        className="h-auto min-h-11 min-w-0 whitespace-normal text-left [overflow-wrap:anywhere] [&>span]:line-clamp-none [&>span]:min-w-0 [&>svg]:shrink-0"
                      >
                        <SelectValue placeholder="Choose a source" />
                      </SelectTrigger>
                      <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">
                        {input.allowedSources.includes("respondent") &&
                          respondentValues.map((value) => (
                            <SelectItem
                              className="min-h-11"
                              key={value}
                              value={`respondent:${value}`}
                            >
                              {respondentValueLabels[value]}
                            </SelectItem>
                          ))}
                        {input.allowedSources.includes("question") &&
                          compatibleQuestions.map((question) => {
                            const selectedHere =
                              source?.kind === "question" &&
                              source.questionId === question.id;
                            return (
                              <SelectItem
                                className="min-h-11 whitespace-normal [overflow-wrap:anywhere]"
                                disabled={
                                  usedQuestionIds.has(question.id) &&
                                  !selectedHere
                                }
                                key={question.id}
                                value={`question:${question.id}`}
                              >
                                Question: {question.prompt}
                              </SelectItem>
                            );
                          })}
                        {input.allowedSources.includes("fixed") && (
                          <SelectItem className="min-h-11" value="fixed">
                            Manual value
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {source?.kind === "fixed" && (
                      <div className="grid min-w-0 gap-2">
                        <Label htmlFor={`callback-value-${input.key}`}>
                          {input.label} value
                        </Label>
                        <Input
                          id={`callback-value-${input.key}`}
                          className="h-11 min-w-0"
                          disabled={pending || !editable}
                          inputMode={
                            input.fixedInputType === "number"
                              ? "numeric"
                              : undefined
                          }
                          placeholder={input.placeholder}
                          type={input.fixedInputType}
                          value={source.value}
                          onChange={(event) =>
                            updateFixedValue(input.key, event.target.value)
                          }
                        />
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}

          {!editable && (
            <p className="text-sm text-muted-foreground">
              Callbacks are available only for forms with locked responses.
            </p>
          )}
          {!callbacks.some(({ available }) => available) && (
            <p className="text-sm text-muted-foreground">
              You do not have permission to configure these procedures.
            </p>
          )}
          {error && (
            <p role="alert" className="break-words text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            className="h-auto min-h-11 whitespace-normal"
            disabled={
              !editable ||
              pending ||
              !selected?.available ||
              !isCallbackDraftComplete(callbackDraft)
            }
            onClick={() => void onAddCallback()}
          >
            {configureCallbackPending ? "Saving…" : "Save for future responses"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Each question can fill one input. Earlier responses are not resent.
            Check the Delivery tab for results.
          </p>
        </div>
        <DialogFooter>
          <Button
            className="min-h-11"
            variant="outline"
            disabled={pending}
            onClick={onClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
