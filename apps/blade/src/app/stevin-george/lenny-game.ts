import type { RefObject } from "react";
import { useEffect } from "react";

import type { Terrain, Walker } from "./lenny-walk";
import { createWalker, PLAYER, stepWalker, WORLD } from "./lenny-walk";

export type LandingDestination = "resume" | "portfolio" | "github" | "linkedin";
export type ExternalDestination = "github" | "linkedin";

interface Platform {
  id: string;
  left: number;
  right: number;
  y: number;
  destination?: LandingDestination;
}

interface GameOptions {
  active: boolean;
  sceneRef: RefObject<HTMLDivElement | null>;
  lennyRef: RefObject<HTMLButtonElement | null>;
  spriteRef: RefObject<HTMLSpanElement | null>;
  jumpRequestRef: RefObject<boolean>;
  onLand: (destination: LandingDestination | null) => void;
  onVisit: (destination: ExternalDestination) => void;
  onExit: () => void;
}

const LEFT = new Set(["ArrowLeft", "KeyA"]);
const RIGHT = new Set(["ArrowRight", "KeyD"]);
const JUMP = new Set(["Space", "ArrowUp", "KeyW"]);
const SPRITE_COLUMNS = 4;
const SPRITE_FRAMES = 16;
const EXPANDED_WORLD = { height: 640, ground: 580 };

function groundForHeight(height: number) {
  const progress = Math.max(
    0,
    Math.min(
      1,
      (height - WORLD.height) / (EXPANDED_WORLD.height - WORLD.height),
    ),
  );
  return WORLD.ground + progress * (EXPANDED_WORLD.ground - WORLD.ground);
}

function getPlatforms(scene: HTMLDivElement): Platform[] {
  const sceneBounds = scene.getBoundingClientRect();
  const tree = scene.querySelector<HTMLElement>("[data-tree]");
  const treeWidth = tree?.clientWidth ?? 420;
  const treeHeight = tree?.clientHeight ?? 525;
  const treeLeft = scene.clientWidth / 2 - treeWidth / 2;
  const treeTop = tree?.offsetTop ?? 10;
  const branch = (
    id: string,
    left: number,
    right: number,
    height: number,
  ): Platform => ({
    id,
    left: treeLeft + left * treeWidth,
    right: treeLeft + right * treeWidth,
    y: treeTop + height * treeHeight,
  });
  const destinations = Array.from(
    scene.querySelectorAll<HTMLElement>("[data-platform]"),
    (row): Platform => {
      const bounds = row.getBoundingClientRect();
      const destination = row.dataset.platform as LandingDestination;
      return {
        id: destination,
        left: bounds.left - sceneBounds.left,
        right: bounds.right - sceneBounds.left,
        y: bounds.bottom - sceneBounds.top,
        destination,
      };
    },
  );

  const platforms: Platform[] = [
    ...destinations,
    branch("upper-left", 0.12, 0.48, 0.17),
    branch("upper-right", 0.53, 0.92, 0.2),
    branch("middle-left", 0.12, 0.53, 0.45),
    branch("middle-right", 0.55, 0.98, 0.55),
    branch("lower-left", 0.09, 0.51, 0.75),
  ];
  return platforms.sort((a, b) => a.y - b.y);
}

function overlapsPlatform(x: number, platform: Platform) {
  return (
    x + PLAYER.width / 2 - 14 > platform.left &&
    x - PLAYER.width / 2 + 14 < platform.right
  );
}

function canUseGameKeys(event: KeyboardEvent, lenny: HTMLButtonElement) {
  if (event.altKey || event.ctrlKey || event.metaKey) return false;
  const target = event.target;
  if (!(target instanceof HTMLElement) || target === lenny) return true;
  return !target.closest(
    "a, button, input, textarea, select, [contenteditable]",
  );
}

