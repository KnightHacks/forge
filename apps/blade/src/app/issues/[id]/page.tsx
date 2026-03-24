import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@forge/auth";

import { SIGN_IN_PATH } from "~/consts";
import { api } from "~/trpc/server";

interface IssuePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function IssuePage({ params }: IssuePageProps) {
  const session = await auth();
  if (!session) redirect(SIGN_IN_PATH);
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  let issue;
  try {
    issue = await api.issues.getIssue({ id });
  } catch {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6 pb-16 lg:pt-40">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Issue</p>
        <h1 className="text-3xl font-bold tracking-tight">{issue.name}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold">Status</h2>
          <p className="mt-2 text-muted-foreground">{issue.status}</p>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="font-semibold">Due Date</h2>
          <p className="mt-2 text-muted-foreground">
            {issue.date
              ? new Date(issue.date).toLocaleDateString()
              : "No due date"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="font-semibold">Owning Team</h2>
        <p className="mt-2 text-muted-foreground">{issue.team.name}</p>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="font-semibold">Description</h2>
        <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
          {issue.description}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold">Assignees</h2>
          <div className="mt-2 text-muted-foreground">
            {issue.userAssignments.length > 0 ? (
              <ul className="space-y-1">
                {issue.userAssignments.map((assignment) => (
                  <li key={assignment.userId}>
                    {assignment.user.name ?? assignment.user.discordUserId}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Unassigned</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="font-semibold">Visible Teams</h2>
          <div className="mt-2 text-muted-foreground">
            {issue.teamVisibility.length > 0 ? (
              <ul className="space-y-1">
                {issue.teamVisibility.map((visibility) => (
                  <li key={visibility.teamId}>{visibility.team.name}</li>
                ))}
              </ul>
            ) : (
              <p>No team visibility rules</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="font-semibold">Links</h2>
        <div className="mt-2 text-muted-foreground">
          {issue.links && issue.links.length > 0 ? (
            <ul className="space-y-1">
              {issue.links.map((link) => (
                <li key={link}>
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p>No links</p>
          )}
        </div>
      </div>
    </div>
  );
}
