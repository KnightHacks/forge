"use client";

import type { InferSelectModel } from "drizzle-orm";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import type { Judges as DBJudges } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";
import { DeleteJudgeDialog } from "./DeleteJudgeDialogue";

type Judge = InferSelectModel<typeof DBJudges>;

interface JudgeItemProps {
  judge: Judge;
}

export const JudgeItem: React.FC<JudgeItemProps> = ({ judge }) => {
  const [editedRoom, setEditedRoom] = useState(judge.roomName || "");
  const hasChanged = editedRoom !== (judge.roomName || "");
  const [isLoading, setIsLoading] = useState(false);

  const utils = api.useUtils();
  const updateJudge = api.judge.updateJudge.useMutation({
    onSuccess() {
      toast.success(
        `${judge.name}'s room was successfully updated to ${editedRoom}`,
      );
    },
    onError(opts) {
      toast.error(opts.message);
    },
    async onSettled() {
      await utils.judge.invalidate();
      setIsLoading(false);
    },
  });

  const handleSave = () => {
    setIsLoading(true);
    updateJudge.mutate({
      id: judge.id,
      roomName: editedRoom,
    });
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50">
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-medium">{judge.name}</p>
        <div className="flex items-center gap-2">
          <Label className="text-muted-forgeground whitespace-nowrap text-xs">
            Room:
          </Label>
          <Input
            type="text"
            value={editedRoom}
            onChange={(e) => setEditedRoom(e.target.value)}
            placeholder="Assign room"
            className="h-8 flex-1 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSave();
              }
            }}
          />
          {hasChanged &&
            (isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Button size="sm" onClick={handleSave} className="h-8 px-3">
                Save
              </Button>
            ))}
        </div>
      </div>
      <DeleteJudgeDialog judge={judge} />
    </div>
  );
};
