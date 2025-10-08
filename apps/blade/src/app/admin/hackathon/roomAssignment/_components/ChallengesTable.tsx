"use client";

import { useMemo, useState } from "react";

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
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";
import { AddJudgeDialog } from "./AddJudgeDialogue";
import { JudgeItem } from "./JudgeItem"; // Adjust path as needed

const data = {
  judges: [
    {
      judgeId: "j1",
      judgeName: "Dr. Sarah Chen",
      roomName: "Room A",
      challengeId: "c1",
    },
    {
      judgeId: "j2",
      judgeName: "Michael Rodriguez",
      roomName: null,
      challengeId: "c2",
    },
    {
      judgeId: "j3",
      judgeName: "Emily Thompson",
      roomName: "Room A",
      challengeId: "c1",
    },
    {
      judgeId: "j4",
      judgeName: "James Park",
      roomName: "Room C",
      challengeId: "c3",
    },
    {
      judgeId: "j5",
      judgeName: "Lisa Anderson",
      roomName: null,
      challengeId: "c3",
    },
    {
      judgeId: "j6",
      judgeName: "Lisa Anderson 2",
      roomName: "Room D",
      challengeId: "c3",
    },
  ],
  challenges: [
    {
      challengeId: "c1",
      challengeTitle: "AI for Healthcare",
      challengeDescription:
        "Build an AI-powered solution to improve patient care and medical diagnostics",
      sponsorName: "MedTech Corp",
      hackathonId: "h1",
    },
    {
      challengeId: "c2",
      challengeTitle: "Sustainable Energy Dashboard",
      challengeDescription:
        "Create a real-time dashboard for monitoring and optimizing renewable energy usage",
      sponsorName: "GreenEnergy Solutions",
      hackathonId: "h1",
    },
    {
      challengeId: "c3",
      challengeTitle: "FinTech Security",
      challengeDescription:
        "Develop innovative security solutions for digital payment systems",
      sponsorName: "SecureBank Inc",
      hackathonId: "h1",
    },
    {
      challengeId: "c4",
      challengeTitle: "Education Accessibility",
      challengeDescription:
        "Design tools to make online education more accessible to students with disabilities",
      sponsorName: "EduTech Foundation",
      hackathonId: "h2",
    },
    {
      challengeId: "c5",
      challengeTitle: "Smart City IoT",
      challengeDescription:
        "Build IoT solutions for smart city infrastructure and urban planning",
      sponsorName: "UrbanTech Systems",
      hackathonId: "h2",
    },
  ],
  hackathons: [
    {
      hackathonId: "h1",
      hackathonName: "Spring Hack 2025",
    },
    {
      hackathonId: "h2",
      hackathonName: "Fall Innovation Challenge 2024",
    },
  ],
};

//export async function ChallengesTable(){
export function ChallengesTable() {
  //const hackathonId = await api.hackathon.getCurrentHackathon();
  const hackathonId = "h1";
  //if(!hackathonId) return <p> Hackathon Not Found </p>
  //
  const utils = api.useUtils();
  const challenges = data.challenges.filter(
    (a) => a.hackathonId == hackathonId,
  );
  const [judges, setJudges] = useState(data.judges);
  //const challenges = api.challenges.getChallenges(hackathonId);
  //const judges = api.admin.hackathon.getJudges();

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
                          <AddJudgeDialog
                            onAddJudge={async (judgeName, roomName) => {
                              setJudges((judges) => [
                                ...judges,
                                {
                                  judgeId: Math.random().toString(),
                                  judgeName: judgeName,
                                  roomName: roomName,
                                  challengeId: challenge.challengeId,
                                },
                              ]);
                              await new Promise((r) => setTimeout(r, 2000));
                              toast.success(`Added Judge ${judgeName}`);
                              // Handle adding the judge here
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          {challenge.judges.map((judge) => (
                            <JudgeItem
                              key={judge.judgeId}
                              judge={judge}
                              onSave={(judgeId, roomName) => {
                                const judgeName: string | undefined =
                                  judges.find(
                                    (j) => j.judgeId == judgeId,
                                  )?.judgeName;
                                setJudges((judges) =>
                                  [...judges].map((j) =>
                                    j.judgeId != judgeId
                                      ? j
                                      : { ...j, roomName: roomName },
                                  ),
                                );
                                toast.success(
                                  `Judge ${judgeName}'s room has been changed to ${roomName}`,
                                );
                              }}
                              onDelete={(judgeId) => {
                                const judgeName: string | undefined =
                                  judges.find(
                                    (j) => j.judgeId == judgeId,
                                  )?.judgeName;
                                setJudges((judges) =>
                                  [...judges].filter(
                                    (j) => j.judgeId != judgeId,
                                  ),
                                );
                                // Handle delete here
                                toast.success(`Deleted Judge ${judgeName}`);
                              }}
                            />
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
