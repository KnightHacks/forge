"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import type { GuildTag } from "@forge/consts/knight-hacks";
import { GUILD_TAG_OPTIONS } from "@forge/consts/knight-hacks";
import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";

const PAGE_SIZE_OPTIONS = [20, 40, 60, 80, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
const DEFAULT_PAGE_SIZE: PageSize = 20;

type Tag = GuildTag | "none";

interface DockProps {
  initialQuery: string;
  initialPageSize: PageSize;
  initialTag: Tag;
}

export default function Dock({
  initialQuery,
  initialPageSize,
  initialTag,
}: DockProps) {
  const router = useRouter();
  const [isPending, start] = useTransition();

  const [query, setQuery] = useState(initialQuery);
  const [pageSize, setPageSize] = useState<PageSize>(initialPageSize);
  const [tag, setTag] = useState<Tag>(initialTag);

  const buildHref = () => {
    const p = new URLSearchParams();
    if (query.trim()) p.set("q", query.trim());
    if (pageSize !== DEFAULT_PAGE_SIZE) p.set("ps", String(pageSize));
    if (tag !== "none") p.set("tag", tag);
    return `/?${p.toString()}`;
  };

  const apply = () => start(() => router.push(buildHref()));

  const clear = () =>
    start(() => {
      setQuery("");
      setPageSize(DEFAULT_PAGE_SIZE);
      setTag("none");
      router.push("/");
    });

  return (
    <div className="mb-10 flex flex-col flex-wrap gap-3 rounded-lg border border-slate-800 bg-slate-900/80 p-4 shadow-xl backdrop-blur-sm sm:flex-row">
      <div className="relative flex-grow">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          placeholder="Search names or taglines…"
          className="w-full bg-slate-800/50 pl-10 text-slate-200 placeholder-slate-500 ring-offset-slate-900 focus:ring-violet-500"
        />
      </div>

      <Select
        value={String(pageSize)}
        onValueChange={(v) => setPageSize(Number(v) as PageSize)}
      >
        <SelectTrigger className="w-full border-slate-700 bg-slate-800/50 text-slate-200 ring-offset-slate-900 focus:ring-violet-500 sm:w-36">
          <SelectValue placeholder="Page size" />
        </SelectTrigger>
        <SelectContent className="border-slate-700 bg-slate-800 text-slate-200">
          {PAGE_SIZE_OPTIONS.map((n) => (
            <SelectItem
              key={n}
              value={String(n)}
              className="focus:bg-violet-500/30"
            >
              {n} / page
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={tag} onValueChange={(v) => setTag(v as Tag)}>
        <SelectTrigger className="w-full border-slate-700 bg-slate-800/50 text-slate-200 ring-offset-slate-900 focus:ring-violet-500 sm:w-36">
          <SelectValue placeholder="Tags" />
        </SelectTrigger>
        <SelectContent className="border-slate-700 bg-slate-800 text-slate-200">
          <SelectItem value="none" className="focus:bg-violet-500/30">
            All
          </SelectItem>
          {GUILD_TAG_OPTIONS.map((t) => (
            <SelectItem
              key={t}
              value={t}
              className="capitalize focus:bg-violet-500/30"
            >
              {(t as string).charAt(0).toUpperCase() + t.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button
          onClick={apply}
          disabled={isPending}
          className="flex-1 bg-violet-600 text-white hover:bg-violet-700"
        >
          Apply
        </Button>
        <Button
          onClick={clear}
          variant="outline"
          disabled={isPending}
          className="flex-1 border-slate-700 bg-slate-800/50 hover:bg-slate-700/70"
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
