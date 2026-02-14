import { redirect } from "next/navigation";
import { AlertTriangle, Trophy } from "lucide-react";

import { Alert, AlertDescription } from "@forge/ui/alert";
import { Badge } from "@forge/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
import { Separator } from "@forge/ui/separator";

import { api } from "~/trpc/server";
import { ProjectsTable } from "~/app/_components/judge/projects-table";

export default async function Page() {
  const isJudge = await api.auth.getJudgeStatus();
  const isAdmin = await api.auth.getAdminStatus();

  if (!isJudge && !isAdmin) {
    redirect("/");
  }
  const currentHackathon = await api.hackathon.getCurrentHackathon();
  if (!currentHackathon) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex flex-col gap-2">
              <span className="font-semibold">Error Loading Hackathon</span>
              <span>
                Unable to load the current hackathon. Please contact an
                administrator.
              </span>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:space-y-6 sm:p-6">
      {/* Welcome Header */}
      <Card>
        <CardHeader>
          <div className="mb-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
                <Trophy className="h-6 w-6 text-purple-400 sm:h-7 sm:w-7" />{" "}
                Judge Dashboard
              </CardTitle>
              <CardDescription className="mt-2 text-sm sm:text-base">
                Welcome to the judging interface
              </CardDescription>
            </div>
            <div className="text-left sm:text-right">
              <Badge variant="outline" className="text-white">
                {isAdmin ? "Admin" : "Judge"}
              </Badge>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:gap-4">
            <div>
              <p className="font-medium text-gray-300">Hackathon</p>
              <p className="text-white-300 font-semibold text-purple-400">
                {currentHackathon.displayName}
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-300">Theme</p>
              <p className="font-semibold text-purple-400">
                {currentHackathon.theme}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Projects</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Review and evaluate all submitted projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectsTable hackathonId={currentHackathon.id} />
        </CardContent>
      </Card>
    </div>
  );
}
