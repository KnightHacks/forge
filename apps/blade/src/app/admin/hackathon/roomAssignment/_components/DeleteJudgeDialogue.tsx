import { useState } from "react";
import { Loader2, Trash } from "lucide-react";

import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";

interface Judge {
  judgeId: string;
  judgeName: string;
  roomName?: string | null;
}

interface DeleteJudgeDialogProps {
  onDelete: (judgeId: string) => void;
  judge: Judge;
}

export const DeleteJudgeDialog: React.FC<DeleteJudgeDialogProps> = ({
  onDelete,
  judge,
}) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = () => {
    setIsLoading(true);
    onDelete(judge.judgeId);
    setOpen(false);
    setIsLoading(false);
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
          {isLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Button variant="destructive" onClick={handleSubmit}>
              Delete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
