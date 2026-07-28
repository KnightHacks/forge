"use client";

import type { Dispatch, SetStateAction } from "react";

import type { FormQuestion } from "@forge/validators";
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

import type { FormResponseMode } from "./form-availability-draft";
import type { CallbackCatalogItem } from "./form-builder-types";
import type { FormCallbackDraft } from "./form-callback-mappings";

export function FormCallbacksDialog({
  callbackDraft,
  callbacks,
  configureCallbackPending,
  configuredCallbacks,
  disableCallbackPending,
  onAddCallback,
  onClose,
  onDisableCallback,
  onOpenChange,
  open,
  questions,
  responseMode,
  setCallbackDraft,
}: {
  callbackDraft: FormCallbackDraft;
  callbacks: CallbackCatalogItem[];
  configureCallbackPending: boolean;
  configuredCallbacks: { active: boolean; callbackSlug: string; id: string }[];
  disableCallbackPending: boolean;
  onAddCallback: () => Promise<void>;
  onClose: () => void;
  onDisableCallback: (callbackSlug: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  questions: FormQuestion[];
  responseMode: FormResponseMode;
  setCallbackDraft: Dispatch<SetStateAction<FormCallbackDraft>>;
}) {
  function updateCallbackDraft<Key extends keyof FormCallbackDraft>(
    key: Key,
    value: FormCallbackDraft[Key],
  ) {
    setCallbackDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Callbacks</DialogTitle>
          <DialogDescription>
            Configure code-owned actions for future locked responses.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {configuredCallbacks
            .filter(({ active }) => active)
            .map((callback) => (
              <div
                className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-background/60 p-3 text-sm"
                key={callback.id}
              >
                <span>{callback.callbackSlug}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={disableCallbackPending}
                  onClick={() => onDisableCallback(callback.callbackSlug)}
                >
                  Disable
                </Button>
              </div>
            ))}
          <select
            aria-label="Callback"
            className="h-11 rounded-md border border-input bg-background px-3"
            value={callbackDraft.slug}
            onChange={(event) =>
              updateCallbackDraft("slug", event.target.value)
            }
          >
            {callbacks.map((callback) => (
              <option
                disabled={!callback.available}
                key={callback.slug}
                value={callback.slug}
              >
                {callback.label}
                {callback.available
                  ? ""
                  : ` — needs ${callback.requiredPermission}`}
              </option>
            ))}
          </select>
          {callbackDraft.slug === "recruiting.notify" && (
            <select
              aria-label="Map note from question"
              className="h-11 rounded-md border border-input bg-background px-3"
              value={callbackDraft.questionId}
              onChange={(event) =>
                updateCallbackDraft("questionId", event.target.value)
              }
            >
              <option value="">Use fixed note</option>
              {questions
                .filter(
                  (question) =>
                    question.type === "short_text" ||
                    question.type === "paragraph",
                )
                .map((question) => (
                  <option key={question.id} value={question.id}>
                    {question.prompt}
                  </option>
                ))}
            </select>
          )}
          {(!callbackDraft.questionId ||
            callbackDraft.slug === "discord.assign-role") && (
            <Input
              className="h-11"
              placeholder={
                callbackDraft.slug === "discord.assign-role"
                  ? "Assignable Blade role UUID"
                  : "Fixed recruiting note"
              }
              value={callbackDraft.value}
              onChange={(event) =>
                updateCallbackDraft("value", event.target.value)
              }
            />
          )}
          <Button
            variant="outline"
            className="min-h-11"
            disabled={
              responseMode === "single_editable" || configureCallbackPending
            }
            onClick={() => void onAddCallback()}
          >
            Configure for future responses
          </Button>
          <p className="text-xs text-muted-foreground">
            Respondents never see callback configuration or execution status.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
