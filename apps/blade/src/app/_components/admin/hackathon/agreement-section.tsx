"use client";

import { useState } from "react";
import { Check, ExternalLink, FileCheck2, Loader2, Plus } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
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
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";
import { Switch } from "@forge/ui/switch";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

type Detail = RouterOutputs["hackathon"]["get"];
type Agreement = Detail["agreements"][number];
type AgreementStage = Agreement["stage"];

const STAGES = [
  {
    description: "Accepted while submitting an application.",
    label: "Application",
    value: "application",
  },
  {
    description: "Accepted when an admitted hacker confirms attendance.",
    label: "Confirmation",
    value: "confirmation",
  },
] as const;

interface AgreementDraft {
  active: boolean;
  key: string;
  legalText: string;
  required: boolean;
  stage: AgreementStage;
  title: string;
  url: string;
  version: string;
}

const EMPTY_DRAFT: AgreementDraft = {
  active: true,
  key: "",
  legalText: "",
  required: true,
  stage: "application",
  title: "",
  url: "",
  version: "",
};

function stageLabel(stage: AgreementStage) {
  return STAGES.find((candidate) => candidate.value === stage)?.label ?? stage;
}

export function AgreementSection({
  detail,
  isRefreshing,
  onSaved,
}: {
  detail: Detail;
  isRefreshing: boolean;
  onSaved: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<AgreementDraft>(EMPTY_DRAFT);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const patch = (next: Partial<AgreementDraft>) =>
    setDraft((current) => ({ ...current, ...next }));

  const create = api.hackathon.createAgreement.useMutation({
    onError: (error) => toast.error(error.message),
    onSuccess: () => {
      setDraft(EMPTY_DRAFT);
      setCreating(false);
      toast.success("Agreement version created.");
      onSaved();
    },
  });
  const activate = api.hackathon.activateAgreement.useMutation({
    onError: (error) => {
      setActivatingId(null);
      toast.error(error.message);
    },
    onSuccess: () => {
      setActivatingId(null);
      toast.success("Active agreement version changed.");
      onSaved();
    },
  });

  const dialogComplete =
    draft.key.trim() !== "" &&
    draft.title.trim() !== "" &&
    draft.version.trim() !== "" &&
    (draft.legalText.trim() !== "" || draft.url.trim() !== "");
  const busy = activate.isPending || isRefreshing;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck2 className="size-5" aria-hidden="true" /> Agreements
          </CardTitle>
          <CardDescription>
            Version the terms hackers accept at application and confirmation.
            Activating a newer version preserves every prior definition and
            acceptance record.
          </CardDescription>
          <CardAction>
            <Button
              className="min-h-11 gap-2"
              onClick={() => setCreating(true)}
              variant="secondary"
            >
              <Plus className="size-4" aria-hidden="true" /> Add version
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="grid gap-5">
          {detail.agreements.length === 0 ? (
            <div className="rounded-md border border-dashed p-4">
              <p className="font-medium">No agreement versions yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add the current Knight Hacks and MLH terms before opening the
                Hacker SDK application flow.
              </p>
            </div>
          ) : (
            STAGES.map((stage) => {
              const agreements = detail.agreements.filter(
                (agreement) => agreement.stage === stage.value,
              );
              return (
                <section className="grid gap-3" key={stage.value}>
                  <div>
                    <h3 className="font-medium">{stage.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {stage.description}
                    </p>
                  </div>
                  {agreements.length === 0 ? (
                    <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                      No {stage.label.toLowerCase()} agreement versions.
                    </p>
                  ) : (
                    <div
                      aria-label={`${stage.label} agreement versions`}
                      className="max-h-[28rem] space-y-2 overflow-y-auto rounded-md border border-white/10 bg-background/40 p-2"
                      tabIndex={0}
                    >
                      {agreements.map((agreement) => (
                        <AgreementRow
                          agreement={agreement}
                          busy={busy}
                          isActivating={activatingId === agreement.id}
                          key={agreement.id}
                          onActivate={() => {
                            setActivatingId(agreement.id);
                            activate.mutate({
                              active: true,
                              definitionId: agreement.id,
                              hackathonId: detail.hackathon.id,
                            });
                          }}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog
        onOpenChange={(open) => {
          if (!open) setDraft(EMPTY_DRAFT);
          setCreating(open);
        }}
        open={creating}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add agreement version</DialogTitle>
            <DialogDescription>
              Create a new immutable version. Use the same key for later
              revisions of the same agreement.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="agreement-stage">Lifecycle stage</Label>
                <ResponsiveComboBox
                  ariaLabel="Agreement lifecycle stage"
                  buttonPlaceholder="Choose a stage"
                  getItemLabel={(stage) => stage.label}
                  getItemValue={(stage) => stage.value}
                  inputPlaceholder="Search stages"
                  items={STAGES}
                  onValueChange={(value) =>
                    patch({ stage: value as AgreementStage })
                  }
                  renderItem={(stage) => stage.label}
                  triggerClassName="h-11 bg-background/70"
                  triggerId="agreement-stage"
                  value={draft.stage}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="agreement-key">Agreement key</Label>
                <Input
                  className="h-11 bg-background/70 font-mono"
                  id="agreement-key"
                  maxLength={64}
                  onChange={(event) => patch({ key: event.target.value })}
                  placeholder="mlh-terms"
                  value={draft.key}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="agreement-title">Title</Label>
                <Input
                  className="h-11 bg-background/70"
                  id="agreement-title"
                  maxLength={255}
                  onChange={(event) => patch({ title: event.target.value })}
                  placeholder="MLH code of conduct"
                  value={draft.title}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="agreement-version">Version</Label>
                <Input
                  className="h-11 bg-background/70 font-mono"
                  id="agreement-version"
                  maxLength={64}
                  onChange={(event) => patch({ version: event.target.value })}
                  placeholder="2026-08"
                  value={draft.version}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="agreement-url">Terms URL (optional)</Label>
              <Input
                className="h-11 bg-background/70"
                id="agreement-url"
                onChange={(event) => patch({ url: event.target.value })}
                placeholder="https://mlh.io/terms"
                type="url"
                value={draft.url}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="agreement-legal-text">
                Legal text {draft.url.trim() === "" ? "" : "(optional)"}
              </Label>
              <Textarea
                className="min-h-32 bg-background/70"
                id="agreement-legal-text"
                onChange={(event) => patch({ legalText: event.target.value })}
                placeholder="Paste the agreement text hackers must accept."
                value={draft.legalText}
              />
              <p className="text-sm text-muted-foreground">
                Supply legal text, a URL, or both. Stored versions are never
                edited after creation.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SwitchField
                checked={draft.required}
                description="The participant must accept it to continue."
                id="agreement-required"
                label="Required"
                onCheckedChange={(required) => patch({ required })}
              />
              <SwitchField
                checked={draft.active}
                description="Replace the active version for this stage and key."
                id="agreement-active"
                label="Make active now"
                onCheckedChange={(active) => patch({ active })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={create.isPending}
              onClick={() => {
                setDraft(EMPTY_DRAFT);
                setCreating(false);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="min-h-11 gap-2"
              disabled={create.isPending || !dialogComplete}
              onClick={() =>
                create.mutate({
                  active: draft.active,
                  hackathonId: detail.hackathon.id,
                  key: draft.key.trim(),
                  legalText: draft.legalText.trim() || null,
                  required: draft.required,
                  stage: draft.stage,
                  title: draft.title.trim(),
                  url: draft.url.trim() || null,
                  version: draft.version.trim(),
                })
              }
            >
              {create.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="size-4" aria-hidden="true" />
              )}
              Create version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AgreementRow({
  agreement,
  busy,
  isActivating,
  onActivate,
}: {
  agreement: Agreement;
  busy: boolean;
  isActivating: boolean;
  onActivate: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-white/10 bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="break-words font-medium">{agreement.title}</p>
          <Badge variant={agreement.active ? "secondary" : "outline"}>
            {agreement.active ? (
              <Check className="mr-1 size-3" aria-hidden="true" />
            ) : null}
            {agreement.active ? "Active" : "Historical"}
          </Badge>
          <Badge variant="outline">
            {agreement.required ? "Required" : "Optional"}
          </Badge>
        </div>
        <p className="mt-1 break-all font-mono text-sm text-muted-foreground">
          {agreement.key} · {agreement.version} · {stageLabel(agreement.stage)}
        </p>
        {agreement.url ? (
          <a
            className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
            href={agreement.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            View linked terms
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        ) : null}
      </div>
      {agreement.active ? null : (
        <Button
          className="min-h-11 shrink-0 gap-2"
          disabled={busy}
          onClick={onActivate}
          size="sm"
          variant="secondary"
        >
          {isActivating ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          Make active
        </Button>
      )}
    </div>
  );
}

function SwitchField({
  checked,
  description,
  id,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description: string;
  id: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-11 items-start justify-between gap-4 rounded-md border border-white/10 bg-background/60 p-4">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} id={id} onCheckedChange={onCheckedChange} />
    </div>
  );
}
