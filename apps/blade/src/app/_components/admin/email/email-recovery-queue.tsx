"use client";

import { useState } from "react";
import { CircleAlert, Loader2, RefreshCw, Search } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
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

import { formatClubDateTime } from "~/lib/dates";
import { statusClass, statusLabel } from "./email-send-status";
import { useEmailRecovery } from "./use-email-recovery";

type Investigation = RouterOutputs["email"]["investigateSend"];

const recipientLabels: Record<string, string> = {
  retryable: "Temporary failure",
  permanent: "Permanent rejection",
  unknown: "Needs investigation",
  unconfirmed: "No failure recorded",
  excluded: "Excluded",
  retried: "Retry already queued",
  ineligible: "No longer eligible",
};

export function RecipientRetryReview({
  detail,
  onClose,
  onRetry,
  onReviewRetry,
  pending,
  error,
}: {
  detail: Investigation;
  onClose: () => void;
  onRetry: (ids: string[]) => void;
  onReviewRetry?: (sendId: string) => void;
  pending: boolean;
  error?: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("retryable");
  const [offset, setOffset] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const eligible = detail.recipients.filter(
    (row) => row.status === "retryable",
  );
  const visible = detail.recipients.filter(
    (row) =>
      (confirming
        ? selected.has(row.id)
        : filter === "all" || row.status === filter) &&
      row.email.toLowerCase().includes(query.toLowerCase()),
  );
  const page = visible.slice(offset, offset + 25);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className="flex max-h-[94svh] w-[calc(100%-1rem)] max-w-4xl flex-col overflow-hidden border-white/10 bg-card p-0">
        <DialogHeader className="shrink-0 border-b border-border p-4 pr-12 sm:p-6">
          <DialogTitle>
            {confirming
              ? "Confirm selected retries"
              : "Review delivery failures"}
          </DialogTitle>
          <DialogDescription className="break-words">
            {detail.send.subject} · {formatClubDateTime(detail.send.createdAt)}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-4 overflow-y-auto p-4 sm:p-6">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span>
              <strong>
                {detail.send.sent}/{detail.send.expected}
              </strong>{" "}
              reported sent
            </span>
            <span>
              <strong>{eligible.length}</strong> eligible temporary failures
            </span>
            <span>
              <strong>{selected.size}</strong> selected
            </span>
          </div>
          <div className="rounded-md border border-primary/30 bg-background/60 p-3 text-sm leading-6">
            {confirming
              ? `Queue the original email for ${selected.size === 1 ? "this selected recipient" : `these ${selected.size} selected recipients`} only. Their eligibility will be checked again before queueing. You are reviewing an email from ${formatClubDateTime(detail.send.createdAt)}; confirm its instructions are still appropriate.`
              : "Select only the recipients you want to retry. Unknown outcomes and permanent rejections cannot be retried here. “No failure recorded” does not confirm inbox delivery."}
          </div>
          {!detail.complete && (
            <p
              role="status"
              className="flex items-start gap-2 rounded-md border border-destructive/40 p-3 text-sm"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              The provider evidence is incomplete. No recipients can be retried
              safely from this review.
            </p>
          )}
          {detail.retries.length > 0 && (
            <section aria-label="Retry history" className="space-y-2">
              <h3 className="text-sm font-semibold">Previous retries</h3>
              {detail.retries.map((retry) => (
                <div
                  key={retry.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                >
                  <span>
                    {formatClubDateTime(retry.createdAt)} ·{" "}
                    {statusLabel(retry.status)}
                    {" · "}
                    {retry.sent}/{retry.expected} reported sent
                  </span>
                  {retry.status === "failed" &&
                    retry.providerMayHaveStarted &&
                    onReviewRetry && (
                      <Button
                        variant="outline"
                        disabled={pending}
                        onClick={() => onReviewRetry(retry.id)}
                      >
                        Review retry
                      </Button>
                    )}
                </div>
              ))}
            </section>
          )}
          <Button
            variant="outline"
            onClick={() => setShowMessage(!showMessage)}
          >
            {showMessage ? "Hide original email" : "Preview original email"}
          </Button>
          {showMessage &&
            (detail.send.compiledHtml ? (
              <iframe
                sandbox=""
                title="Original email for retry"
                srcDoc={detail.send.compiledHtml}
                className="h-80 w-full rounded-md border bg-white"
              />
            ) : (
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border p-3 text-sm">
                {detail.send.compiledText}
              </pre>
            ))}
          {!confirming && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="recovery-recipient-filter">
                Recipient status
              </label>
              <select
                id="recovery-recipient-filter"
                className="h-11 max-w-full rounded-md border border-input bg-background px-3 text-sm"
                value={filter}
                onChange={(event) => {
                  setFilter(event.target.value);
                  setOffset(0);
                }}
              >
                <option value="all">
                  All recipients ({detail.recipients.length})
                </option>
                {Object.entries(recipientLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label} (
                    {
                      detail.recipients.filter((row) => row.status === value)
                        .length
                    }
                    )
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                disabled={eligible.length === 0}
                onClick={() =>
                  setSelected(
                    new Set(eligible.slice(0, 500).map((row) => row.id)),
                  )
                }
              >
                Select {Math.min(500, eligible.length)} retryable
              </Button>
              <Button variant="ghost" onClick={() => setSelected(new Set())}>
                Clear selection
              </Button>
            </div>
          )}
          <Input
            aria-label="Search recovery recipients"
            placeholder="Search email addresses"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOffset(0);
            }}
            className="h-11"
          />
          <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
            {page.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No recipients match this view.
              </p>
            )}
            {page.map((row) => (
              <div
                key={row.id}
                className="flex min-h-14 items-start gap-3 bg-background/60 p-3"
              >
                {!confirming && (
                  <input
                    aria-label={`Retry ${row.email}`}
                    type="checkbox"
                    className="mt-1 size-5 shrink-0"
                    checked={selected.has(row.id)}
                    disabled={
                      row.status !== "retryable" ||
                      (!selected.has(row.id) && selected.size >= 500)
                    }
                    onChange={(event) =>
                      setSelected((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(row.id);
                        else next.delete(row.id);
                        return next;
                      })
                    }
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block break-all text-sm font-medium">
                    {row.email}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {recipientLabels[row.status]}
                    {row.smtpCode ? ` · SMTP ${row.smtpCode}` : ""}
                    {row.status === "ineligible"
                      ? " · Audience changed or delivery suppressed"
                      : ""}
                  </span>
                </span>
                {!confirming && row.status === "retryable" && (
                  <Button
                    variant="outline"
                    className="h-11 shrink-0 self-center px-3"
                    aria-label={`Review retry for ${row.email}`}
                    disabled={pending}
                    onClick={() => {
                      setSelected(new Set([row.id]));
                      setQuery("");
                      setOffset(0);
                      setConfirming(true);
                    }}
                  >
                    Retry
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span>
              {visible.length === 0 ? 0 : offset + 1}-
              {Math.min(offset + 25, visible.length)} of {visible.length}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - 25))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={offset + 25 >= visible.length}
                onClick={() => setOffset(offset + 25)}
              >
                Next
              </Button>
            </div>
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 p-3 text-sm"
            >
              {error}
            </p>
          )}
        </div>
        <DialogFooter className="shrink-0 border-t border-border p-4">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => (confirming ? setConfirming(false) : onClose())}
          >
            {confirming ? "Back to recipients" : "Close"}
          </Button>
          <Button
            disabled={pending || selected.size === 0}
            onClick={() => {
              if (confirming) onRetry([...selected]);
              else {
                setConfirming(true);
                setQuery("");
                setOffset(0);
              }
            }}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {confirming
              ? `Queue ${selected.size} ${selected.size === 1 ? "retry" : "retries"}`
              : `Review ${selected.size} selected`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EmailRecoveryQueue() {
  const state = useEmailRecovery();
  const [preparation, setPreparation] = useState<
    RouterOutputs["email"]["listRecoveryQueue"]["items"][number] | null
  >(null);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Delivery queue</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review delivery problems and follow queued sends across all your
            emails.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={state.queue.isFetching}
          onClick={() => void state.queue.refetch()}
        >
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
        <Input
          aria-label="Search email queue"
          placeholder="Search email subjects"
          className="h-11 pl-9"
          value={state.query}
          onChange={(event) => state.search(event.target.value)}
        />
      </div>
      {state.queue.isPending && (
        <p role="status" className="p-8 text-center text-sm">
          Loading delivery queue…
        </p>
      )}
      {(state.queue.error || state.investigate.error) && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 p-3 text-sm"
        >
          {state.queue.error?.message ?? state.investigate.error?.message}
        </p>
      )}
      {state.queue.data && (
        <>
          <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
            {state.queue.data.items.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No queued sends or delivery problems match this search.
              </p>
            )}
            {state.queue.data.items.map((send) => (
              <article
                key={send.id}
                aria-label={`${send.subject} delivery`}
                className="flex flex-col gap-3 bg-background/60 p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="break-words font-medium">{send.subject}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatClubDateTime(send.createdAt)}
                  </p>
                  <p className="mt-2 text-sm">
                    <strong>
                      {send.providerSentCount}/{send.finalRecipientCount}
                    </strong>{" "}
                    reported sent · {send.providerBounceCount} reported bounces
                  </p>
                  {send.safeError && (
                    <p className="mt-1 break-words text-sm text-muted-foreground">
                      {send.safeError}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Badge variant="outline" className={statusClass(send.status)}>
                    {send.status === "failed"
                      ? "Needs attention"
                      : statusLabel(send.status)}
                  </Badge>
                  {send.status === "failed" &&
                    (send.providerMayHaveStarted ? (
                      <Button
                        variant="outline"
                        disabled={state.investigate.isPending}
                        onClick={() => {
                          state.retry.reset();
                          state.investigate.mutate({ sendId: send.id });
                        }}
                      >
                        {state.investigate.isPending &&
                          state.investigate.variables.sendId === send.id && (
                            <Loader2 className="size-4 animate-spin" />
                          )}
                        Review recipients
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setPreparation(send)}
                      >
                        Retry preparation
                      </Button>
                    ))}
                </div>
              </article>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span>
              {state.queue.data.total} sends · Page{" "}
              {Math.floor(state.offset / 25) + 1}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={state.offset === 0}
                onClick={() => state.setOffset(Math.max(0, state.offset - 25))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={state.offset + 25 >= state.queue.data.total}
                onClick={() => state.setOffset(state.offset + 25)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
      {state.investigate.data && (
        <RecipientRetryReview
          key={state.investigate.data.investigationId}
          detail={state.investigate.data}
          pending={state.retry.isPending}
          error={state.retry.error?.message}
          onClose={() => state.investigate.reset()}
          onReviewRetry={(sendId) => {
            state.retry.reset();
            state.investigate.mutate({ sendId });
          }}
          onRetry={(recipientIds) => {
            const detail = state.investigate.data;
            if (detail)
              state.retry.mutate({
                sendId: detail.send.id,
                investigationId: detail.investigationId,
                recipientIds,
              });
          }}
        />
      )}
      {preparation && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setPreparation(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Retry email preparation?</DialogTitle>
              <DialogDescription>
                {preparation.subject} · {preparation.finalRecipientCount}{" "}
                recipients. Delivery has not started. This will queue the
                original email again.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreparation(null)}>
                Cancel
              </Button>
              <Button
                disabled={state.retryPreparation.isPending}
                onClick={() =>
                  state.retryPreparation.mutate(
                    { sendId: preparation.id },
                    { onSuccess: () => setPreparation(null) },
                  )
                }
              >
                Queue retry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
