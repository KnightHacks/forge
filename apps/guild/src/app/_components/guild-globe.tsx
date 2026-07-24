"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPin, UsersRound } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Button } from "@forge/ui/button";

export type GlobeCluster =
  RouterOutputs["guild"]["getPublicGlobeLocations"][number];

const GlobeRenderer = dynamic(() => import("./globe-renderer"), {
  loading: () => (
    <div className="flex min-h-[28rem] items-center justify-center text-sm text-muted-foreground">
      Plotting the Guild
    </div>
  ),
  ssr: false,
});

export function GuildGlobe({ clusters }: { clusters: GlobeCluster[] }) {
  const [selectedKey, setSelectedKey] = useState(clusters[0]?.key ?? null);
  const selected = useMemo(
    () => clusters.find((cluster) => cluster.key === selectedKey) ?? null,
    [clusters, selectedKey],
  );
  const selectCluster = useCallback((key: string) => setSelectedKey(key), []);

  return (
    <div className="guild-globe-layout grid overflow-hidden rounded-xl border border-white/10 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.55fr)]">
      <div className="relative min-h-[28rem] overflow-hidden bg-background/50">
        <GlobeRenderer clusters={clusters} onSelect={selectCluster} />
        <p className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-white/10 bg-background/75 px-3 py-2 text-xs text-muted-foreground backdrop-blur">
          {clusters.length > 0
            ? "Drag to explore · select a marker for members"
            : "Drag to explore"}
        </p>
      </div>
      <aside className="flex min-h-0 flex-col border-t border-white/10 bg-card/90 lg:max-h-[38rem] lg:border-l lg:border-t-0">
        <div className="border-b border-white/10 p-5">
          <p className="text-sm font-medium text-primary">
            {selected ? "Current location" : "Guild map"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            {selected?.label ?? "Across the country"}
          </h2>
          {selected ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {selected.count}{" "}
              {selected.count === 1 ? "Guild member" : "Guild members"}
            </p>
          ) : (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Cities shared by members will collect here.
            </p>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {selected ? (
            <div className="space-y-1">
              {selected.profiles.map((profile) => (
                <Button
                  key={profile.id}
                  asChild
                  variant="ghost"
                  className="h-auto w-full justify-start gap-3 px-3 py-3 text-left"
                >
                  <Link href={`/members/${profile.id}?from=/globe`}>
                    {profile.profilePictureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.profilePictureUrl}
                        alt=""
                        className="h-9 w-9 rounded-md object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-xs font-semibold text-primary">
                        {profile.firstName.at(0)}
                        {profile.lastName.at(0)}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {profile.firstName} {profile.lastName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {profile.tagline ?? "Guild member"}
                      </span>
                    </span>
                  </Link>
                </Button>
              ))}
            </div>
          ) : (
            <div className="flex min-h-48 items-center justify-center px-5 text-center text-sm leading-6 text-muted-foreground">
              The first city will appear here.
            </div>
          )}
        </div>
        {clusters.length > 0 ? (
          <div className="max-h-44 overflow-y-auto border-t border-white/10 p-3">
            <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">
              All cities
            </p>
            <div className="grid gap-1">
              {clusters.map((cluster) => (
                <button
                  key={cluster.key}
                  type="button"
                  className="flex min-h-10 items-center justify-between rounded-md px-2 text-left text-sm hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-pressed={cluster.key === selectedKey}
                  onClick={() => selectCluster(cluster.key)}
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <MapPin
                      className="h-3.5 w-3.5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="truncate">{cluster.label}</span>
                  </span>
                  <span className="ml-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
                    {cluster.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
