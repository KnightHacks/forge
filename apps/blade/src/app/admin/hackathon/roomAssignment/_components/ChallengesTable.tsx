"use client";

import { Loader2 } from "lucide-react";

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

import { api } from "~/trpc/react";
import { AddJudgeDialog } from "./AddJudgeDialogue";
import { JudgeItem } from "./JudgeItem"; // Adjust path as needed

interface ChallengesProps {
  hackathonId: string;
}

export function ChallengesTable({ hackathonId }: ChallengesProps) {
  const { data: challenges, isLoading: isLoadingChallenges } =
    api.challenge.getChallenges.useQuery({
      hackathonId: hackathonId,
    });
  const { data: judges, isLoading: isLoadingJudges } =
    api.judge.getJudges.useQuery();

  if (isLoadingChallenges || isLoadingJudges) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!challenges) return <p> No Challenges </p>;

  const challengesExpanded = challenges.map((challenge) => {
    const filteredJudges = judges?.filter((j) => j.challengeId == challenge.id);
    const filteredRooms = Array.from(
      new Set(filteredJudges?.filter((j) => j.roomName).map((j) => j.roomName)),
    );
    const extendedChallenge = {
      ...challenge,
      judges: filteredJudges ?? [],
      rooms: filteredRooms,
    };
    return extendedChallenge;
  });

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
                <Dialog key={challenge.id}>
                  <DialogTrigger asChild>
                    <TableRow>
                      <TableCell className="text-center font-medium">
                        {challenge.id.slice(0, 3) + "..."}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {challenge.title}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {challenge.sponsor}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {challenge.rooms.length != 1
                          ? challenge.rooms.length + " rooms"
                          : challenge.rooms[0]}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {challenge.judges.length > 1
                          ? challenge.judges.length + " judges"
                          : challenge.judges[0]?.name}
                      </TableCell>
                    </TableRow>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl">
                        {challenge.title}
                      </DialogTitle>
                      <DialogDescription className="pt-2">
                        {challenge.description}
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
                            <JudgeItem key={judge.id} judge={judge} />
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
