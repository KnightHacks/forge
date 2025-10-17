import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, LayoutDashboard, Trophy, Users } from "lucide-react";

import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";

import { api } from "~/trpc/server";

export default async function Page() {
  const isJudge = await api.auth.getJudgeStatus();
  const isAdmin = await api.auth.getAdminStatus();

  if (!isJudge && !isAdmin) {
    redirect("/");
  }

  const currentHackathon = await api.hackathon.getCurrentHackathon();
  if (!currentHackathon) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">
              Error Loading Hackathon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive/80">
              Unable to load the current hackathon. Please contact an
              administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="space-y-2 text-center">
        <div className="flex items-center justify-center gap-3">
          <Trophy className="h-8 w-8 text-purple-400" />
          <h1 className="text-center text-4xl font-bold tracking-tight">
            Judge Portal
          </h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Judging{" "}
          <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text font-semibold text-transparent">
            {currentHackathon.name}
          </span>
        </p>
      </div>

      {/* Primary Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Link href="/judge/dashboard">
          <Card className="h-full cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5" />
                Judge Dashboard
              </CardTitle>
              <CardDescription>View and evaluate projects</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-sm text-muted-foreground">
                Access your judging interface and submit scores for all assigned
                projects.
              </p>
              <Button className="w-full">
                Open Dashboard
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/judge/results">
          <Card className="h-full cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                View Results
              </CardTitle>
              <CardDescription>
                Explore judging results and rankings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-sm text-muted-foreground">
                Track project scores and see how projects are performing in
                real-time.
              </p>
              <Button variant="outline" className="w-full">
                View Leaderboard
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Hackathon Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Event</p>
              <p className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-base font-semibold text-transparent">
                {currentHackathon.name}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Your Role
              </p>
              <Badge>{isJudge ? "Sponsor Judge" : "Knighthacks Judge"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
