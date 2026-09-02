"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FolderKanban } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Badge } from "@forge/ui/badge";

import type { ProjectDirectoryInput } from "./project-directory";
import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import { ProjectDirectory } from "./project-directory";

type JudgeData = RouterOutputs["projects"]["listJudge"];
type Hackathons = RouterOutputs["projects"]["listAdminHackathons"];

export function JudgeProjectWorkspace({
  data,
  hackathons,
  input,
  isOfficer,
}: {
  data: JudgeData;
  hackathons: Hackathons;
  input: ProjectDirectoryInput & { hackathonId?: string };
  isOfficer: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function selectHackathon(hackathonId: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (hackathonId) next.set("hackathon", hackathonId);
    else next.delete("hackathon");
    next.delete("page");
    next.delete("challenge");
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  }

  return (
    <main className={adminPageLayoutClassName} aria-busy={pending}>
      <AdminPageHeader
        actions={
          isOfficer && hackathons.length ? (
            <label>
              <span className="sr-only">Preview hackathon</span>
              <select
                aria-label="Preview hackathon"
                className="h-11 max-w-full rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) => selectHackathon(event.target.value)}
                value={input.hackathonId ?? data.hackathon?.id ?? ""}
              >
                <option value="">Select a hackathon</option>
                {hackathons.map((hackathon) => (
                  <option key={hackathon.id} value={hackathon.id}>
                    {hackathon.displayName}
                  </option>
                ))}
              </select>
            </label>
          ) : null
        }
        description="Browse every submitted project, filter the field, and open a project to review its story and team."
        eyebrow="Judge workspace"
        icon={FolderKanban}
        title={data.hackathon?.displayName ?? "Hackathon projects"}
      />

      {data.hackathon ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {data.totalCount} imported project
              {data.totalCount === 1 ? "" : "s"}
            </Badge>
            {isOfficer ? (
              <Badge variant="outline">Officer preview</Badge>
            ) : null}
          </div>
          <ProjectDirectory
            data={data}
            emptyDescription="No imported projects match this view yet."
            input={input}
            showViewAction
          />
        </>
      ) : (
        <section className="rounded-lg border border-dashed border-white/15 bg-card/75 px-5 py-16 text-center shadow-xl shadow-black/10">
          <h2 className="text-xl font-semibold">No active hackathon</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            The project directory becomes available to judges when a hackathon
            reaches its configured start time.
          </p>
        </section>
      )}
    </main>
  );
}
