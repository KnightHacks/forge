"use client";

import {
  Archive,
  Loader2,
  MoreHorizontal,
  Save,
  Send,
  Settings2,
  Share2,
  Workflow,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";

import type { BuilderDialog, BuilderInitial } from "./form-builder-types";

/**
 * The header's action row. This returns a fragment on purpose: the buttons are
 * laid out by the header's own `flex ... gap-2` container, which spaces direct
 * children, so an element around them would swallow the gaps.
 */
export function FormBuilderHeaderActions({
  busy,
  initial,
  onOpenDialog,
  onSave,
  onShare,
  onTransition,
  readOnly,
  shareAssets,
}: {
  busy: boolean;
  initial?: BuilderInitial;
  onOpenDialog: (dialog: Exclude<BuilderDialog, "none">) => void;
  onSave: () => Promise<void>;
  onShare: () => void;
  onTransition: (targetState: "archived" | "published") => Promise<void>;
  readOnly: boolean;
  shareAssets?: RouterOutputs["forms"]["getShareAssets"];
}) {
  return (
    <>
      {initial && <Badge variant="outline">{initial.state}</Badge>}
      {!readOnly && (
        <Button
          variant="outline"
          className="min-h-11 gap-2"
          onClick={() => onOpenDialog("settings")}
        >
          <Settings2 className="h-4 w-4" aria-hidden="true" /> Settings
        </Button>
      )}
      {initial && !readOnly && (
        <Button
          variant="outline"
          className="min-h-11 gap-2"
          onClick={() => onOpenDialog("callbacks")}
        >
          <Workflow className="h-4 w-4" aria-hidden="true" /> Callbacks
        </Button>
      )}
      {initial && !readOnly && (
        <Button
          variant="outline"
          className="min-h-11 gap-2"
          disabled={!shareAssets}
          onClick={() => onShare()}
        >
          <Share2 className="h-4 w-4" aria-hidden="true" /> Share
        </Button>
      )}
      {initial && (
        <Button
          variant="outline"
          className="min-h-11 gap-2"
          aria-label="More form actions"
          onClick={() => onOpenDialog("actions")}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" /> More
        </Button>
      )}
      {!readOnly && initial?.state === "draft" && (
        <Button
          className="min-h-11 gap-2"
          onClick={() => void onTransition("published")}
        >
          <Send className="h-4 w-4" aria-hidden="true" /> Publish
        </Button>
      )}
      {!readOnly && initial?.state === "published" && (
        <Button
          variant="outline"
          className="min-h-11 gap-2"
          onClick={() => void onTransition("archived")}
        >
          <Archive className="h-4 w-4" aria-hidden="true" /> Archive
        </Button>
      )}
      {!readOnly && initial?.state === "archived" && (
        <Button
          className="min-h-11"
          onClick={() => void onTransition("published")}
        >
          Republish
        </Button>
      )}
      {!readOnly && (
        <Button
          className="min-h-11 gap-2"
          disabled={busy}
          onClick={() => void onSave()}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save
        </Button>
      )}
    </>
  );
}
