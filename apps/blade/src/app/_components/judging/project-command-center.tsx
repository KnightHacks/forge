"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClipboardList } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";

import type { ProjectDirectoryInput } from "../projects/project-directory";
import { AdminProjectWorkspace } from "../projects/admin-project-workspace";
import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "../shared/admin-page";
import { EvaluationAuditPanel } from "./evaluation-audit-panel";
import { JudgingConfigurationPanel } from "./judging-configuration-panel";
import { JudgingControlPanel } from "./judging-control-panel";

type AdminData = RouterOutputs["projects"]["listAdmin"];
type ControlData = RouterOutputs["judging"]["listAdmin"];
type Hackathons = RouterOutputs["projects"]["listAdminHackathons"];
type Evaluations = RouterOutputs["judging"]["listEvaluationAudit"];

export function ProjectCommandCenter({
  controlData,
  evaluations,
  hackathons,
  projectData,
  projectInput,
  selectedTab,
}: {
  controlData: ControlData;
  evaluations: Evaluations;
  hackathons: Hackathons;
  projectData: AdminData;
  projectInput: ProjectDirectoryInput & {
    deleted: "active" | "all" | "deleted";
    hackathonId: string;
  };
  selectedTab: "evaluations" | "projects" | "rooms" | "setup";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function selectTab(tab: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (tab === "setup") next.delete("tab");
    else next.set("tab", tab);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  }

  function selectHackathon(hackathonId: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("hackathon", hackathonId);
    next.delete("challenge");
    next.delete("page");
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  }

  return (
    <main className={adminPageLayoutClassName} aria-busy={pending}>
      <AdminPageHeader
        actions={
          <label className="space-y-1">
            <span className="block text-xs font-medium text-muted-foreground">
              Hackathon
            </span>
            <select
              aria-label="Manage judging for hackathon"
              className="h-11 max-w-full rounded-md border border-input bg-background px-3 text-sm sm:min-w-72"
              onChange={(event) => selectHackathon(event.target.value)}
              value={controlData.hackathon.id}
            >
              {hackathons.map((hackathon) => (
                <option key={hackathon.id} value={hackathon.id}>
                  {hackathon.displayName}
                </option>
              ))}
            </select>
          </label>
        }
        description="Configure the rubric, manage the Devpost inventory, provision rooms, and control what judges can see."
        eyebrow="Officer tools"
        icon={ClipboardList}
        title="Project command center"
      />
      <Tabs onValueChange={selectTab} value={selectedTab}>
        <TabsList className="grid h-11 w-full grid-cols-4 sm:w-fit sm:min-w-[34rem]">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
          <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
        </TabsList>
        <TabsContent className="mt-4" value="setup">
          <JudgingConfigurationPanel
            data={controlData}
            key={controlData.hackathon.id}
          />
        </TabsContent>
        <TabsContent className="mt-4" value="projects">
          <AdminProjectWorkspace
            data={projectData}
            embedded
            hackathons={hackathons}
            input={projectInput}
          />
        </TabsContent>
        <TabsContent className="mt-4" value="rooms">
          <JudgingControlPanel
            embedded
            hackathons={hackathons}
            initialData={controlData}
          />
        </TabsContent>
        <TabsContent className="mt-4" value="evaluations">
          <EvaluationAuditPanel
            evaluations={evaluations}
            timeZone={controlData.hackathon.timezone}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
