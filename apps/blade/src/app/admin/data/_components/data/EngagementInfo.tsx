"use client";

import { Star } from "lucide-react";

import type { InsertMember, ReturnEvent } from "@forge/db/schemas/knight-hacks";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

export default function EngagementInfo({
  members,
  events,
  numDuesPaying,
}: {
  members: InsertMember[];
  events: ReturnEvent[];
  numDuesPaying: number;
}) {
  const percentDuesPaying = (numDuesPaying / members.length) * 100;
  const attendances = events.reduce((sum, event) => sum + event.numAttended, 0);
  const avgPoints =
    members.length > 0
      ? (
          members.reduce(
            (sum, member) => sum + (member.points ? member.points : 0),
            0,
          ) / members.length
        ).toFixed(2)
      : 0;

  return (
    <Card className="md:col-span-2 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-xl">Club Engagement</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 md:flex-row md:gap-6 lg:flex-row lg:gap-6">
          <p>
            <span className="text-xl font-bold text-green-600">
              {percentDuesPaying.toFixed(2)}%{" "}
            </span>
            <span className="text-muted-foreground">paid dues.</span>
          </p>
          <p>
            <span className="text-xl font-bold text-red-600">
              {(100 - percentDuesPaying).toFixed(2)}%{" "}
            </span>
            <span className="text-muted-foreground">haven't paid dues.</span>
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:gap-6 lg:flex-row lg:gap-6">
          <p>
            Average events attended:
            <span className="font-bold">
              {" "}
              {events.length > 0
                ? (attendances / members.length).toFixed(2)
                : 0}
            </span>
          </p>
          <p>
            Average points: <span className="font-bold">{avgPoints}</span>
            <Star className="relative bottom-0.5 ms-1 inline-block h-5 w-5 text-yellow-500" />
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
