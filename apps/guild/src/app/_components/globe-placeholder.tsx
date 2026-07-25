"use client";

import { useId, useMemo } from "react";

import { cn } from "@forge/ui";

import type { GlobeCluster } from "./guild-globe";
import {
  globeCoastlines,
  globeCountryBoundaries,
  globePath,
  projectGlobeCoordinate,
} from "./globe-geography";

export function GlobePlaceholder({
  className,
  clusters,
}: {
  className?: string;
  clusters: GlobeCluster[];
}) {
  const id = useId().replaceAll(":", "");
  const coastlines = useMemo(() => globePath(globeCoastlines), []);
  const countries = useMemo(() => globePath(globeCountryBoundaries), []);
  const markers = clusters
    .map((cluster) => ({
      ...cluster,
      position: projectGlobeCoordinate(cluster.longitude, cluster.latitude),
    }))
    .filter((cluster) => cluster.position.visible);

  return (
    <div
      data-globe-placeholder="true"
      className={cn(
        "pointer-events-none absolute inset-0 grid place-items-center overflow-hidden transition-[opacity,transform] duration-500 motion-reduce:transition-none",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 600 600"
        className="h-[96%] w-[96%] max-w-[46rem]"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id={`${id}-ocean`} cx="35%" cy="28%" r="75%">
            <stop offset="0%" stopColor="#18234b" />
            <stop offset="62%" stopColor="#0c1430" />
            <stop offset="100%" stopColor="#060b1a" />
          </radialGradient>
          <radialGradient id={`${id}-halo`}>
            <stop offset="64%" stopColor="#7356db" stopOpacity="0" />
            <stop offset="82%" stopColor="#7356db" stopOpacity="0.13" />
            <stop offset="100%" stopColor="#7356db" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${id}-clip`}>
            <circle cx="300" cy="300" r="252" />
          </clipPath>
          <filter
            id={`${id}-glow`}
            x="-200%"
            y="-200%"
            width="400%"
            height="400%"
          >
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        <circle
          cx="300"
          cy="300"
          r="280"
          fill={`url(#${id}-halo)`}
          opacity="0.8"
        />
        <circle
          cx="300"
          cy="300"
          r="252"
          fill={`url(#${id}-ocean)`}
          stroke="#5f4fa0"
          strokeOpacity="0.36"
          strokeWidth="2"
        />
        <g
          clipPath={`url(#${id}-clip)`}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <ellipse
            cx="300"
            cy="300"
            rx="252"
            ry="83"
            stroke="#7380ac"
            strokeOpacity="0.11"
          />
          <ellipse
            cx="300"
            cy="300"
            rx="126"
            ry="252"
            stroke="#7380ac"
            strokeOpacity="0.11"
          />
          <path
            d={countries}
            stroke="#8b7ec2"
            strokeOpacity="0.28"
            strokeWidth="1"
          />
          <path
            d={coastlines}
            stroke="#b2a5f3"
            strokeOpacity="0.76"
            strokeWidth="1.6"
          />
        </g>

        {markers.map((cluster) => (
          <g
            key={cluster.key}
            transform={`translate(${cluster.position.x.toFixed(3)} ${cluster.position.y.toFixed(3)})`}
          >
            <circle
              r={11 + Math.min(cluster.count, 12)}
              fill="#9c7cff"
              opacity="0.22"
              filter={`url(#${id}-glow)`}
            />
            <circle r={5 + Math.min(cluster.count, 12) * 0.45} fill="#b79aff" />
          </g>
        ))}
      </svg>
    </div>
  );
}
