import type { RefObject } from "react";
import { useEffect } from "react";

import type { Terrain, Walker } from "./lenny-walk";
import { createWalker, PLAYER, stepWalker, WORLD } from "./lenny-walk";

export type LandingSection = "resume" | "portfolio";

interface Platform {
  id: string;
  left: number;
  right: number;
  y: number;
  section?: LandingSection;
}

interface GameOptions {
  active: boolean;
  sceneRef: RefObject<HTMLDivElement | null>;
  lennyRef: RefObject<HTMLButtonElement | null>;
  framesRef: RefObject<HTMLSpanElement | null>;
  jumpRequestRef: RefObject<boolean>;
  onLand: (section: LandingSection | null) => void;
  onExit: () => void;
}

const LEFT = new Set(["ArrowLeft", "KeyA"]);
const RIGHT = new Set(["ArrowRight", "KeyD"]);
const JUMP = new Set(["Space", "ArrowUp", "KeyW"]);

function getPlatforms(sceneWidth: number): Platform[] {
  const treeLeft = sceneWidth / 2 - 168;
  const branch = (
    id: string,
    left: number,
    right: number,
    height: number,
  ): Platform => ({
    id,
    left: treeLeft + left * 336,
    right: treeLeft + right * 336,
    y: 26 + height * 420,
  });
  const sectionWidth = Math.min(440, sceneWidth * 0.35);

  const platforms: Platform[] = [
    { id: "resume", left: 0, right: sectionWidth, y: 82, section: "resume" },
    {
      id: "portfolio",
      left: sceneWidth - sectionWidth,
      right: sceneWidth,
      y: 82,
      section: "portfolio",
    },
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

/** Runs the earlier forest controller against this page's tree and section platforms. */
export function useLennyGame({
  active,
  sceneRef,
  lennyRef,
  framesRef,
  jumpRequestRef,
  onLand,
  onExit,
}: GameOptions) {
  useEffect(() => {
    if (!active) return;

    const scene = sceneRef.current;
    const lenny = lennyRef.current;
    const frames = framesRef.current;
    if (!scene || !lenny || !frames) return;
    const sceneElement = scene;
    const lennyElement = lenny;
    const framesElement = frames;

    const desktop = window.matchMedia("(min-width: 1241px)");
    if (!desktop.matches) {
      onExit();
      return;
    }

    const images = Array.from(framesElement.querySelectorAll("img"));
    let sceneWidth = sceneElement.clientWidth;
    let baseLeft = sceneWidth / 2 + 110;
    let platforms = getPlatforms(sceneWidth);
    let walker: Walker = createWalker(baseLeft + PLAYER.width / 2);
    let surface: string | null = "ground";
    let landingSection: LandingSection | null = null;
    let activeFrame = -1;
    let previousTime = 0;
    let animationId = 0;
    const keys = new Set<string>();

    function setLanding(next: LandingSection | null) {
      if (landingSection === next) return;
      landingSection = next;
      onLand(next);
    }

    function render() {
      lennyElement.style.transform = `translate3d(${walker.x - PLAYER.width / 2 - baseLeft}px, ${WORLD.ground - PLAYER.height - walker.y - 320}px, 0)`;
      framesElement.style.transform = `scaleX(${walker.facing})`;
      const frame = Math.floor(walker.phase) % images.length;
      if (frame !== activeFrame) {
        images.forEach((image, index) => {
          image.style.opacity = index === frame ? "1" : "0";
        });
        activeFrame = frame;
      }
      lennyElement.dataset.surface = surface ?? "air";
      lennyElement.dataset.x = String(Math.round(walker.x));
      lennyElement.dataset.y = String(Math.round(walker.y));
      lennyElement.dataset.frame = String(frame + 1);
    }

    function tick(time: number) {
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
              ? WORLD.ground - heldSurface.y
              : undefined;
          },
        };
        const jumping = jumpRequestRef.current;
        const next = stepWalker(current, direction, jumping, dt, terrain);
        jumpRequestRef.current = false;

        if (!next.grounded && next.vy <= 0) {
          const platform = platforms.find((item) => {
            const height = WORLD.ground - item.y;
            return (
              current.y >= height &&
              next.y <= height &&
              overlapsPlatform(next.x, item)
            );
          });
          if (platform) {
            next.y = WORLD.ground - platform.y;
            next.vy = 0;
            next.grounded = true;
            surface = platform.id;
          }
        }

        if (next.grounded && surface !== "ground") {
          const platform = platforms.find((item) => item.id === surface);
          if (!platform || next.y !== WORLD.ground - platform.y)
            surface = "ground";
        } else if (next.grounded) {
          surface = "ground";
        } else {
          surface = null;
        }

        walker = next;
        setLanding(
          platforms.find((item) => item.id === surface)?.section ?? null,
        );
        remaining -= dt;
      }

      render();
      animationId = window.requestAnimationFrame(tick);
    }

    function canUseGameKeys(event: KeyboardEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement) || target === lennyElement)
        return true;
      return !target.closest(
        "a, button, input, textarea, select, [contenteditable]",
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.code === "Escape") {
        event.preventDefault();
        onExit();
        return;
      }
      if (
        !canUseGameKeys(event) ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;

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
      baseLeft = sceneWidth / 2 + 110;
      platforms = getPlatforms(sceneWidth);
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
      framesElement.style.removeProperty("transform");
      delete lennyElement.dataset.surface;
      delete lennyElement.dataset.x;
      delete lennyElement.dataset.y;
      delete lennyElement.dataset.frame;
      jumpRequestRef.current = false;
    };
  }, [active, sceneRef, lennyRef, framesRef, jumpRequestRef, onLand, onExit]);
}
