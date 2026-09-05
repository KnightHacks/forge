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
import { Textarea } from "@forge/ui/textarea";

import type { FormResponseMode } from "./form-availability-draft";
import type { CallbackCatalogItem } from "./form-builder-types";
import type {
  ConfiguredFormCallback,
  FormCallbackDraft,
} from "./form-callback-mappings";
import { savedCallbackDraft } from "./form-callback-mappings";

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
  onOpenChange: (open: boolean) => void;
  open: boolean;
  questions: FormQuestion[];
  responseMode: FormResponseMode;
  setCallbackDraft: Dispatch<SetStateAction<FormCallbackDraft>>;
}) {
  const selected = callbacks.find(({ slug }) => slug === callbackDraft.slug);
  const pending = configureCallbackPending || disableCallbackPending;
  const editable = responseMode !== "single_editable";
  const textQuestions = questions.filter(
    (question) =>
      !question.retired &&
      (question.type === "short_text" || question.type === "paragraph"),
  );

  function selectCallback(slug: string) {
    const saved = configuredCallbacks.find(
      (callback) => callback.callbackSlug === slug,
    );
    setCallbackDraft(
      saved ? savedCallbackDraft(saved) : { slug, questionId: "", value: "" },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90svh] w-[calc(100vw-2rem)] min-w-0 max-w-xl overflow-y-auto p-4 sm:p-6 [&>button]:right-1 [&>button]:top-1 [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center">
        <DialogHeader className="min-w-0 text-left">
          <DialogTitle>Callbacks</DialogTitle>
          <DialogDescription>
            Choose what happens after a new response is submitted. Changes apply
            to future responses only.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-w-0 gap-4">
          {configuredCallbacks.map((callback) => {
            const catalog = callbacks.find(
              ({ slug }) => slug === callback.callbackSlug,
            );
            const saved = savedCallbackDraft(callback);
            const question = questions.find(
              ({ id }) => id === saved.questionId,
            );
            return (
              <div
                className="grid min-w-0 gap-2 rounded-md border border-white/10 bg-background/60 p-3 text-sm"
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
                <p className="min-w-0 break-words text-muted-foreground">
                  {callback.callbackSlug === "recruiting.notify"
                    ? saved.questionId
                      ? `Note from answer: ${question?.prompt ?? "Unavailable question. Choose another source."}`
                      : `Fixed note: ${saved.value || "Not configured"}`
                    : "Assigns the configured Blade role to the respondent."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="min-h-11"
                    size="sm"
                    variant="outline"
                    disabled={pending || !catalog?.available || !editable}
                    onClick={() => selectCallback(callback.callbackSlug)}
                  >
                    Edit settings
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
                </div>
              </div>
            );
          })}
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="callback-action">Action</Label>
            <Select
              value={callbackDraft.slug}
              onValueChange={selectCallback}
              disabled={pending || !editable}
            >
              <SelectTrigger
                id="callback-action"
                className="h-auto min-h-11 min-w-0 whitespace-normal text-left [overflow-wrap:anywhere] [&>span]:line-clamp-none [&>span]:min-w-0 [&>svg]:shrink-0"
              >
                <SelectValue placeholder="No available actions" />
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
            <p className="text-sm text-muted-foreground">
              {selected.slug === "recruiting.notify"
                ? "Sends the respondent’s name, email, and one note to the configured recruiting Discord channel. Choose a fixed note or a text answer below."
                : selected.description}
            </p>
          )}
          {selected?.slug === "recruiting.notify" && (
            <div className="grid min-w-0 gap-2">
              <Label htmlFor="callback-note-source">Note source</Label>
              <Select
                value={callbackDraft.questionId || "fixed"}
                disabled={pending || !editable}
                onValueChange={(value) =>
                  setCallbackDraft((current) => ({
                    ...current,
                    questionId: value === "fixed" ? "" : value,
                  }))
                }
              >
                <SelectTrigger
                  id="callback-note-source"
                  className="h-auto min-h-11 min-w-0 whitespace-normal text-left [overflow-wrap:anywhere] [&>span]:line-clamp-none [&>span]:min-w-0 [&>svg]:shrink-0"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">
                  <SelectItem className="min-h-11" value="fixed">
                    Fixed note for every response
                  </SelectItem>
                  {textQuestions.map((question) => (
                    <SelectItem
                      className="min-h-11 whitespace-normal [overflow-wrap:anywhere]"
                      key={question.id}
                      value={question.id}
                    >
                      {question.prompt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {callbackDraft.questionId && (
                <p className="text-sm text-muted-foreground">
                  The selected answer must contain text and be no more than
                  1,500 characters.
                </p>
              )}
            </div>
          )}
          {selected &&
            (!callbackDraft.questionId ||
              selected.slug === "discord.assign-role") && (
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="callback-value">
                  {selected.slug === "discord.assign-role"
                    ? "Assignable Blade role UUID"
                    : "Recruiting note"}
                </Label>
                {selected.slug === "discord.assign-role" ? (
                  <Input
                    id="callback-value"
                    className="h-11 min-w-0"
                    disabled={pending || !editable}
                    value={callbackDraft.value}
                    onChange={(event) =>
                      setCallbackDraft((current) => ({
                        ...current,
                        value: event.target.value,
                      }))
                    }
                  />
                ) : (
                  <Textarea
                    id="callback-value"
                    className="min-w-0"
                    maxLength={1500}
                    disabled={pending || !editable}
                    value={callbackDraft.value}
                    onChange={(event) =>
                      setCallbackDraft((current) => ({
                        ...current,
                        value: event.target.value,
                      }))
                    }
                  />
                )}
              </div>
            )}
          {!editable && (
            <p className="text-sm text-muted-foreground">
              Callbacks are available only for forms with locked responses.
            </p>
          )}
          {!callbacks.some(({ available }) => available) && (
            <p className="text-sm text-muted-foreground">
              You do not have permission to configure these actions.
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
              (!callbackDraft.questionId && !callbackDraft.value.trim())
            }
            onClick={() => void onAddCallback()}
          >
            {configureCallbackPending ? "Saving…" : "Save for future responses"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Earlier responses are not resent. Check the Delivery tab for
            results.
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
