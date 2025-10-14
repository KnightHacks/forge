import { useMemo } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { Label } from "@forge/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";

import { api } from "~/trpc/server";
import { AddJudgeDialog } from "./AddJudgeDialogue";
import { JudgeItem } from "./JudgeItem"; // Adjust path as needed

//export async function ChallengesTable(){
export async function ChallengesTable() {
  const hackathonId = await api.hackathon.getCurrentHackathon();
  if (!hackathonId) return <p> Hackathon Not Found </p>;

  const challenges = await api.challenges.list();
  const judges = await api.judge.list();

  const challengesExpanded = useMemo(
    () =>
      challenges.map((challenge) => {
        const filteredJudges = judges.filter(
          (j) => j.challengeId == challenge.challengeId,
        );
        const filteredRooms = Array.from(
          new Set(
            filteredJudges.filter((j) => j.roomName).map((j) => j.roomName),
          ),
        );
        const extendedChallenge = {
          ...challenge,
          judges: filteredJudges,
          rooms: filteredRooms,
        };
        return extendedChallenge;
      }),
    [challenges, judges],
  );

  return (
    <>
      <h2 className="w-full py-14 text-center text-6xl font-bold">
        Challenges
      </h2>
      <div className="flex w-full justify-center align-middle">
        <div className="w-4/5">
          <Table className="w-full px-10">
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">
                  <Label>Challenge ID</Label>
                </TableHead>
                <TableHead className="text-center">
                  <Label>Challenge Title</Label>
                </TableHead>
                <TableHead className="text-center">
                  <Label>Sponsor Name</Label>
                </TableHead>
                <TableHead className="text-center">
                  <Label>Room Name</Label>
                </TableHead>
                <TableHead className="text-center">
                  <Label>Judges</Label>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challengesExpanded.map((challenge) => (
                <Dialog key={challenge.challengeId}>
                  <DialogTrigger asChild>
                    <TableRow>
                      <TableCell className="text-center font-medium">
                        {challenge.challengeId.slice(0, 3) + "..."}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {challenge.challengeTitle}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {challenge.sponsorName}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {challenge.rooms.length != 1
                          ? challenge.rooms.length + " rooms"
                          : challenge.rooms[0]}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {challenge.judges.length > 1
                          ? challenge.judges.length + " judges"
                          : challenge.judges[0]?.judgeName}
                      </TableCell>
                    </TableRow>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl">
                        {challenge.challengeTitle}
                      </DialogTitle>
                      <DialogDescription className="pt-2">
                        {challenge.challengeDescription}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">Rooms</Label>
                        <p className="pl-1 text-sm text-muted-foreground">
                          {challenge.rooms.join(", ")}
                        </p>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-semibold">
                            Judges
                          </Label>
                          <AddJudgeDialog challenge={challenge} />
                        </div>
                        <div className="space-y-2">
                          {challenge.judges.map((judge) => (
                            <JudgeItem key={judge.judgeId} judge={judge} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
