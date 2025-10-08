import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";

import { DeleteJudgeDialog } from "./DeleteJudgeDialogue";

interface Judge {
  judgeId: string;
  judgeName: string;
  roomName?: string | null;
}

interface JudgeItemProps {
  judge: Judge;
  onSave: (judgeId: string, roomName: string) => void;
  onDelete: (judgeId: string) => void;
}

export const JudgeItem: React.FC<JudgeItemProps> = ({
  judge,
  onSave,
  onDelete,
}) => {
  const [editedRoom, setEditedRoom] = useState(judge.roomName || "");
  const hasChanged = editedRoom !== (judge.roomName || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = () => {
    setIsLoading(true);
    onSave(judge.judgeId, editedRoom);
    setIsLoading(false);
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50">
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-medium">{judge.judgeName}</p>
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
      <DeleteJudgeDialog onDelete={onDelete} judge={judge} />
    </div>
  );
};
