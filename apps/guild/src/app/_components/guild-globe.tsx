"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPin, UsersRound } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { cn } from "@forge/ui";

import { GlobePlaceholder } from "./globe-placeholder";

export type GlobeCluster =
  RouterOutputs["guild"]["getPublicGlobeLocations"][number];

const GlobeRenderer = dynamic(() => import("./globe-renderer"), {
  loading: () => null,
  ssr: false,
});

export function GuildGlobe({ clusters }: { clusters: GlobeCluster[] }) {
  const [selectedKey, setSelectedKey] = useState(clusters[0]?.key ?? null);
  const [rendererReady, setRendererReady] = useState(false);
  const selected = useMemo(
    () => clusters.find((cluster) => cluster.key === selectedKey) ?? null,
    [clusters, selectedKey],
  );
  const selectCluster = useCallback((key: string) => setSelectedKey(key), []);
  const showRenderer = useCallback(() => setRendererReady(true), []);
  const showFallback = useCallback(() => setRendererReady(false), []);

  return (
    <div className="guild-globe-layout relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/10">
      <div
        className="relative min-h-[22rem] flex-1 overflow-hidden bg-background/35 sm:min-h-[26rem] md:min-h-0"
        data-globe-stage
        data-renderer-ready={rendererReady}
      >
        <GlobePlaceholder
          clusters={clusters}
          className={rendererReady ? "scale-105 opacity-0" : "opacity-100"}
        />
        <GlobeRenderer
          clusters={clusters}
          className={
            rendererReady ? "opacity-100" : "pointer-events-none opacity-0"
          }
          onReady={showRenderer}
          onSelect={selectCluster}
          onUnavailable={showFallback}
        />

        <p className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-white/10 bg-background/75 px-3 py-2 text-xs text-muted-foreground backdrop-blur sm:bottom-5 sm:left-5">
          {rendererReady
            ? clusters.length > 0
              ? "Drag · scroll or pinch · select a member"
              : "Drag · scroll or pinch to explore"
            : clusters.length > 0
              ? "Member locations"
              : "World map preview"}
        </p>
      </div>

      {clusters.length > 1 ? (
        <div className="flex shrink-0 gap-1 overflow-x-auto border-t border-white/10 bg-card/90 p-3 backdrop-blur md:absolute md:bottom-4 md:left-[20rem] md:right-4 md:z-30 md:rounded-lg md:border">
          {clusters.map((cluster) => (
            <button
              key={cluster.key}
              type="button"
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                cluster.key === selectedKey
                  ? "border-primary/30 bg-primary/15 text-foreground"
                  : "border-transparent text-muted-foreground hover:border-white/10 hover:bg-white/5 hover:text-foreground",
              )}
              aria-pressed={cluster.key === selectedKey}
              onClick={() => selectCluster(cluster.key)}
            >
              <MapPin
                className="h-3.5 w-3.5 shrink-0 text-primary"
                aria-hidden="true"
              />
              {cluster.label}
              <span className="text-xs text-muted-foreground">
                {cluster.count}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {selected ? (
        <section className="shrink-0 border-t border-white/10 bg-card/95 backdrop-blur md:absolute md:left-4 md:top-4 md:z-30 md:flex md:max-h-[calc(100%-6rem)] md:w-72 md:flex-col md:overflow-hidden md:rounded-lg md:border md:shadow-2xl">
          <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:flex-col md:items-start">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Current location
              </p>
              <h2 className="mt-1 text-xl font-semibold">{selected.label}</h2>
            </div>
            <span className="inline-flex w-fit shrink-0 items-center gap-1.5 text-sm text-muted-foreground md:text-xs">
              <UsersRound className="h-4 w-4" aria-hidden="true" />
              {selected.count}{" "}
              {selected.count === 1 ? "Guild member" : "Guild members"}
            </span>
          </div>
          <div className="grid max-h-52 gap-px overflow-y-auto bg-white/10 md:min-h-0 md:flex-1">
            {selected.profiles.map((profile) => (
              <Link
                key={profile.id}
                href={`/members/${profile.id}?from=/globe`}
                className="group flex min-h-20 items-center gap-3 bg-card px-5 py-4 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:min-h-[4.5rem] md:px-4 md:py-3"
              >
                {profile.profilePictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.profilePictureUrl}
                    alt=""
                    className="h-11 w-11 rounded-lg object-cover"
                  />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-semibold text-primary">
                    {profile.firstName.at(0)}
                    {profile.lastName.at(0)}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {profile.firstName} {profile.lastName}
                  </span>
                  {profile.tagline ? (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {profile.tagline}
                    </span>
                  ) : null}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
