import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Github, Linkedin } from "lucide-react";

import { GUILD_TAG_OPTIONS, GuildTag } from "@forge/consts/knight-hacks";
import { Button } from "@forge/ui/button";

import { api } from "~/trpc/server";
import Dock from "./_components/dock";

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
const DEFAULT_PAGE_SIZE: PageSize = 50;

const CARD_ACCENT_GRADIENT =
  "before:from-violet-600/20 before:to-indigo-600/20";

export default async function GuildPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string; ps?: string; tag?: string };
}) {
  const query = searchParams.q?.trim() ?? undefined;
  const pageSize: PageSize =
    PAGE_SIZE_OPTIONS.find((s) => String(s) === searchParams.ps) ??
    DEFAULT_PAGE_SIZE;
  const currentPage = Number(searchParams.page ?? 0); // Renamed 'page' to 'currentPage' for clarity
  if (Number.isNaN(currentPage) || currentPage < 0) notFound();
  const selectedTag: GuildTag | undefined =
    GUILD_TAG_OPTIONS.find((t) => t === searchParams.tag) ?? undefined;

  const data = await api.guild.getGuildMembers({
    page: currentPage,
    pageSize,
    query: query !== "" ? query : undefined,
    tags: selectedTag ? [selectedTag] : [],
  });

  const members = data.members;
  const totalMembers = data.total; // Use data.total from the API response

  const totalPages = Math.max(1, Math.ceil(totalMembers / pageSize));

  const buildHref = (opts: {
    page?: number;
    ps?: PageSize;
    tag?: GuildTag | "none";
    q?: string;
  }) => {
    const params = new URLSearchParams();
    const qVal = opts.q ?? query;
    if (qVal) params.set("q", qVal);

    const psVal = opts.ps ?? pageSize;
    if (psVal !== DEFAULT_PAGE_SIZE) params.set("ps", String(psVal));

    const pageVal = opts.page ?? currentPage; // Use currentPage as default
    if (pageVal > 0) params.set("page", String(pageVal));

    const tagVal = opts.tag ?? selectedTag;
    if (tagVal && tagVal !== "none") params.set("tag", tagVal);

    const queryString = params.toString();
    return `${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <div className="dark min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]"></div>
      <div className="container relative mx-auto max-w-7xl p-6 py-10 md:p-8 lg:py-12">
        <h1 className="mb-8 text-4xl font-bold tracking-tight text-slate-50">
          Guild Members
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
              className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg ring-1 ring-slate-700/50 backdrop-blur-md transition-all duration-300 ease-in-out before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-br hover:-translate-y-1 hover:shadow-violet-500/20 ${CARD_ACCENT_GRADIENT} hover:before:opacity-70`}
            >
              <div className="p-5">
                <div className="flex items-center gap-4">
                  <Image
                    src={m.profilePictureUrl ?? "/placeholder-avatar.png"}
                    alt={`${m.firstName}'s avatar`}
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

                <div className="mt-5 flex gap-3 border-t border-slate-800 pt-4">
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
                      <ExternalLink size={20} />
                    </Link>
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
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4 sm:justify-between">
            <Button
              asChild
              variant="outline"
              disabled={currentPage === 0}
              className="border-slate-700 bg-slate-800/50 hover:bg-slate-700/70 disabled:opacity-50"
            >
              <Link
                href={buildHref({
                  page: 0,
                  q: query,
                  ps: pageSize,
                  tag: selectedTag,
                })}
              >
                First Page
              </Link>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                disabled={currentPage === 0}
                className="border-slate-700 bg-slate-800/50 px-4 hover:bg-slate-700/70 disabled:opacity-50"
              >
                <Link
                  href={buildHref({
                    page: currentPage - 1,
                    q: query,
                    ps: pageSize,
                    tag: selectedTag,
                  })}
                >
                  Previous
                </Link>
              </Button>
              <span className="text-sm text-slate-400">
                Page {currentPage + 1} of {totalPages}
              </span>
              <Button
                asChild
                variant="outline"
                disabled={currentPage + 1 >= totalPages}
                className="border-slate-700 bg-slate-800/50 px-4 hover:bg-slate-700/70 disabled:opacity-50"
              >
                <Link
                  href={buildHref({
                    page: currentPage + 1,
                    q: query,
                    ps: pageSize,
                    tag: selectedTag,
                  })}
                >
                  Next
                </Link>
              </Button>
            </div>
            <Button
              asChild
              variant="outline"
              disabled={currentPage + 1 >= totalPages}
              className="border-slate-700 bg-slate-800/50 hover:bg-slate-700/70 disabled:opacity-50"
            >
              <Link
                href={buildHref({
                  page: totalPages - 1,
                  q: query,
                  ps: pageSize,
                  tag: selectedTag,
                })}
              >
                Last Page
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
