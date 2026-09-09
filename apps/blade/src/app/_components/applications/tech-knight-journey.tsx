"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import type { ModelMaterialState } from "./tech-knight-model-materials";
import {
  arrivalFragmentShader,
  arrivalVertexShader,
} from "./tech-knight-arrival-shaders";
import { JourneyMarkup } from "./tech-knight-journey-markup";
import {
  disposeSceneResources,
  prepareModelForArrival,
} from "./tech-knight-model-materials";

const ENTRANCE_DURATION = 5400;
const SOURCE = new THREE.Vector3(2.9, 3.45, -34);
const DESTINATION = new THREE.Vector3(0.1, -0.28, 0);

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(Math.max(value, minimum), maximum);
}

function smoothstep(start: number, end: number, value: number) {
  const progress = clamp((value - start) / (end - start));
  return progress * progress * (3 - 2 * progress);
}

function pulse(center: number, width: number, value: number) {
  const distance = (value - center) / width;
  return Math.exp(-(distance * distance));
}

function seededRandom(index: number) {
  const value = Math.sin(index * 91.3458) * 47453.5453;
  return value - Math.floor(value);
}

function createStarField() {
  const positions = new Float32Array(620 * 3);
  for (let index = 0; index < 620; index += 1) {
    positions[index * 3] = (seededRandom(index * 3) - 0.5) * 30;
    positions[index * 3 + 1] = (seededRandom(index * 3 + 1) - 0.5) * 18;
    positions[index * 3 + 2] = 4 - seededRandom(index * 3 + 2) * 60;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    blending: THREE.AdditiveBlending,
    color: 0x8197c9,
    depthWrite: false,
    opacity: 0.48,
    size: 0.022,
    transparent: true,
  });
  return { geometry, material, points: new THREE.Points(geometry, material) };
}

function createWarpField() {
  const count = 180;
  const positions = new Float32Array(count * 6);
  const anchors = Array.from({ length: count }, (_, index) => ({
    x: (seededRandom(index * 5 + 900) - 0.5) * 18,
    y: (seededRandom(index * 5 + 901) - 0.5) * 11,
    z: seededRandom(index * 5 + 902),
  }));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: 0x89dfff,
    depthWrite: false,
    opacity: 0,
    transparent: true,
  });
  const lines = new THREE.LineSegments(geometry, material);

  const update = (time: number, intensity: number) => {
    const attribute = geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const length = 0.08 + intensity * 5.4;
    anchors.forEach((anchor, index) => {
      const z = 8 - ((anchor.z * 60 + time * 0.022 * intensity) % 60);
      attribute.setXYZ(index * 2, anchor.x, anchor.y, z);
      attribute.setXYZ(index * 2 + 1, anchor.x, anchor.y, z - length);
    });
    attribute.needsUpdate = true;
    material.opacity = intensity * 0.58;
  };

  return { geometry, lines, material, update };
}

function orientBetween(
  object: THREE.Object3D,
  start: THREE.Vector3,
  end: THREE.Vector3,
) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  object.position.copy(start).add(end).multiplyScalar(0.5);
  object.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  object.scale.y = length;
}

function createArrivalRig() {
  const group = new THREE.Group();
  const coreMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: 0xeaffff,
    depthWrite: false,
    opacity: 0,
    transparent: true,
    toneMapped: false,
  });
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.11, 3),
    coreMaterial,
  );
  core.position.copy(SOURCE);
  group.add(core);

  const ringMaterials: THREE.MeshBasicMaterial[] = [];
  const rings = Array.from({ length: 7 }, (_, index) => {
    const material = new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: index % 2 === 0 ? 0xa8f7ff : 0x596dff,
      depthWrite: false,
      opacity: 0,
      side: THREE.DoubleSide,
      transparent: true,
      toneMapped: false,
    });
    ringMaterials.push(material);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.18 + index * 0.075, 0.007, 8, 80),
      material,
    );
    ring.position.copy(SOURCE);
    ring.rotation.set(index * 0.17, index * 0.31, index * 0.11);
    group.add(ring);
    return ring;
  });

  const beamUniforms = {
    uIntensity: { value: 0 },
    uTime: { value: 0 },
  };
  const beamMaterial = new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fragmentShader: arrivalFragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
    uniforms: beamUniforms,
    vertexShader: arrivalVertexShader,
  });
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 0.03, 1, 48, 8, true),
    beamMaterial,
  );
  orientBetween(beam, SOURCE, DESTINATION);
  group.add(beam);

  const shockwaveMaterials: THREE.MeshBasicMaterial[] = [];
  const shockwaves = Array.from({ length: 3 }, (_, index) => {
    const material = new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: index === 1 ? 0xffffff : 0x71dfff,
      depthWrite: false,
      opacity: 0,
      side: THREE.DoubleSide,
      transparent: true,
      toneMapped: false,
    });
    shockwaveMaterials.push(material);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.013 + index * 0.006, 8, 120),
      material,
    );
    ring.position.set(0.1, -0.1, -0.5 - index * 0.22);
    group.add(ring);
    return ring;
  });

  return {
    beamMaterial,
    beamUniforms,
    core,
    coreMaterial,
    group,
    ringMaterials,
    rings,
    shockwaveMaterials,
    shockwaves,
  };
}

