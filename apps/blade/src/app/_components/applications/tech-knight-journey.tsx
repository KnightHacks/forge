"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import type { ModelMaterialState } from "./tech-knight-model-materials";
import {
  createGravityField,
  createSingularityRig,
  createStarField,
  MOBILE_SINGULARITY_POSITION,
  SINGULARITY_POSITION,
} from "./tech-knight-black-hole-effects";
import { JourneyMarkup } from "./tech-knight-journey-markup";
import {
  disposeSceneResources,
  prepareModelForArrival,
} from "./tech-knight-model-materials";

const SEQUENCE_DURATION = 9000;
const REVEAL_THRESHOLD = 0.75;
const MODEL_START = new THREE.Vector3(0, -0.3, 0);

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

function setModelOpacity(states: ModelMaterialState[], opacity: number) {
  states.forEach((state) => {
    state.material.opacity = state.opacity * opacity;
    state.material.transparent = state.transparent || opacity < 0.999;
    state.material.depthWrite = state.depthWrite && opacity > 0.94;
  });
}

type JourneyWorld = ReturnType<typeof createJourneyWorld>;

type JourneyPhase = "hero" | "ignition" | "gravity" | "reveal";

interface JourneyState {
  disposed: boolean;
  frame: number;
  phase: JourneyPhase;
  pointerX: number;
  pointerY: number;
  previousTime?: number;
  revealSent: boolean;
  running: boolean;
  timeline: number;
}

interface JourneyOptions {
  canReveal: () => boolean;
  onFailure: () => void;
  onReducedMotion: () => void;
  onReveal: () => void;
}

function createJourneyWorld(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x02040d, 0.025);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const composer = new EffectComposer(renderer);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.58, 0.54, 0.55);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);

  const modelStage = new THREE.Group();
  modelStage.position.copy(MODEL_START);
  const modelMaterials: ModelMaterialState[] = [];
  const stars = createStarField();
  const gravity = createGravityField();
  const singularity = createSingularityRig();
  const overlayScene = new THREE.Scene();
  const coreOccluder = new THREE.Mesh(
    new THREE.SphereGeometry(0.47, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: false }),
  );
  coreOccluder.position.copy(SINGULARITY_POSITION);
  coreOccluder.scale.setScalar(0.001);
  overlayScene.add(coreOccluder);
  const ambientLight = new THREE.HemisphereLight(0xb2deff, 0x05010d, 1.2);
  const cyanLight = new THREE.PointLight(0x4bdcff, 42, 18, 1.65);
  const violetLight = new THREE.PointLight(0x5e37d7, 48, 20, 1.55);
  const warmLight = new THREE.PointLight(0xdbc049, 14, 12, 1.8);
  const gravityLight = new THREE.PointLight(0x79e7ff, 0, 22, 1.35);
  cyanLight.position.set(4.2, 2.4, 5);
  violetLight.position.set(-4.6, 1.2, 1.6);
  warmLight.position.set(2.8, -2.5, 3.8);
  gravityLight.position
    .copy(SINGULARITY_POSITION)
    .add(new THREE.Vector3(0, 0, 1.2));
  scene.add(
    stars.points,
    gravity.lines,
    singularity.group,
    modelStage,
    ambientLight,
    cyanLight,
    violetLight,
    warmLight,
    gravityLight,
  );

  const desktopExtractionPath = new THREE.CatmullRomCurve3([
    MODEL_START,
    new THREE.Vector3(0.28, -0.1, -0.35),
    new THREE.Vector3(1.05, 0.3, -0.95),
    new THREE.Vector3(2.35, 0.92, -1.9),
    new THREE.Vector3(3.65, 1.55, -3.15),
  ]);
  const mobileExtractionPath = new THREE.CatmullRomCurve3([
    MODEL_START,
    new THREE.Vector3(0.06, -0.08, -0.35),
    new THREE.Vector3(0.22, 0.3, -0.95),
    new THREE.Vector3(0.52, 0.92, -1.9),
    new THREE.Vector3(0.78, 1.55, -3.15),
  ]);

  return {
    ambientLight,
    bloom,
    camera,
    composer,
    coreOccluder,
    cyanLight,
    desktopExtractionPath,
    gravity,
    gravityLight,
    mobileExtractionPath,
    modelMaterials,
    modelPosition: new THREE.Vector3(),
    modelStage,
    overlayScene,
    scene,
    singularity,
    stars,
    violetLight,
  };
}

