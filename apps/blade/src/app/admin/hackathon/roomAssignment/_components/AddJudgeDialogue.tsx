import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import type { InferSelectModel } from "drizzle-orm";
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
import { Label } from "@forge/ui/label"
import { Challenges as DBChallenge } from "@forge/db/schemas/knight-hacks";bel";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

type Challenge = InferSelectModel<typeof DBChallenge>;

interface AddJudgeProps {
  challenge: Challenge
}

export const AddJudgeDialog: React.FC<AddJudgeProps> = ({
  challenge
}) => {
  const [open, setOpen] = useState(false);
  const [judgeName, setJudgeName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const createJudge = api.judge.create.useMutation({
    onSuccess() {
      toast.success(`Successfully added Judge ${judgeName}`);
      setOpen(false);
      setIsLoading(false);
    },
    onError(opts) {
      toast.error(opts.message);
    },
    onSettled() {
      setIsLoading(false);
    },
  });

  const handleSubmit = async () => {
    if (judgeName.trim()) {
      setIsLoading(true);
      setJudgeName("");
      setRoomName("");
      createJudge.mutate({
        name: judgeName,
        roomName: roomName,
        challengeId: challenge.id
      })
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
      <DialogContent className="">
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
        <DialogFooter className="flex w-full flex-row justify-end space-x-2">
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
