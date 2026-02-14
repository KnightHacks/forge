import type { InferSelectModel } from "drizzle-orm";
import { useState } from "react";
import { Loader2, Trash } from "lucide-react";

import type { Judges as DBJudges } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

type Judge = InferSelectModel<typeof DBJudges>;

interface DeleteJudgeDialogProps {
  judge: Judge;
}

export const DeleteJudgeDialog: React.FC<DeleteJudgeDialogProps> = ({
  judge,
}) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const utils = api.useUtils();
  const deleteJudge = api.judge.deleteJudge.useMutation({
    onSuccess() {
      toast.success(`Judge ${judge.name} was successfully deleted!`);
      setOpen(false);
    },
    onError(opts) {
      toast.error(opts.message);
    },
    async onSettled() {
      await utils.judge.invalidate();
      setIsLoading(false);
    },
  });

  const handleSubmit = () => {
    setIsLoading(true);
    deleteJudge.mutate({
      id: judge.id,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="destructive">
          <Trash className="h-4 w-4 text-white" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Judge</DialogTitle>
        </DialogHeader>
        Are you sure you want to delete this judge?
        <DialogFooter className="mt-4 flex w-full flex-row justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <div className="flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Button variant="destructive" onClick={handleSubmit}>
                Delete
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