function updateSingularity(
  world: JourneyWorld,
  timeline: number,
  time: number,
) {
  const birth = smoothstep(0.14, 0.34, timeline);
  const pull = smoothstep(0.31, 0.75, timeline);
  const flash = pulse(0.755, 0.028, timeline);
  const expansion = smoothstep(0.75, 0.985, timeline);
  const breathing = 1 + Math.sin(time * 0.0023) * 0.018 * birth;
  const occlusion = smoothstep(0.29, 0.43, timeline);
  const singularityScale = Math.max(
    0.001,
    birth * breathing * (1 + expansion * 13.5),
  );

  world.singularity.group.scale.setScalar(singularityScale);
  world.singularity.group.rotation.z = time * 0.000045 * birth;
  world.singularity.discUniforms.uBirth.value = birth;
  world.singularity.discUniforms.uFlash.value = flash;
  world.singularity.discUniforms.uPull.value = pull;
  world.singularity.discUniforms.uTime.value = time * 0.001;
  world.singularity.core.scale.setScalar(0.72 + pull * 0.28 + flash * 0.32);
  world.coreOccluder.scale.setScalar(
    singularityScale * occlusion * (0.72 + pull * 0.28 + flash * 0.32),
  );
  world.singularity.rings.forEach((ring, index) => {
    ring.rotation.z += (0.0015 + index * 0.00035) * (index % 2 ? -1 : 1);
    ring.scale.x = 1 + Math.sin(time * 0.0018 + index) * 0.04;
    const material = world.singularity.ringMaterials[index];
    if (material) {
      material.opacity = birth * (0.16 + index * 0.055) * (1 - expansion);
    }
  });
  world.gravity.update(time, birth * (0.15 + pull * 0.85) * (1 - expansion));
  world.gravityLight.intensity = birth * 34 + pull * 78 + flash * 180;
  world.cyanLight.intensity = 42 + pull * 18 + flash * 26;
  world.violetLight.intensity = 48 + birth * 18;
  world.ambientLight.intensity = 1.2 - pull * 0.55;
  world.bloom.strength = 0.58 + birth * 0.2 + pull * 0.14 + flash * 1.2;
}

function updateModel(
  world: JourneyWorld,
  state: JourneyState,
  timeline: number,
  time: number,
) {
  const pull = smoothstep(0.3, 0.765, timeline);
  const strain = pulse(0.55, 0.18, timeline) * pull;
  const collapse = smoothstep(0.57, 0.765, timeline);
  const mobile = window.innerWidth < 700;
  const baseScale = mobile ? 0.69 : 0.84;
  const scale = baseScale * (1 - collapse * 0.975);

  const extractionPath = mobile
    ? world.mobileExtractionPath
    : world.desktopExtractionPath;
  extractionPath.getPoint(pull, world.modelPosition);
  world.modelStage.position.copy(world.modelPosition);
  world.modelStage.position.x += Math.sin(time * 0.007) * strain * 0.055;
  world.modelStage.rotation.set(
    state.pointerY * 0.018 * (1 - pull) + pull * 0.28,
    -0.08 + state.pointerX * 0.038 * (1 - pull) + pull * 1.85,
    -pull * pull * 2.25,
  );
  world.modelStage.scale.set(
    scale * (1 - strain * 0.24),
    scale * (1 + strain * 0.5),
    scale * (1 - strain * 0.18),
  );
  setModelOpacity(world.modelMaterials, 1 - smoothstep(0.69, 0.765, timeline));
}

function phaseFor(timeline: number): JourneyPhase {
  if (timeline < 0.14) return "hero";
  if (timeline < 0.34) return "ignition";
  if (timeline < REVEAL_THRESHOLD) return "gravity";
  return "reveal";
}

function updateJourneyFrame(
  journey: HTMLElement,
  world: JourneyWorld,
  state: JourneyState,
  options: JourneyOptions,
  reducedMotion: boolean,
  time: number,
) {
  const delta = state.previousTime
    ? Math.min(time - state.previousTime, 48)
    : 0;
  state.previousTime = time;
  if (state.running && !reducedMotion) {
    const waitingForPortfolio =
      state.timeline >= REVEAL_THRESHOLD && !options.canReveal();
    if (!waitingForPortfolio) {
      state.timeline = clamp(state.timeline + delta / SEQUENCE_DURATION);
    }
  }

  if (
    state.timeline >= REVEAL_THRESHOLD &&
    !state.revealSent &&
    options.canReveal()
  ) {
    state.revealSent = true;
    options.onReveal();
  }

  const timeline = reducedMotion ? 0 : state.timeline;
  const birth = smoothstep(0.14, 0.34, timeline);
  const pull = smoothstep(0.3, 0.765, timeline);
  const reveal = smoothstep(0.75, 0.985, timeline);
  const mobile = window.innerWidth < 700;
  const phase = phaseFor(timeline);
  if (phase !== state.phase) {
    state.phase = phase;
    journey.dataset.phase = phase;
  }

  world.camera.position.set(0, mobile ? 0.25 : 0.08, 8.75 - pull * 0.24);
  world.camera.lookAt(0, mobile ? 0.12 : 0.08, -0.8 - pull * 0.5);
  world.stars.points.rotation.z = -time * 0.000006 * (1 + pull * 12);
  world.stars.points.rotation.y = time * 0.000008;
  world.stars.material.opacity = 0.46 * (1 - reveal);
  journey.style.setProperty("--black-hole", `${birth}`);
  journey.style.setProperty("--pull", `${pull}`);
  journey.style.setProperty("--reveal", `${reveal}`);

  updateSingularity(world, timeline, time);
  updateModel(world, state, timeline, time);
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
    renderer.toneMappingExposure = 0.78;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    return renderer;
  } catch {
    return undefined;
  }
}

