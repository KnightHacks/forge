"use client";

import { useOptimistic, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ClipboardList } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";

import type { ProjectDirectoryInput } from "../projects/project-directory";
import { useNavigationRouter as useRouter } from "~/app/_components/shared/route-transition-link";
import { AdminProjectWorkspace } from "../projects/admin-project-workspace";
import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "../shared/admin-page";
import { EvaluationAuditPanel } from "./evaluation-audit-panel";
import {
  JudgingConfigurationPanel,
  JudgingLaunchControls,
} from "./judging-configuration-panel";
import { JudgingControlPanel } from "./judging-control-panel";
import { JudgingLaunchChecklist } from "./judging-launch-checklist";
import {
  DropEvaluationsButton,
  JudgingResetPanel,
} from "./judging-reset-panel";
import { JudgingSchedulePanel } from "./judging-schedule-panel";
import { ProjectClaimsPanel } from "./project-claims-panel";

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
  scheduleData,
}: {
  controlData: ControlData;
  evaluations: Evaluations;
  hackathons: Hackathons;
  projectData: AdminData;
  projectInput: ProjectDirectoryInput & {
    deleted: "active" | "all" | "deleted";
    hackathonId: string;
  };
  selectedTab:
    | "evaluations"
    | "launch"
    | "projects"
    | "reset"
    | "rooms"
    | "setup"
    | "schedule";
  scheduleData: RouterOutputs["judging"]["listScheduleAdmin"] | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useOptimistic<string>(selectedTab);

  function selectTab(tab: string, section?: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (tab === "projects") next.delete("tab");
    else next.set("tab", tab);
    startTransition(() => {
      setActiveTab(tab);
      router.replace(
        `${pathname}?${next.toString()}${section ? `#${section}` : ""}`,
        { scroll: section !== undefined },
      );
    });
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
          <div className="flex min-w-0 flex-wrap items-end gap-2">
            <JudgingLaunchChecklist data={controlData} onNavigate={selectTab} />
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
          </div>
        }
        description="Configure the rubric, manage the Devpost inventory, provision rooms, and control what judges can see."
        eyebrow="Officer tools"
        icon={ClipboardList}
        title="Project command center"
      />
      <Tabs onValueChange={(tab) => selectTab(tab)} value={activeTab}>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Setup flow
          </p>
          <TabsList className="flex h-auto min-h-11 w-full flex-wrap justify-start gap-1 sm:w-fit">
            <TabsTrigger value="projects">1 · Projects</TabsTrigger>
            <TabsTrigger value="setup">2 · Rubric</TabsTrigger>
            <TabsTrigger value="rooms">3 · Rooms</TabsTrigger>
            <TabsTrigger value="schedule">4 · Schedule</TabsTrigger>
            <TabsTrigger value="launch">5 · Launch</TabsTrigger>
            <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
            <TabsTrigger
              className="text-destructive data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground"
              value="reset"
            >
              Reset
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent className="mt-4" value="setup">
          <JudgingConfigurationPanel
            data={controlData}
            key={controlData.hackathon.id}
          />
        </TabsContent>
        <TabsContent className="mt-4" value="projects">
          <div id="project-inventory">
            <AdminProjectWorkspace
              data={projectData}
              embedded
              hackathons={hackathons}
              input={projectInput}
            />
          </div>
        </TabsContent>
        <TabsContent className="mt-4" value="rooms">
          <div id="judging-rooms">
            <JudgingControlPanel
              embedded
              hackathons={hackathons}
              initialData={controlData}
            />
          </div>
        </TabsContent>
        <TabsContent className="mt-4" value="launch">
          <div className="space-y-4">
            <JudgingLaunchControls data={controlData} />
            <div id="hacker-access">
              <ProjectClaimsPanel
                key={controlData.hackathon.id}
                hackathonId={controlData.hackathon.id}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent className="mt-4" value="evaluations">
          <div className="mb-4 flex justify-end">
            <DropEvaluationsButton
              data={controlData}
              onDropped={() => router.refresh()}
            />
          </div>
          <EvaluationAuditPanel
            evaluations={evaluations}
            timeZone={controlData.hackathon.timezone}
          />
        </TabsContent>
        <TabsContent className="mt-4" value="schedule">
          <div id="schedule-workspace">
            {scheduleData ? (
              <JudgingSchedulePanel
                key={controlData.hackathon.id}
                initialData={scheduleData}
                hackathonId={controlData.hackathon.id}
                timeZone={controlData.hackathon.timezone}
              />
            ) : null}
          </div>
        </TabsContent>
        <TabsContent className="mt-4" value="reset">
          <JudgingResetPanel data={controlData} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
