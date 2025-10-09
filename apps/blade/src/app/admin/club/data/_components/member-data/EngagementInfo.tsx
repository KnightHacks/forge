"use client";

import { Star } from "lucide-react";

import type { InsertMember, ReturnEvent } from "@forge/db/schemas/knight-hacks";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

interface ReturnMemberAttendance {
  memberId: string;
  firstName: string;
  lastName: string;
  points: number | null;
  eventsAttended: number;
}

// Helper function to calculate quartiles, percentiles, and mode
function calculateStats(values: number[]) {
  if (values.length === 0)
    return { q25: 0, median: 0, q75: 0, q95: 0, mean: 0, mode: 0 };

  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

  const q25Index = Math.floor(sorted.length * 0.25);
  const medianIndex = Math.floor(sorted.length * 0.5);
  const q75Index = Math.floor(sorted.length * 0.75);
  const q95Index = Math.floor(sorted.length * 0.95);

  // Calculate mode (most frequent value)
  const frequency: Record<number, number> = {};
  values.forEach((value) => {
    frequency[value] = (frequency[value] ?? 0) + 1;
  });

  let mode = 0;
  let maxFreq = 0;
  Object.entries(frequency).forEach(([value, freq]) => {
    if (freq > maxFreq) {
      maxFreq = freq;
      mode = Number(value);
    }
  });

  return {
    q25: sorted[q25Index] ?? 0,
    median: sorted[medianIndex] ?? 0,
    q75: sorted[q75Index] ?? 0,
    q95: sorted[q95Index] ?? 0,
    mean: mean,
    mode: mode,
  };
}

export default function EngagementInfo({
  members,
  numDuesPaying,
  memberAttendance,
}: {
  members: InsertMember[];
  events: ReturnEvent[];
  numDuesPaying: number;
  memberAttendance: ReturnMemberAttendance[];
}) {
  const percentDuesPaying = (numDuesPaying / members.length) * 100;

  // Calculate detailed statistics for points - use real points data from memberAttendance
  const pointsValues = memberAttendance.map((member) => member.points ?? 0);
  const nonZeroPoints = pointsValues.filter((points) => points > 0);
  const zeroPointsCount = pointsValues.length - nonZeroPoints.length;
  const pointsStats = calculateStats(nonZeroPoints);

  // Calculate detailed statistics for events attended per member - use real attendance data
  const eventsPerMember = memberAttendance.map(
    (member) => member.eventsAttended,
  );
  const nonZeroEvents = eventsPerMember.filter((count) => count > 0);
  const zeroEventCount = eventsPerMember.length - nonZeroEvents.length;
  const eventsStats = calculateStats(nonZeroEvents);

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
            <span className="text-muted-foreground">
              paid dues ({numDuesPaying} members).
            </span>
          </p>
          <p>
            <span className="text-xl font-bold text-red-600">
              {(100 - percentDuesPaying).toFixed(2)}%{" "}
            </span>
            <span className="text-muted-foreground">
              haven't paid dues ({members.length - numDuesPaying} members).
            </span>
          </p>
        </div>

        {/* Events Statistics */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-muted-foreground">
              EVENT ATTENDANCE (&gt; 0)
            </h4>
            <span className="text-xs text-muted-foreground">
              {zeroEventCount} members with 0 events
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="text-2xl font-bold text-blue-600">
                {eventsStats.mean.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">Mean</div>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="text-2xl font-bold text-green-600">
                {eventsStats.median}
              </div>
              <div className="text-xs text-muted-foreground">Median</div>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="text-2xl font-bold text-indigo-600">
                {eventsStats.mode}
              </div>
              <div className="text-xs text-muted-foreground">Mode</div>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="text-2xl font-bold text-orange-600">
                {eventsStats.q25}
              </div>
              <div className="text-xs text-muted-foreground">Q25</div>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="text-2xl font-bold text-purple-600">
                {eventsStats.q75}
              </div>
              <div className="text-xs text-muted-foreground">Q75</div>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="text-2xl font-bold text-red-600">
                {eventsStats.q95}
              </div>
              <div className="text-xs text-muted-foreground">Q95</div>
            </div>
          </div>
        </div>

        {/* Points Statistics */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="flex items-center gap-1 text-sm font-semibold text-muted-foreground">
              MEMBER POINTS (&gt; 0)
              <Star className="h-4 w-4 text-yellow-500" />
            </h4>
            <span className="text-xs text-muted-foreground">
              {zeroPointsCount} members with 0 points
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="text-2xl font-bold text-blue-600">
                {pointsStats.mean.toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">Mean</div>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="text-2xl font-bold text-green-600">
                {pointsStats.median}
              </div>
              <div className="text-xs text-muted-foreground">Median</div>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="text-2xl font-bold text-indigo-600">
                {pointsStats.mode}
              </div>
              <div className="text-xs text-muted-foreground">Mode</div>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="text-2xl font-bold text-orange-600">
                {pointsStats.q25}
              </div>
              <div className="text-xs text-muted-foreground">Q25</div>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="text-2xl font-bold text-purple-600">
                {pointsStats.q75}
              </div>
              <div className="text-xs text-muted-foreground">Q75</div>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="text-2xl font-bold text-red-600">
                {pointsStats.q95}
              </div>
              <div className="text-xs text-muted-foreground">Q95</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