function applyViewportLayout(world: JourneyWorld, mobile: boolean) {
  const position = mobile ? MOBILE_SINGULARITY_POSITION : SINGULARITY_POSITION;
  const offset = position.clone().sub(SINGULARITY_POSITION);
  world.singularity.group.position.copy(position);
  world.coreOccluder.position.copy(position);
  world.gravity.lines.position.copy(offset);
  world.gravityLight.position.copy(position).add(new THREE.Vector3(0, 0, 1.2));
}

function mountJourney(
  journey: HTMLElement,
  canvas: HTMLCanvasElement,
  options: JourneyOptions,
) {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const renderer = createRenderer(canvas);
  if (!renderer) {
    options.onFailure();
    return;
  }
  const world = createJourneyWorld(renderer);
  const state: JourneyState = {
    disposed: false,
    frame: 0,
    phase: "hero",
    pointerX: 0,
    pointerY: 0,
    revealSent: false,
    running: false,
    timeline: 0,
  };
  journey.dataset.phase = "hero";
  if (reducedMotion) options.onReducedMotion();

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
      setModelOpacity(world.modelMaterials, 1);
      state.running = true;
      state.previousTime = performance.now();
      journey.dataset.modelReady = "true";
    },
    undefined,
    () => {
      journey.dataset.modelError = "true";
      options.onFailure();
    },
  );

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    applyViewportLayout(world, width < 700);
    renderer.setSize(width, height, false);
    world.composer.setSize(width, height);
    world.bloom.resolution.set(width, height);
    world.camera.aspect = width / height;
    world.camera.updateProjectionMatrix();
  };
  const handlePointerMove = (event: PointerEvent) => {
    if (reducedMotion || event.pointerType !== "mouse") return;
    state.pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
    state.pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
  };
  const render = (time: number) => {
    if (state.disposed) return;
    updateJourneyFrame(journey, world, state, options, reducedMotion, time);
    world.composer.render();
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(world.overlayScene, world.camera);
    renderer.autoClear = true;
    state.frame = window.requestAnimationFrame(render);
  };

  resize();
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  state.frame = window.requestAnimationFrame(render);

  return () => {
    state.disposed = true;
    window.cancelAnimationFrame(state.frame);
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", handlePointerMove);
    disposeSceneResources(world.scene);
    disposeSceneResources(world.overlayScene);
    world.stars.geometry.dispose();
    world.stars.material.dispose();
    world.gravity.geometry.dispose();
    world.gravity.material.dispose();
    world.composer.dispose();
    renderer.dispose();
  };
}

interface TechKnightJourneyProps {
  onFailure: () => void;
  onReducedMotion: () => void;
  onReveal: () => void;
  portfolioReady: boolean;
}

export function TechKnightJourney({
  onFailure,
  onReducedMotion,
  onReveal,
  portfolioReady,
}: TechKnightJourneyProps) {
  const journeyRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const portfolioReadyRef = useRef(portfolioReady);
  const callbacksRef = useRef({ onFailure, onReducedMotion, onReveal });

  useEffect(() => {
    portfolioReadyRef.current = portfolioReady;
  }, [portfolioReady]);

  useEffect(() => {
    callbacksRef.current = { onFailure, onReducedMotion, onReveal };
  }, [onFailure, onReducedMotion, onReveal]);

  useEffect(() => {
    const journey = journeyRef.current;
    const canvas = canvasRef.current;
    if (!journey || !canvas) return;
    return mountJourney(journey, canvas, {
      canReveal: () => portfolioReadyRef.current,
      onFailure: () => callbacksRef.current.onFailure(),
      onReducedMotion: () => callbacksRef.current.onReducedMotion(),
      onReveal: () => callbacksRef.current.onReveal(),
    });
  }, []);

  return <JourneyMarkup journeyRef={journeyRef} canvasRef={canvasRef} />;
}
