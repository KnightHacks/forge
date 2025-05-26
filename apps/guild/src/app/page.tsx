import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";

import { api } from "~/trpc/server";

const PAGE_SIZE = 50;

export default async function GuildPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const query = searchParams.q?.trim() ?? undefined;
  const page = Number(searchParams.page ?? 0);

  if (Number.isNaN(page) || page < 0) notFound();

  const { members, total } = await api.member.getGuildMembers({
    page: page,
    pageSize: PAGE_SIZE,
    query: query,
    tags: [],
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (newPage: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (newPage > 0) params.set("page", newPage.toString());
    return `/?${params.toString()}`;
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-3xl font-bold">Guild Members</h1>

      <form action="/" className="mb-8 flex gap-2">
        <Input
          name="q"
          placeholder="Search names or taglines…"
          className="w-full"
          defaultValue={query}
        />
        <Button type="submit">Search</Button>
      </form>

      <div className="divide-y rounded-lg border">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-4 p-4">
            <Image
              src={m.profilePictureUrl || "/placeholder-avatar.png"}
              alt={`${m.firstName}'s avatar`}
              width={80}
              height={80}
              className="h-20 w-20 rounded-full object-cover"
            />
            <div>
              <h2 className="text-xl font-semibold">
                {m.firstName} {m.lastName}
              </h2>
              {m.tagline && (
                <p className="text-sm text-muted-foreground">{m.tagline}</p>
              )}
              <p className="mt-1 text-sm">
                Grad:&nbsp;
                {new Date(m.gradDate).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                })}
              </p>
            </div>
          </div>
        ))}
        {members.length === 0 && (
          <p className="p-6 text-center text-muted-foreground">
            No members found.
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <Button asChild variant="outline" disabled={page === 0}>
            <Link href={buildHref(page - 1)}>Previous</Link>
          </Button>

          <span className="text-sm">
            Page {page + 1} of {totalPages}
          </span>

          <Button asChild variant="outline" disabled={page + 1 >= totalPages}>
            <Link href={buildHref(page + 1)}>Next</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
