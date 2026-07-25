"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as THREE from "three";

import { cn } from "@forge/ui";

import type { GlobeMarkerGroup } from "./globe-clustering";
import type { GlobeCluster } from "./guild-globe";
import {
  GLOBE_MAX_ZOOM_SCALE,
  GLOBE_MIN_ZOOM_SCALE,
  groupGlobeClusters,
} from "./globe-clustering";
import { globeCoastlines, globeCountryBoundaries } from "./globe-geography";

function globePosition(latitude: number, longitude: number, radius: number) {
  const phi = THREE.MathUtils.degToRad(90 - latitude);
  const theta = THREE.MathUtils.degToRad(longitude + 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function latitudeLine(latitude: number, radius: number) {
  return Array.from({ length: 121 }, (_, index) =>
    globePosition(latitude, -180 + index * 3, radius),
  );
}

function longitudeLine(longitude: number, radius: number) {
  return Array.from({ length: 81 }, (_, index) =>
    globePosition(-80 + index * 2, longitude, radius),
  );
}

function geographicLine(coordinates: number[][], radius: number) {
  return coordinates.flatMap(([longitude, latitude]) =>
    longitude === undefined || latitude === undefined
      ? []
      : [globePosition(latitude, longitude, radius)],
  );
}

function GlobePhotoMarker({
  group,
  markerRef,
  onSelect,
}: {
  group: GlobeMarkerGroup;
  markerRef: (element: HTMLButtonElement | null) => void;
  onSelect: (group: GlobeMarkerGroup) => void;
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
  }, [group.key, markerRef, profiles.length]);

  if (!profile) return null;

  return (
    <button
      ref={markerRef}
      type="button"
      data-globe-photo-marker={group.key}
      data-globe-marker-cities={group.cityKeys.length}
      className={cn(
        "group absolute left-0 top-0 z-10 grid place-items-center rounded-full border-[#b99cff] bg-[#16112a] text-[10px] font-semibold text-white opacity-0 shadow-[0_0_0_3px_rgba(12,9,26,0.72),0_0_22px_rgba(151,111,255,0.55)] transition-[opacity,box-shadow] duration-200 will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none",
        group.cityKeys.length > 1
          ? "h-12 w-12 border-[3px] sm:h-14 sm:w-14"
          : "h-10 w-10 border-2 sm:h-11 sm:w-11",
      )}
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

export default function GlobeRenderer({
  className,
  clusters,
  onReady,
  onSelect,
  onUnavailable,
}: {
  className?: string;
  clusters: GlobeCluster[];
  onReady: () => void;
  onSelect: (key: string) => void;
  onUnavailable: () => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef(new Map<string, HTMLButtonElement>());
  const zoomInRef = useRef<() => void>(() => undefined);
  const zoomOutRef = useRef<() => void>(() => undefined);
  const [markerGroups, setMarkerGroups] = useState(() =>
    groupGlobeClusters(clusters, 1),
  );
  const markerGroupsRef = useRef(markerGroups);
  const setMarkerRef = useCallback(
    (key: string, element: HTMLButtonElement | null) => {
      if (element) markerRefs.current.set(key, element);
      else markerRefs.current.delete(key);
    },
    [],
  );

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 6.2);

    const canvas = document.createElement("canvas");
    const contextAttributes: WebGLContextAttributes = {
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    };
    const context =
      canvas.getContext("webgl2", contextAttributes) ??
      canvas.getContext("webgl", contextAttributes);
    if (!context) {
      mount.dataset.failed = "true";
      onUnavailable();
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas,
        context,
        powerPreference: "high-performance",
      });
    } catch {
      mount.dataset.failed = "true";
      onUnavailable();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "block h-full w-full";
    mount.appendChild(renderer.domElement);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    function trackGeometry<T extends THREE.BufferGeometry>(geometry: T): T {
      geometries.push(geometry);
      return geometry;
    }
    function trackMaterial<T extends THREE.Material>(material: T): T {
      materials.push(material);
      return material;
    }

    const root = new THREE.Group();
    root.rotation.x = -0.1;
    root.rotation.y = -0.45;
    scene.add(root);

    const globe = new THREE.Mesh(
      trackGeometry(new THREE.SphereGeometry(2, 72, 72)),
      trackMaterial(
        new THREE.MeshPhongMaterial({
          color: 0x10182b,
          emissive: 0x070b18,
          opacity: 0.98,
          shininess: 24,
          transparent: true,
        }),
      ),
    );
    root.add(globe);

    root.add(
      new THREE.Mesh(
        trackGeometry(new THREE.SphereGeometry(2.075, 64, 64)),
        trackMaterial(
          new THREE.MeshBasicMaterial({
            blending: THREE.AdditiveBlending,
            color: 0x6f55d9,
            opacity: 0.08,
            side: THREE.BackSide,
            transparent: true,
          }),
        ),
      ),
    );

    const gridMaterial = trackMaterial(
      new THREE.LineBasicMaterial({
        color: 0x6172a8,
        opacity: 0.13,
        transparent: true,
      }),
    );
    for (let latitude = -60; latitude <= 60; latitude += 20) {
      root.add(
        new THREE.Line(
          trackGeometry(
            new THREE.BufferGeometry().setFromPoints(
              latitudeLine(latitude, 2.012),
            ),
          ),
          gridMaterial,
        ),
      );
    }
    for (let longitude = -150; longitude <= 180; longitude += 30) {
      root.add(
        new THREE.Line(
          trackGeometry(
            new THREE.BufferGeometry().setFromPoints(
              longitudeLine(longitude, 2.012),
            ),
          ),
          gridMaterial,
        ),
      );
    }

    const coastlineMaterial = trackMaterial(
      new THREE.LineBasicMaterial({
        color: 0xa394eb,
        opacity: 0.72,
        transparent: true,
      }),
    );
    const countryMaterial = trackMaterial(
      new THREE.LineBasicMaterial({
        color: 0x796da8,
        opacity: 0.28,
        transparent: true,
      }),
    );
    for (const outline of globeCoastlines) {
      root.add(
        new THREE.Line(
          trackGeometry(
            new THREE.BufferGeometry().setFromPoints(
              geographicLine(outline, 2.022),
            ),
          ),
          coastlineMaterial,
        ),
      );
    }
    for (const outline of globeCountryBoundaries) {
      root.add(
        new THREE.Line(
          trackGeometry(
            new THREE.BufferGeometry().setFromPoints(
              geographicLine(outline, 2.021),
            ),
          ),
          countryMaterial,
        ),
      );
    }

    scene.add(new THREE.AmbientLight(0x8997c6, 1.4));
    const keyLight = new THREE.DirectionalLight(0x9c7cff, 3.2);
    keyLight.position.set(-3, 3, 5);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x4384ff, 2.2);
    rimLight.position.set(4, -1, -3);
    scene.add(rimLight);

    const markerGroup = new THREE.Group();
    const markerMeshes: THREE.Mesh<
      THREE.SphereGeometry,
      THREE.MeshBasicMaterial
    >[] = [];
    for (const cluster of clusters) {
      const size = 0.026 + Math.min(cluster.count, 12) * 0.004;
      const marker = new THREE.Mesh(
        trackGeometry(new THREE.SphereGeometry(size, 18, 18)),
        trackMaterial(new THREE.MeshBasicMaterial({ color: 0xb396ff })),
      );
      marker.position.copy(
        globePosition(cluster.latitude, cluster.longitude, 2.055),
      );
      marker.userData.key = cluster.key;
      markerMeshes.push(marker);
      markerGroup.add(marker);

      const halo = new THREE.Mesh(
        trackGeometry(new THREE.RingGeometry(size * 1.5, size * 2.4, 24)),
        trackMaterial(
          new THREE.MeshBasicMaterial({
            color: 0x6f8cff,
            opacity: 0.45,
            side: THREE.DoubleSide,
            transparent: true,
          }),
        ),
      );
      halo.position.copy(marker.position);
      halo.lookAt(new THREE.Vector3(0, 0, 0));
      markerGroup.add(halo);
    }
    root.add(markerGroup);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const selectAtPointer = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(markerMeshes, false)[0];
      renderer.domElement.style.cursor = hit ? "pointer" : "grab";
      if (event.type === "click" && hit) {
        const key = hit.object.userData.key as unknown;
        if (typeof key === "string") onSelect(key);
      }
    };
    renderer.domElement.addEventListener("pointermove", selectAtPointer);
    renderer.domElement.addEventListener("click", selectAtPointer);

    const pointers = new Map<number, { x: number; y: number }>();
    let dragging = false;
    let previousX = 0;
    let previousY = 0;
    let pinchDistance = 0;
    let pinchZoomScale = 1;
    let zoomScale = 1;
    let targetZoomScale = 1;
    const changeZoom = (change: number) => {
      targetZoomScale = THREE.MathUtils.clamp(
        targetZoomScale + change,
        GLOBE_MIN_ZOOM_SCALE,
        GLOBE_MAX_ZOOM_SCALE,
      );
    };
    zoomInRef.current = () => changeZoom(-0.16);
    zoomOutRef.current = () => changeZoom(0.16);

    const onPointerDown = (event: PointerEvent) => {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      previousX = event.clientX;
      previousY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
      if (pointers.size === 1) {
        dragging = true;
        renderer.domElement.style.cursor = "grabbing";
      } else if (pointers.size === 2) {
        dragging = false;
        const [first, second] = [...pointers.values()];
        if (first && second) {
          pinchDistance = Math.hypot(second.x - first.x, second.y - first.y);
          pinchZoomScale = targetZoomScale;
        }
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      if (pointers.has(event.pointerId)) {
        pointers.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });
      }
      if (pointers.size >= 2) {
        const [first, second] = [...pointers.values()];
        if (first && second) {
          const distance = Math.hypot(second.x - first.x, second.y - first.y);
          if (pinchDistance > 0) {
            targetZoomScale = THREE.MathUtils.clamp(
              pinchZoomScale * (pinchDistance / Math.max(distance, 1)),
              GLOBE_MIN_ZOOM_SCALE,
              GLOBE_MAX_ZOOM_SCALE,
            );
          }
        }
        return;
      }
      if (!dragging) return;
      root.rotation.y += (event.clientX - previousX) * 0.006;
      root.rotation.x = THREE.MathUtils.clamp(
        root.rotation.x + (event.clientY - previousY) * 0.004,
        -0.9,
        0.9,
      );
      previousX = event.clientX;
      previousY = event.clientY;
    };
    const onPointerUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      const remaining = [...pointers.values()][0];
      if (remaining) {
        dragging = true;
        previousX = remaining.x;
        previousY = remaining.y;
      } else {
        dragging = false;
        renderer.domElement.style.cursor = "grab";
      }
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      changeZoom(event.deltaY * 0.001);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    let visible = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? true;
      },
      { threshold: 0.05 },
    );
    observer.observe(mount);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let fitDistance = 6.2;
    const resize = () => {
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      root.position.x =
        camera.aspect > 2 ? 0.55 : camera.aspect > 1.4 ? 0.28 : 0;
      fitDistance =
        camera.aspect < 1 ? Math.min(6.2 / camera.aspect, 8.4) : 6.2;
      camera.position.z = fitDistance * zoomScale;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();
    mount.dataset.markerGroups = String(markerGroupsRef.current.length);

    let previousTime = performance.now();
    let lastGroupedZoom = 1;
    let markerGroupSignature = markerGroupsRef.current
      .map((group) => group.key)
      .join("|");
    const projectedPosition = new THREE.Vector3();
    const worldPosition = new THREE.Vector3();
    const positionPhotoMarkers = () => {
      root.updateMatrixWorld(true);
      const positionedKeys = new Set<string>();
      const projectedMarkers: {
        element: HTMLButtonElement;
        group: GlobeMarkerGroup;
        scale: number;
        worldDepth: number;
        x: number;
        y: number;
      }[] = [];
      for (const group of markerGroupsRef.current) {
        const element = markerRefs.current.get(group.key);
        if (!element) continue;
        positionedKeys.add(group.key);
        worldPosition
          .copy(globePosition(group.latitude, group.longitude, 2.055))
          .applyMatrix4(root.matrixWorld);
        const isVisible = worldPosition.z > 0.32;
        if (!isVisible) {
          if (element.style.opacity !== "0") element.style.opacity = "0";
          element.style.pointerEvents = "none";
          continue;
        }
        projectedPosition.copy(worldPosition).project(camera);
        const x = (projectedPosition.x * 0.5 + 0.5) * mount.clientWidth;
        const y = (-projectedPosition.y * 0.5 + 0.5) * mount.clientHeight;
        const scale = THREE.MathUtils.clamp(
          0.82 + worldPosition.z * 0.085,
          0.82,
          1.08,
        );
        projectedMarkers.push({
          element,
          group,
          scale,
          worldDepth: worldPosition.z,
          x,
          y,
        });
      }
      for (const [key, element] of markerRefs.current) {
        if (positionedKeys.has(key)) continue;
        if (element.style.opacity !== "0") element.style.opacity = "0";
        element.style.pointerEvents = "none";
      }

      const parents = projectedMarkers.map((_, index) => index);
      const find = (index: number): number => {
        const parent = parents[index];
        if (parent === undefined || parent === index) return index;
        const rootIndex = find(parent);
        parents[index] = rootIndex;
        return rootIndex;
      };
      const union = (first: number, second: number) => {
        const firstRoot = find(first);
        const secondRoot = find(second);
        if (firstRoot !== secondRoot) parents[secondRoot] = firstRoot;
      };
      for (let first = 0; first < projectedMarkers.length; first += 1) {
        for (
          let second = first + 1;
          second < projectedMarkers.length;
          second += 1
        ) {
          const firstMarker = projectedMarkers[first];
          const secondMarker = projectedMarkers[second];
          if (
            firstMarker &&
            secondMarker &&
            Math.hypot(
              secondMarker.x - firstMarker.x,
              secondMarker.y - firstMarker.y,
            ) < 48
          ) {
            union(first, second);
          }
        }
      }
      const collisionGroups = new Map<
        number,
        (typeof projectedMarkers)[number][]
      >();
      projectedMarkers.forEach((marker, index) => {
        const rootIndex = find(index);
        const collisionGroup = collisionGroups.get(rootIndex) ?? [];
        collisionGroup.push(marker);
        collisionGroups.set(rootIndex, collisionGroup);
      });
      for (const collisionGroup of collisionGroups.values()) {
        const ordered = collisionGroup.sort((first, second) =>
          first.group.key.localeCompare(second.group.key),
        );
        const center = ordered.reduce(
          (point, marker) => ({
            x: point.x + marker.x / ordered.length,
            y: point.y + marker.y / ordered.length,
          }),
          { x: 0, y: 0 },
        );
        const signature = ordered.map((marker) => marker.group.key).join("|");
        const angleOffset =
          ([...signature].reduce(
            (total, character) => total + character.charCodeAt(0),
            0,
          ) %
            360) *
          (Math.PI / 180);
        const spreadRadius =
          ordered.length > 1 ? 28 + Math.max(ordered.length - 2, 0) * 4 : 0;

        ordered.forEach((marker, index) => {
          const angle =
            angleOffset + (index / Math.max(ordered.length, 1)) * Math.PI * 2;
          const x = spreadRadius
            ? center.x + Math.cos(angle) * spreadRadius
            : marker.x;
          const y = spreadRadius
            ? center.y + Math.sin(angle) * spreadRadius
            : marker.y;
          if (marker.element.style.opacity !== "1") {
            marker.element.style.opacity = "1";
          }
          marker.element.style.pointerEvents = "auto";
          marker.element.style.zIndex = String(
            Math.round(20 + marker.worldDepth * 10),
          );
          marker.element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${marker.scale})`;
          marker.element.dataset.globeSpread =
            ordered.length > 1 ? "true" : "false";
        });
      }
    };
    const render = (time: number) => {
      const delta = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      if (visible) {
        if (!reduceMotion && !dragging) root.rotation.y += delta * 0.025;
        zoomScale = THREE.MathUtils.lerp(
          zoomScale,
          targetZoomScale,
          Math.min(delta * 10, 1),
        );
        if (Math.abs(zoomScale - lastGroupedZoom) >= 0.005) {
          const nextGroups = groupGlobeClusters(clusters, zoomScale);
          const nextSignature = nextGroups.map((group) => group.key).join("|");
          lastGroupedZoom = zoomScale;
          mount.dataset.markerGroups = String(nextGroups.length);
          if (nextSignature !== markerGroupSignature) {
            markerGroupSignature = nextSignature;
            markerGroupsRef.current = nextGroups;
            setMarkerGroups(nextGroups);
          }
        }
        mount.dataset.zoomScale = zoomScale.toFixed(3);
        camera.position.z = fitDistance * zoomScale;
        renderer.render(scene, camera);
        positionPhotoMarkers();
      }
    };
    renderer.render(scene, camera);
    positionPhotoMarkers();
    onReady();
    renderer.setAnimationLoop(render);

    const onContextLost = (event: Event) => {
      event.preventDefault();
      onUnavailable();
    };
    const onContextRestored = () => onReady();
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    renderer.domElement.addEventListener(
      "webglcontextrestored",
      onContextRestored,
    );

    return () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointermove", selectAtPointer);
      renderer.domElement.removeEventListener("click", selectAtPointer);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener(
        "webglcontextlost",
        onContextLost,
      );
      renderer.domElement.removeEventListener(
        "webglcontextrestored",
        onContextRestored,
      );
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      zoomInRef.current = () => undefined;
      zoomOutRef.current = () => undefined;
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [clusters, onReady, onSelect, onUnavailable]);

  return (
    <div
      ref={mountRef}
      className={cn(
        "absolute inset-0 cursor-grab touch-none transition-opacity duration-500 motion-reduce:transition-none",
        className,
      )}
      aria-label="Interactive Guild member globe"
    >
      {markerGroups.map((group) => (
        <GlobePhotoMarker
          key={group.key}
          group={group}
          markerRef={(element) => setMarkerRef(group.key, element)}
          onSelect={(selectedGroup) => {
            onSelect(selectedGroup.primaryKey);
            if (selectedGroup.cityKeys.length > 1) zoomInRef.current();
          }}
        />
      ))}
      <div className="absolute right-3 top-3 z-30 flex overflow-hidden rounded-md border border-white/10 bg-background/80 shadow-lg backdrop-blur sm:right-4 sm:top-4">
        <button
          type="button"
          className="grid h-10 w-10 place-items-center border-r border-white/10 text-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          onClick={() => zoomInRef.current()}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          className="grid h-10 w-10 place-items-center text-xl text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          onClick={() => zoomOutRef.current()}
          aria-label="Zoom out"
        >
          −
        </button>
      </div>
    </div>
  );
}
