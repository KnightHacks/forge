import Link from "next/link";
import { notFound } from "next/navigation";

import { GUILD } from "@forge/consts";
// import { ExternalLink, Github, Linkedin, Search } from "lucide-react"; // Moved to client component
// Remove other imports only used by the card rendering if they are now fully in GuildMembersDisplay

import { Button } from "@forge/ui/button";

// import { Input } from "@forge/ui/input"; // Moved to Dock
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@forge/ui/select"; // Moved to Dock

import { api } from "~/trpc/server";
import Dock from "./_components/dock"; // Assuming Dock handles search/filter inputs
import { GuildMembersDisplay } from "./_components/guild-member-display";

const PAGE_SIZE_OPTIONS = [20, 40, 60, 80, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
const DEFAULT_PAGE_SIZE: PageSize = 20;

export default async function GuildPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string; ps?: string; tag?: string };
}) {
  const query = searchParams.q?.trim() ?? undefined;
  const pageSize: PageSize =
    PAGE_SIZE_OPTIONS.find((n) => String(n) === searchParams.ps) ??
    DEFAULT_PAGE_SIZE;
  const currentPage = Number(searchParams.page ?? 0);
  if (Number.isNaN(currentPage) || currentPage < 0) notFound();

  const selectedTag: GUILD.GuildTag | undefined =
    GUILD.GUILD_TAG_OPTIONS.find((t) => t === searchParams.tag) ?? undefined;

  const { members, total } = await api.guild.getGuildMembers({
    page: currentPage,
    pageSize,
    query,
    tags: selectedTag ? [selectedTag] : [],
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const buildHref = (page: number) => {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (pageSize !== DEFAULT_PAGE_SIZE) p.set("ps", String(pageSize));
    if (selectedTag) p.set("tag", selectedTag);
    if (page > 0) p.set("page", String(page));
    const queryString = p.toString();
    return `${queryString ? `?${queryString}` : "/"}`; // Corrected for root path
  };

  return (
    <div className="dark min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]" />
      <div className="max-w-8xl container relative mx-auto p-6 py-10 md:p-8 lg:py-12">
        <h1 className="mb-8 text-4xl font-bold tracking-tight text-slate-50">
          The Guild Collective
        </h1>

        <Dock
          initialQuery={query ?? ""}
          initialPageSize={pageSize}
          initialTag={selectedTag ?? "none"}
        />

        {/* Use the new Client Component for displaying members */}
        <GuildMembersDisplay members={members} />

        {totalPages > 1 && (
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3 sm:justify-between">
            <Button
              asChild
              variant="outline"
              disabled={currentPage === 0}
              className="hidden border-slate-700 bg-slate-800/50 hover:bg-slate-700/70 disabled:opacity-50 sm:inline-flex"
            >
              <Link href={buildHref(0)}>First</Link>
            </Button>

            <Button
              asChild
              variant="outline"
              disabled={currentPage === 0}
              className="border-slate-700 bg-slate-800/50 px-4 hover:bg-slate-700/70 disabled:opacity-50"
            >
              <Link href={buildHref(currentPage - 1)}>Prev</Link>
            </Button>

            <span className="px-2 text-sm text-slate-400">
              Page {currentPage + 1}/{totalPages}
            </span>

            <Button
              asChild
              variant="outline"
              disabled={currentPage + 1 >= totalPages}
              className="border-slate-700 bg-slate-800/50 px-4 hover:bg-slate-700/70 disabled:opacity-50"
            >
              <Link href={buildHref(currentPage + 1)}>Next</Link>
            </Button>

            <Button
              asChild
              variant="outline"
              disabled={currentPage + 1 >= totalPages}
              className="hidden border-slate-700 bg-slate-800/50 hover:bg-slate-700/70 disabled:opacity-50 sm:inline-flex"
            >
              <Link href={buildHref(totalPages - 1)}>Last</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
