"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import type { GlobeCluster } from "./guild-globe";

function globePosition(latitude: number, longitude: number, radius: number) {
  const phi = THREE.MathUtils.degToRad(90 - latitude);
  const theta = THREE.MathUtils.degToRad(longitude + 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export default function GlobeRenderer({
  clusters,
  onSelect,
}: {
  clusters: GlobeCluster[];
  onSelect: (key: string) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 6.2);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      mount.dataset.failed = "true";
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
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

    root.add(
      new THREE.Mesh(
        trackGeometry(new THREE.SphereGeometry(2, 64, 64)),
        trackMaterial(
          new THREE.MeshPhongMaterial({
            color: 0x10172c,
            emissive: 0x080d1d,
            opacity: 0.92,
            shininess: 28,
            transparent: true,
          }),
        ),
      ),
    );
    const gridSource = trackGeometry(new THREE.SphereGeometry(2.012, 28, 18));
    root.add(
      new THREE.LineSegments(
        trackGeometry(new THREE.WireframeGeometry(gridSource)),
        trackMaterial(
          new THREE.LineBasicMaterial({
            color: 0x713cf0,
            opacity: 0.16,
            transparent: true,
          }),
        ),
      ),
    );

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
      const size = 0.045 + Math.min(cluster.count, 12) * 0.008;
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

    let dragging = false;
    let previousX = 0;
    let previousY = 0;
    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      previousX = event.clientX;
      previousY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.style.cursor = "grabbing";
    };
    const onPointerMove = (event: PointerEvent) => {
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
      dragging = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      renderer.domElement.style.cursor = "grab";
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

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
    const clock = new THREE.Clock();
    let frame = 0;

    const resize = () => {
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const render = () => {
      frame = window.requestAnimationFrame(render);
      const delta = Math.min(clock.getDelta(), 0.05);
      if (visible) {
        if (!reduceMotion && !dragging) root.rotation.y += delta * 0.045;
        renderer.render(scene, camera);
      }
    };
    render();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointermove", selectAtPointer);
      renderer.domElement.removeEventListener("click", selectAtPointer);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [clusters, onSelect]);

  return (
    <div
      ref={mountRef}
      className="h-full min-h-[28rem] w-full"
      aria-hidden="true"
    />
  );
}
