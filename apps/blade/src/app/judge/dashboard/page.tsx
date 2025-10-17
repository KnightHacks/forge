import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

import { api } from "~/trpc/server";
import { ProjectsTable } from "../_components/projects-table";

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
          <CardTitle className="text-center text-2xl">
            🏆 Judge Dashboard
          </CardTitle>
          <p className="text-center text-gray-600">
            Welcome to the judging interface for {currentHackathon.name}
          </p>
        </CardHeader>
      </Card>

      {/* Projects Table */}
      <ProjectsTable hackathonId={currentHackathon.id} />
    </div>
  );
}