/** Runs the earlier forest controller against this page's tree and section platforms. */
export function useLennyGame({
  active,
  sceneRef,
  lennyRef,
  spriteRef,
  jumpRequestRef,
  onLand,
  onVisit,
  onExit,
}: GameOptions) {
  useEffect(() => {
    if (!active) return;

    const scene = sceneRef.current;
    const lenny = lennyRef.current;
    const sprite = spriteRef.current;
    if (!scene || !lenny || !sprite) return;
    const sceneElement = scene;
    const lennyElement = lenny;
    const spriteElement = sprite;

    const desktop = window.matchMedia("(min-width: 1241px)");
    if (!desktop.matches) {
      onExit();
      return;
    }

    const atlasImage = spriteElement.querySelector("img");
    if (!atlasImage) return;
    const atlasImageElement = atlasImage;
    let sceneWidth = sceneElement.clientWidth;
    let sceneHeight = sceneElement.clientHeight;
    let ground = groundForHeight(sceneHeight);
    let baseLeft = sceneWidth / 2 + 122;
    let platforms = getPlatforms(sceneElement);
    let walker: Walker = createWalker(baseLeft + PLAYER.width / 2);
    let surface: string | null = "ground";
    let landingDestination: LandingDestination | null = null;
    let activeFrame = -1;
    let previousTime = 0;
    let animationId = 0;
    const keys = new Set<string>();

    function setLanding(next: LandingDestination | null) {
      if (landingDestination === next) return;
      landingDestination = next;
      onLand(next);
    }

    function render() {
      lennyElement.style.transform = `translate3d(${walker.x - PLAYER.width / 2 - baseLeft}px, ${ground - PLAYER.height - walker.y - lennyElement.offsetTop}px, 0)`;
      spriteElement.style.transform = `scaleX(${walker.facing})`;
      const frame = Math.floor(walker.phase) % SPRITE_FRAMES;
      if (frame !== activeFrame) {
        const column = frame % SPRITE_COLUMNS;
        const row = Math.floor(frame / SPRITE_COLUMNS);
        atlasImageElement.style.transform = `translate3d(${-column * PLAYER.width}px, ${-row * PLAYER.height}px, 0)`;
        activeFrame = frame;
      }
      lennyElement.dataset.surface = surface ?? "air";
      lennyElement.dataset.x = String(Math.round(walker.x));
      lennyElement.dataset.y = String(Math.round(walker.y));
      lennyElement.dataset.frame = String(frame + 1);
    }

    function syncSceneLayout() {
      const nextHeight = sceneElement.clientHeight;
      const previousGround = ground;
      sceneHeight = nextHeight;
      ground = groundForHeight(nextHeight);
      // The link rows move inside a fixed-height scene when a panel opens.
      platforms = getPlatforms(sceneElement);

      if (walker.grounded && surface !== "ground") {
        const support = platforms.find((item) => item.id === surface);
        if (support) walker.y = ground - support.y;
      } else if (!walker.grounded && ground !== previousGround) {
        // Keep an airborne Lenny at the same screen height if the ground moves.
        walker.y += ground - previousGround;
      }
    }

    function tick(time: number) {
      syncSceneLayout();
      let remaining = previousTime
        ? Math.min((time - previousTime) / 1000, 0.05)
        : 0;
      previousTime = time;
      const left = [...LEFT].some((key) => keys.has(key));
      const right = [...RIGHT].some((key) => keys.has(key));
      const direction = Number(right) - Number(left);

      // Match the original controller's bounded 120 Hz physics integration.
      while (remaining > 0) {
        const dt = Math.min(remaining, 1 / 120);
        const current = walker;
        const heldSurface = platforms.find((item) => item.id === surface);
        const terrain: Terrain = {
          maxX: sceneWidth - PLAYER.width / 2,
          support: (x) => {
            if (!current.grounded || surface === "ground") return 0;
            return heldSurface && overlapsPlatform(x, heldSurface)
              ? ground - heldSurface.y
              : undefined;
          },
        };
        const jumping = jumpRequestRef.current;
        const next = stepWalker(current, direction, jumping, dt, terrain);
        jumpRequestRef.current = false;

        if (!next.grounded && next.vy <= 0) {
          const platform = platforms.find((item) => {
            const height = ground - item.y;
            return (
              current.y >= height &&
              next.y <= height &&
              overlapsPlatform(next.x, item)
            );
          });
          if (platform) {
            next.y = ground - platform.y;
            next.vy = 0;
            next.grounded = true;
            surface = platform.id;
          }
        }

        if (next.grounded && surface !== "ground") {
          const platform = platforms.find((item) => item.id === surface);
          if (!platform || next.y !== ground - platform.y) surface = "ground";
        } else if (next.grounded) {
          surface = "ground";
        } else {
          surface = null;
        }

        walker = next;
        setLanding(
          platforms.find((item) => item.id === surface)?.destination ?? null,
        );
        remaining -= dt;
      }

      render();
      animationId = window.requestAnimationFrame(tick);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.code === "Escape") {
        event.preventDefault();
        onExit();
        return;
      }
      if (
        event.code === "Enter" &&
        (landingDestination === "github" ||
          landingDestination === "linkedin") &&
        canUseGameKeys(event, lennyElement)
      ) {
        event.preventDefault();
        onVisit(landingDestination);
        return;
      }
      if (!canUseGameKeys(event, lennyElement)) return;

      if (LEFT.has(event.code) || RIGHT.has(event.code)) {
        keys.add(event.code);
      } else if (JUMP.has(event.code)) {
        if (!event.repeat) jumpRequestRef.current = true;
      } else {
        return;
      }
      event.preventDefault();
    }

    function onKeyUp(event: KeyboardEvent) {
      keys.delete(event.code);
    }

    function clearInput() {
      keys.clear();
      jumpRequestRef.current = false;
      previousTime = 0;
    }

    function onVisibilityChange() {
      clearInput();
      window.cancelAnimationFrame(animationId);
      if (!document.hidden) animationId = window.requestAnimationFrame(tick);
    }

    function onResize() {
      if (!desktop.matches) {
        onExit();
        return;
      }
      sceneWidth = sceneElement.clientWidth;
      baseLeft = sceneWidth / 2 + 122;
      syncSceneLayout();
      platforms = getPlatforms(sceneElement);
      walker.x = Math.min(walker.x, sceneWidth - PLAYER.width / 2);
      render();
    }

    render();
    animationId = window.requestAnimationFrame(tick);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", onResize);
    window.addEventListener("blur", clearInput);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.cancelAnimationFrame(animationId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("blur", clearInput);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      lennyElement.style.removeProperty("transform");
      spriteElement.style.removeProperty("transform");
      delete lennyElement.dataset.surface;
      delete lennyElement.dataset.x;
      delete lennyElement.dataset.y;
      delete lennyElement.dataset.frame;
      jumpRequestRef.current = false;
    };
  }, [
    active,
    sceneRef,
    lennyRef,
    spriteRef,
    jumpRequestRef,
    onLand,
    onVisit,
    onExit,
  ]);
}
