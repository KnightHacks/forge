import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Github, GlobeIcon, Linkedin } from "lucide-react";

import type { GuildTag } from "@forge/consts/knight-hacks";
import { GUILD_TAG_OPTIONS } from "@forge/consts/knight-hacks";
import { Button } from "@forge/ui/button";

import { api } from "~/trpc/server";
import Dock from "./_components/dock";
import { ResumeButton } from "./_components/resume-button";

const PAGE_SIZE_OPTIONS = [20, 40, 60, 80, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
const DEFAULT_PAGE_SIZE: PageSize = 20;

const CARD_ACCENT_GRADIENT =
  "before:from-violet-600/20 before:to-indigo-600/20";

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

  const selectedTag: GuildTag | undefined =
    GUILD_TAG_OPTIONS.find((t) => t === searchParams.tag) ?? undefined;

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
    return `?${p.toString()}`;
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

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {members.map((m) => (
            <div
              key={m.id}
              className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg ring-1 ring-slate-700/50 backdrop-blur-md transition-all before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-br hover:-translate-y-1 hover:shadow-violet-500/20 hover:before:opacity-70 ${CARD_ACCENT_GRADIENT}`}
            >
              <div className="p-5">
                <div className="flex items-center gap-4">
                  <Image
                    src={m.profilePictureUrl ?? "/placeholder-avatar.png"}
                    alt={`${m.firstName} ${m.lastName}`}
                    width={80}
                    height={80}
                    className="h-20 w-20 flex-shrink-0 rounded-full object-cover ring-2 ring-slate-700"
                  />
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-semibold text-slate-100">
                      {m.firstName} {m.lastName}
                    </h2>
                    {m.tagline && (
                      <p className="truncate text-sm text-slate-400">
                        {m.tagline}
                      </p>
                    )}
                  </div>
                </div>

                {(m.gradDate || m.about) && (
                  <div className="mt-4 space-y-1 border-t border-slate-800 pt-4 text-sm">
                    <p className="font-medium text-slate-400">{m.school}</p>
                    {m.gradDate && (
                      <p className="text-slate-400">
                        Graduates:&nbsp;
                        {new Date(m.gradDate).toLocaleDateString(undefined, {
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}
                    {m.about && (
                      <p className="mt-2 line-clamp-3 text-slate-400/80">
                        {m.about}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-5 flex flex-nowrap items-center gap-3 border-t border-slate-800 pt-4">
                  {m.githubProfileUrl && (
                    <Link
                      href={m.githubProfileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 transition hover:text-violet-400"
                    >
                      <Github size={20} />
                    </Link>
                  )}
                  {m.linkedinProfileUrl && (
                    <Link
                      href={m.linkedinProfileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 transition hover:text-violet-400"
                    >
                      <Linkedin size={20} />
                    </Link>
                  )}
                  {m.websiteUrl && (
                    <Link
                      href={m.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 transition hover:text-violet-400"
                    >
                      <GlobeIcon size={20} />
                    </Link>
                  )}

                  {m.resumeUrl && (
                    <span className="ml-auto">
                      <ResumeButton memberId={m.id} />
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {members.length === 0 && (
            <p className="col-span-full p-10 text-center text-slate-500">
              No members found matching your criteria.
            </p>
          )}
        </div>

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
