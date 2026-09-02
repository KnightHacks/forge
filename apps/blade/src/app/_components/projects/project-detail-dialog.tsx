import { ExternalLink } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Badge } from "@forge/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { MarkdownContent } from "@forge/ui/markdown-content";

type JudgeProject = RouterOutputs["projects"]["listJudge"]["projects"][number];
type AdminProject = RouterOutputs["projects"]["listAdmin"]["projects"][number];
type Project = JudgeProject | AdminProject;

function isAdminProject(project: Project): project is AdminProject {
  return "universities" in project;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function ChallengeBadges({ project }: { project: Project }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {project.challenges.map((challenge) => (
        <Badge
          key={challenge.id}
          variant={challenge.label === "General" ? "outline" : "secondary"}
        >
          {challenge.label}
        </Badge>
      ))}
    </div>
  );
}

function MemberEmail({
  memberIndex,
  project,
}: {
  memberIndex: number;
  project: AdminProject;
}) {
  const email = project.members[memberIndex]?.email;
  return email ? (
    <a
      className="block break-all text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      href={`mailto:${email}`}
    >
      {email}
    </a>
  ) : null;
}

export function ProjectDetailDialog({
  onOpenChange,
  project,
  showPrivateDetails = false,
}: {
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  showPrivateDetails?: boolean;
}) {
  const adminProject =
    project && showPrivateDetails && isAdminProject(project) ? project : null;

  return (
    <Dialog open={project !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-4xl">
        {project ? (
          <>
            <DialogHeader className="pr-8 text-left">
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {project.participantCount} participant
                  {project.participantCount === 1 ? "" : "s"}
                </Badge>
                <Badge variant="outline">
                  Submitted {formatDate(project.submittedAt)}
                </Badge>
              </div>
              <DialogTitle className="text-2xl sm:text-3xl">
                {project.title}
              </DialogTitle>
              <DialogDescription>
                Imported project details and team members.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <section className="min-w-0 space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  About the project
                </h3>
                {project.description ? (
                  <MarkdownContent className="rounded-lg border border-border/70 bg-background/40 p-4 leading-7">
                    {project.description}
                  </MarkdownContent>
                ) : (
                  <p className="rounded-lg border border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
                    No description provided.
                  </p>
                )}
              </section>

              <aside className="min-w-0 space-y-5 rounded-lg border border-border/70 bg-background/30 p-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Links</h3>
                  <a
                    className="flex min-h-10 items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    href={project.submissionUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open on Devpost
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </a>
                  {project.videoUrl ? (
                    <a
                      className="block break-all text-sm text-primary underline-offset-4 hover:underline"
                      href={project.videoUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Video demo
                    </a>
                  ) : null}
                  {project.demoLinks.map((link, index) => (
                    <a
                      className="block break-all text-sm text-primary underline-offset-4 hover:underline"
                      href={link}
                      key={link}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Demo link {index + 1}
                    </a>
                  ))}
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Challenges</h3>
                  <ChallengeBadges project={project} />
                </div>
                {project.technologies.length ? (
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">Built with</h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {project.technologies.join(", ")}
                    </p>
                  </div>
                ) : null}
                {adminProject?.universities.length ? (
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">Schools</h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {adminProject.universities.join(", ")}
                    </p>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">
                    {adminProject ? "Team contacts" : "Team"}
                  </h3>
                  <ul className="space-y-3">
                    {project.members.map((member, index) => (
                      <li className="text-sm" key={`${member.name}-${index}`}>
                        <span className="block font-medium">{member.name}</span>
                        {adminProject ? (
                          <MemberEmail
                            memberIndex={index}
                            project={adminProject}
                          />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
