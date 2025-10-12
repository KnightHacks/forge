import { useState } from "react";
import { AlertCircle } from "lucide-react";

import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { Label } from "@forge/ui/label";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

export default function AlertButton() {
  const [open, setOpen] = useState(false);
  const [issue, setIssue] = useState("");

  const reportIssueMutation =
    api.eventFeedback.logHackathonFeedback.useMutation({
      onSuccess: () => {
        setOpen(false);
        setIssue("");
        toast.success("Issue reported successfully!");
      },
      onError: (error) => {
        const errorMessage =
          error instanceof Error ? error.message : "An error occurred";
        toast.error(`Error: ${errorMessage}`);
      },
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (issue.trim()) {
      reportIssueMutation.mutate({ description: issue });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="group flex w-full items-center gap-3 rounded-lg border bg-card px-5 py-3 text-base font-semibold shadow-sm transition-all hover:scale-[1.02] hover:border-primary/50 hover:shadow-md sm:w-auto sm:px-5 sm:py-3 sm:text-sm">
          <AlertCircle className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
          <span>Report an Issue</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Report an Issue</DialogTitle>
            <DialogDescription>
              Describe the issue you're experiencing. We'll look into it as soon
              as possible.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="issue">Issue Description</Label>
              <Textarea
                id="issue"
                placeholder="Please describe the issue in detail..."
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                className="min-h-[120px]"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!issue.trim() || reportIssueMutation.isPending}
            >
              {reportIssueMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