function normalizeModel(model: THREE.Group) {
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const normalization = 5.8 / size.y;
  model.position.set(
    -center.x * normalization,
    -center.y * normalization,
    -center.z * normalization,
  );
  model.scale.setScalar(normalization);
}

type JourneyWorld = ReturnType<typeof createJourneyWorld>;

interface JourneyState {
  disposed: boolean;
  entranceStart?: number;
  frame: number;
  pointerX: number;
  pointerY: number;
  progress: number;
}

function createJourneyWorld(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x02040d, 0.018);
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 140);
  const composer = new EffectComposer(renderer);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.15, 0.72, 0.22);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);

  const modelStage = new THREE.Group();
  modelStage.visible = false;
  const modelMaterials: ModelMaterialState[] = [];
  const stars = createStarField();
  const warp = createWarpField();
  const arrivalRig = createArrivalRig();
  const ambientLight = new THREE.HemisphereLight(0xa7d8ff, 0x08020f, 1.5);
  const cyanLight = new THREE.PointLight(0x34d9ff, 48, 20, 1.7);
  const violetLight = new THREE.PointLight(0x6332c5, 56, 22, 1.6);
  const warmLight = new THREE.PointLight(0xe0c65a, 18, 14, 1.9);
  const sourceLight = new THREE.PointLight(0xdafaff, 0, 50, 1.25);
  cyanLight.position.set(4.5, 2.5, 5);
  violetLight.position.set(-4.8, 2, 1);
  warmLight.position.set(3.2, -2.2, 3.5);
  sourceLight.position.copy(SOURCE);
  scene.add(
    modelStage,
    stars.points,
    warp.lines,
    arrivalRig.group,
    ambientLight,
    cyanLight,
    violetLight,
    warmLight,
    sourceLight,
  );

  const path = new THREE.CatmullRomCurve3([
    SOURCE,
    new THREE.Vector3(2.25, 2.8, -21),
    new THREE.Vector3(1.35, 1.5, -9),
    new THREE.Vector3(0.35, 0.1, -1.8),
    DESTINATION,
  ]);
  return {
    arrivalRig,
    bloom,
    camera,
    composer,
    cyanLight,
    modelMaterials,
    modelStage,
    path,
    pathPosition: new THREE.Vector3(),
    scene,
    sourceLight,
    stars,
    violetLight,
    warp,
  };
}

function updateArrivalEffects(
  world: JourneyWorld,
  timeline: number,
  time: number,
) {
  const ignition = smoothstep(0.02, 0.2, timeline);
  const translationFlash = pulse(0.57, 0.075, timeline);
  const sourceFade = 1 - smoothstep(0.54, 0.84, timeline);
  world.arrivalRig.coreMaterial.opacity = ignition * sourceFade;
  world.arrivalRig.core.scale.setScalar(
    1 + ignition * 5 + translationFlash * 16,
  );
  world.arrivalRig.rings.forEach((ring, index) => {
    const phase = smoothstep(0.04 + index * 0.018, 0.32, timeline);
    ring.scale.setScalar(0.25 + phase * (2.8 + index * 0.32));
    ring.rotation.z += 0.0018 * (index % 2 === 0 ? 1 : -1);
    const material = world.arrivalRig.ringMaterials[index];
    if (material) material.opacity = phase * sourceFade * 0.62;
  });
  world.arrivalRig.beamUniforms.uTime.value = time * 0.001;
  world.arrivalRig.beamUniforms.uIntensity.value =
    ignition * sourceFade * (0.5 + translationFlash * 0.85);
  world.arrivalRig.shockwaves.forEach((ring, index) => {
    const wave = smoothstep(
      0.59 + index * 0.055,
      0.7 + index * 0.055,
      timeline,
    );
    const waveFade = 1 - smoothstep(0.72 + index * 0.055, 0.92, timeline);
    ring.scale.setScalar(0.08 + wave * (5.4 + index * 1.8));
    const material = world.arrivalRig.shockwaveMaterials[index];
    if (material) material.opacity = wave * waveFade * 0.72;
  });
  world.sourceLight.intensity =
    ignition * sourceFade * 110 + translationFlash * 150;
  world.cyanLight.intensity = 38 + translationFlash * 34;
  world.violetLight.intensity = 48 + translationFlash * 30;
  world.warp.update(time, ignition * sourceFade);
  world.bloom.strength = 0.92 + translationFlash * 1.35;
}

