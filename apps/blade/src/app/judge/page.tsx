import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, LayoutDashboard, Trophy } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

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
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-red-600">
              Error Loading Hackathon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              Unable to load the current hackathon. Please contact an
              administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-3xl">
            🏆 Judge Portal
          </CardTitle>
          <p className="text-center text-lg text-gray-600">
            Welcome to the judging interface for {currentHackathon.name}
          </p>
        </CardHeader>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="transition-shadow hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" />
              Judge Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-gray-600">
              View and judge projects assigned to you. Access your judging
              interface and submit scores.
            </p>
            <Link href="/judge/dashboard">
              <Button className="w-full">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              View Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-gray-600">
              View judging results, scores, and rankings. See how projects are
              performing.
            </p>
            <Link href="/judge/results">
              <Button variant="outline" className="w-full">
                View Results
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Hackathon Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Hackathon Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>
              <strong>Event:</strong> {currentHackathon.name}
            </p>
            <p>
              <strong>Status:</strong> Active
            </p>
            <p>
              <strong>Your Role:</strong> Judge
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
