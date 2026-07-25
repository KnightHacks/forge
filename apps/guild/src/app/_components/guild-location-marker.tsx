"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@forge/ui";

import type { GlobeMarkerGroup } from "./globe-clustering";

export function GuildLocationMarker({
  group,
  markerRef,
  mode,
  onSelect,
  style,
}: {
  group: GlobeMarkerGroup;
  markerRef?: (element: HTMLButtonElement | null) => void;
  mode: "globe" | "map";
  onSelect: (group: GlobeMarkerGroup) => void;
  style?: CSSProperties;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const picturedProfiles = group.profiles.filter(
    (profile) => profile.profilePictureUrl,
  );
  const profiles =
    picturedProfiles.length > 0 ? picturedProfiles : group.profiles;
  const profile = profiles[activeIndex % Math.max(profiles.length, 1)];

  useEffect(() => {
    if (profiles.length < 2) return;
    let interval: number | undefined;
    const offset =
      [...group.key].reduce((total, character) => {
        return total + character.charCodeAt(0);
      }, 0) % 1800;
    const timeout = window.setTimeout(() => {
      setActiveIndex((current) => current + 1);
      interval = window.setInterval(
        () => setActiveIndex((current) => current + 1),
        4200,
      );
    }, 2400 + offset);
    return () => {
      window.clearTimeout(timeout);
      if (interval) window.clearInterval(interval);
    };
  }, [group.key, profiles.length]);

  if (!profile) return null;

  return (
    <button
      ref={markerRef}
      type="button"
      data-globe-photo-marker={mode === "globe" ? group.key : undefined}
      data-flat-map-photo-marker={mode === "map" ? group.key : undefined}
      data-globe-marker-cities={group.cityKeys.length}
      className={cn(
        "group absolute left-0 top-0 z-10 grid place-items-center rounded-full border-[#b99cff] bg-[#16112a] text-[10px] font-semibold text-white shadow-[0_0_0_3px_rgba(12,9,26,0.72),0_0_22px_rgba(151,111,255,0.55)] transition-[opacity,box-shadow] duration-200 will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none",
        mode === "globe" && "opacity-0",
        group.cityKeys.length > 1
          ? "h-12 w-12 border-[3px] sm:h-14 sm:w-14"
          : "h-10 w-10 border-2 sm:h-11 sm:w-11",
      )}
      style={style}
      onClick={() => onSelect(group)}
      aria-label={`Show ${group.label}: ${group.count} ${
        group.count === 1 ? "member" : "members"
      }`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={profile.id}
          className="absolute inset-0 overflow-hidden rounded-full"
          initial={{ opacity: 0, scale: 0.82 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.08 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
        >
          {profile.profilePictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.profilePictureUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="grid h-full w-full place-items-center bg-primary/25">
              {profile.firstName.at(0)}
              {profile.lastName.at(0)}
            </span>
          )}
        </motion.span>
      </AnimatePresence>
      {group.count > 1 ? (
        <span className="absolute -bottom-1 -right-1 z-10 grid min-h-4 min-w-4 place-items-center rounded-full border border-[#0c091a] bg-[#8f6cff] px-1 text-[9px] leading-none text-white">
          {group.count}
        </span>
      ) : null}
    </button>
  );
}