function updateJourneyFrame(
  journey: HTMLElement,
  world: JourneyWorld,
  state: JourneyState,
  time: number,
) {
  const timeline = state.entranceStart
    ? clamp((time - state.entranceStart) / ENTRANCE_DURATION)
    : 0;
  const travel = smoothstep(0.2, 0.79, timeline);
  const materialization = smoothstep(0.4, 0.6, timeline);
  const reveal = smoothstep(0.72, 0.96, timeline);
  const mobile = window.innerWidth < 700;
  const scrollEase = smoothstep(0, 1, state.progress);
  const baseScale = mobile ? 0.76 : 0.95;

  world.camera.position.set(0, mobile ? 0.45 : 0.18, 9.4 - scrollEase * 2.1);
  world.camera.lookAt(0, mobile ? 0.05 : 0.18, 0);
  world.path.getPoint(travel, world.pathPosition);
  world.modelStage.visible = timeline >= 0.38;
  world.modelMaterials.forEach((state) => {
    state.material.opacity = state.opacity * materialization;
    state.material.transparent = state.transparent || materialization < 0.999;
    state.material.depthWrite = state.depthWrite && materialization >= 0.92;
  });
  world.modelStage.position.copy(world.pathPosition);
  world.modelStage.position.x -= scrollEase * 0.35;
  world.modelStage.position.y += scrollEase * 0.25;
  world.modelStage.rotation.set(
    state.pointerY * 0.014,
    -0.08 - (1 - travel) * 0.62 + scrollEase * 0.62 + state.pointerX * 0.035,
    (1 - travel) * -0.11,
  );
  world.modelStage.scale.setScalar(
    baseScale * (0.54 + smoothstep(0.3, 0.83, timeline) * 0.46),
  );
  world.stars.points.rotation.y = time * 0.000012 + scrollEase * 0.12;
  world.stars.points.position.z = scrollEase * 1.5;
  journey.style.setProperty("--arrival-opacity", `${reveal}`);
  updateArrivalEffects(world, timeline, time);
}

function createRenderer(canvas: HTMLCanvasElement) {
  try {
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    return renderer;
  } catch {
    return undefined;
  }
}

function mountJourney(journey: HTMLElement, canvas: HTMLCanvasElement) {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const renderer = createRenderer(canvas);
  if (!renderer) return;
  const world = createJourneyWorld(renderer);
  const state: JourneyState = {
    disposed: false,
    frame: 0,
    pointerX: 0,
    pointerY: 0,
    progress: 0,
  };
  journey.style.setProperty("--arrival-opacity", reducedMotion ? "1" : "0");

  new GLTFLoader().load(
    "/saicharan/tech-knight.glb",
    (gltf) => {
      if (state.disposed) {
        disposeSceneResources(gltf.scene);
        return;
      }
      normalizeModel(gltf.scene);
      world.modelMaterials.push(...prepareModelForArrival(gltf.scene));
      world.modelStage.add(gltf.scene);
      state.entranceStart =
        reducedMotion || state.progress > 0.025
          ? performance.now() - ENTRANCE_DURATION
          : performance.now();
    },
    undefined,
    () => {
      journey.dataset.modelError = "true";
      journey.style.setProperty("--arrival-opacity", "1");
    },
  );

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    world.composer.setSize(width, height);
    world.bloom.resolution.set(width, height);
    world.camera.aspect = width / height;
    world.camera.updateProjectionMatrix();
  };
  const updateProgress = () => {
    const journeyTop = journey.getBoundingClientRect().top + window.scrollY;
    const range = Math.max(1, journey.offsetHeight - window.innerHeight);
    state.progress = reducedMotion
      ? 0
      : clamp((window.scrollY - journeyTop) / range);
    journey.style.setProperty(
      "--hero-exit",
      `${smoothstep(0.18, 0.7, state.progress)}`,
    );
    if (state.progress > 0.025 && state.entranceStart) {
      state.entranceStart = performance.now() - ENTRANCE_DURATION;
    }
  };
  const handlePointerMove = (event: PointerEvent) => {
    if (reducedMotion || event.pointerType !== "mouse") return;
    state.pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
    state.pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
  };
  const render = (time: number) => {
    if (state.disposed) return;
    updateJourneyFrame(journey, world, state, time);
    world.composer.render();
    state.frame = window.requestAnimationFrame(render);
  };

  resize();
  updateProgress();
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  state.frame = window.requestAnimationFrame(render);

  return () => {
    state.disposed = true;
    window.cancelAnimationFrame(state.frame);
    window.removeEventListener("resize", resize);
    window.removeEventListener("scroll", updateProgress);
    window.removeEventListener("pointermove", handlePointerMove);
    disposeSceneResources(world.scene);
    world.stars.geometry.dispose();
    world.stars.material.dispose();
    world.warp.geometry.dispose();
    world.warp.material.dispose();
    world.composer.dispose();
    renderer.dispose();
  };
}

export function TechKnightJourney() {
  const journeyRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const journey = journeyRef.current;
    const canvas = canvasRef.current;
    if (!journey || !canvas) return;
    return mountJourney(journey, canvas);
  }, []);

  return <JourneyMarkup journeyRef={journeyRef} canvasRef={canvasRef} />;
}
