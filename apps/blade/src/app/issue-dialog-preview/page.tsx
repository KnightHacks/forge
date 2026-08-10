"use client";

import * as React from "react";

import type { IssueFormValues } from "@forge/consts/src/issue";
import { Button } from "@forge/ui/button";

import { CreateEditDialog } from "../_components/issues/create-edit-dialog";

const previewTeams = [
  { id: "design", label: "Design" },
  { id: "workshop", label: "Workshop" },
  { id: "programs", label: "Programs" },
];

const previewAssignees = [
  { id: "ada", label: "Ada Lovelace", sublabel: "Design" },
  { id: "grace", label: "Grace Hopper", sublabel: "Programs" },
  { id: "alan", label: "Alan Turing", sublabel: "Workshop" },
];

type DialogIntent = "create" | "edit";

const sampleIssue: IssueFormValues = {
  name: "Finalize sponsor tour logistics",
  status: "confirmed",
  description:
    "Coordinate the Friday sponsor floor walk-through, confirm wayfinding signage, and lock in volunteer coverage.",
  date: "2026-02-11T13:00",
  event: "evt_sponsor_walk",
  team: "design",
  parent: "",
  links: ["https://knighthacks.notion.site/sponsor-tour-checklist"],
  assigneeIds: ["ada", "grace"],
  teamVisibilityIds: ["design", "programs"],
};

export default function IssueDialogPreviewPage() {
  const [intent, setIntent] = React.useState<DialogIntent>("create");
  const [open, setOpen] = React.useState(false);
  const [lastAction, setLastAction] = React.useState<string>("No actions yet.");

  const handleSubmit = (values: IssueFormValues) => {
    setLastAction(
      `[submit] ${new Date().toLocaleTimeString()}: ${JSON.stringify(values, null, 2)}`,
    );
    setOpen(false);
  };

  const handleDelete = (values: IssueFormValues) => {
    setLastAction(
      `[delete] ${new Date().toLocaleTimeString()}: ${JSON.stringify(values, null, 2)}`,
    );
    setOpen(false);
  };

  return (
    <main className="min-h-screen bg-[#05050a] px-6 py-10 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
            Preview
          </p>
          <h1 className="text-3xl font-semibold">Issue Dialog Playground</h1>
          <p className="max-w-2xl text-sm text-white/70">
            Use the controls below to open the dialog in either create or edit
            mode. Submission payloads render underneath so you can verify the
            component wiring even before the data layer ships.
          </p>
        </header>

        <section className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur">
          <p className="text-sm text-white/80">Launch the dialog:</p>
          <div className="flex flex-wrap gap-3">
            <Button
              className="flex-1 sm:flex-none"
              onClick={() => {
                setIntent("create");
                setOpen(true);
              }}
            >
              Open Create Dialog
            </Button>
            <Button
              className="flex-1 sm:flex-none"
              variant="secondary"
              onClick={() => {
                setIntent("edit");
                setOpen(true);
              }}
            >
              Open Edit Dialog
            </Button>
          </div>
          <p className="text-xs text-white/60">
            The edit dialog seeds example data; create dialog uses the default
            internal state.
          </p>
        </section>

        <section className="space-y-2 rounded-3xl border border-white/10 bg-black/40 p-6 font-mono text-xs text-white/80">
          <div className="flex items-center justify-between text-white/60">
            <span>Action log</span>
            <Button
              variant="ghost"
              className="h-8 px-3 text-xs text-white/60 hover:text-white"
              onClick={() => setLastAction("No actions yet.")}
            >
              Clear
            </Button>
          </div>
          <pre className="overflow-auto whitespace-pre-wrap rounded-2xl bg-black/60 p-4 text-[11px] leading-relaxed">
            {lastAction}
          </pre>
        </section>
      </div>

      <CreateEditDialog
        open={open}
        intent={intent}
        initialValues={intent === "edit" ? sampleIssue : undefined}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        teamOptions={previewTeams}
        teamVisibilityOptions={previewTeams}
        assigneeOptions={previewAssignees}
      />
    </main>
  );
}
