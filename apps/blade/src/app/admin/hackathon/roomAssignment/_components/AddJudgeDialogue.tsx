import { useState } from "react";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";

interface AddJudgeDialogProps {
  onAddJudge: (judgeName: string, roomName: string) => Promise<void>;
}

export const AddJudgeDialog: React.FC<AddJudgeDialogProps> = ({
  onAddJudge,
}) => {
  const [open, setOpen] = useState(false);
  const [judgeName, setJudgeName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (judgeName.trim()) {
      setIsLoading(true);
      await onAddJudge(judgeName, roomName);
      setJudgeName("");
      setRoomName("");
      setOpen(false);
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Add Judge
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Judge</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="judgeName">Judge Name *</Label>
            <Input
              id="judgeName"
              value={judgeName}
              onChange={(e) => setJudgeName(e.target.value)}
              placeholder="Enter judge name"
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  await handleSubmit();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roomName">Room (Optional)</Label>
            <Input
              id="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Assign room"
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  await handleSubmit();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
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
            <Button onClick={handleSubmit} disabled={!judgeName.trim()}>
              Add Judge
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
