import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Card } from "@forge/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { toast } from "@forge/ui/toast";

import type { MatchingType } from "./linker";
import { api } from "~/trpc/react";

export function ConnectionViewer({
  matching,
  form_slug,
}: {
  matching: MatchingType & { id: string };
  form_slug: string;
}) {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();

  const handleDeleteCon = api.forms.deleteConnection.useMutation({
    onSuccess() {
      toast.success("Connection deleted");
      setOpen(false);
    },
    onError() {
      toast.error("Failed to delete connection");
    },
    async onSettled() {
      await utils.forms.getConnections.invalidate();
    },
  });

  const handleDelete = () => {
    handleDeleteCon.mutate({ id: matching.id });
  };

  return (
    <Card className="mb-6 overflow-hidden border-l-4 border-l-primary">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Procedure
                </div>
                <div className="text-lg font-bold">
                  {matching.proc || "No Procedure"}
                </div>
              </div>
              <div className="text-2xl font-bold text-muted-foreground">→</div>
              <div className="flex-1">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Form
                </div>
                <div className="text-lg font-bold">
                  {form_slug || "No Form"}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Field Mappings ({matching.connections.length})
              </div>
              <div className="space-y-2">
                {matching.connections.map((conn, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-md border bg-muted/30 p-3"
                  >
                    <div className="flex-1">
                      <div className="mb-0.5 text-xs text-muted-foreground">
                        Proc Field
                      </div>
                      <div className="font-mono text-sm font-semibold">
                        {conn.procField}
                      </div>
                    </div>
                    <div className="text-muted-foreground">→</div>
                    <div className="flex-1">
                      <div className="mb-0.5 text-xs text-muted-foreground">
                        Form Field
                      </div>
                      <div className="font-mono text-sm font-semibold">
                        {conn.customValue
                          ? `Custom: "${conn.customValue}"`
                          : conn.formField || "Not Mapped"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Connection?</DialogTitle>
                <DialogDescription>
                  This will permanently delete the connection between{" "}
                  <span className="font-semibold">
                    {matching.proc || "the procedure"}
                  </span>{" "}
                  and{" "}
                  <span className="font-semibold">
                    {form_slug || "the form"}
                  </span>
                  . This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete Connection
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Card>
  );
}
