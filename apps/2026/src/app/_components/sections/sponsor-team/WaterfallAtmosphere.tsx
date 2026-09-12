"use client";

import { useEffect, useRef } from "react";

import { useViewportActivity } from "../../useViewportActivity";
import styles from "./SponsorTeamSection.module.css";

interface WaterParticle {
  alpha: number;
  bead: boolean;
  delay: number;
  drift: number;
  duration: number;
  size: number;
  sway: number;
  travel: number;
  x: number;
  y: number;
}

const PARTICLE_COUNT = 88;
const MAX_PIXEL_RATIO = 1;

/** Returns the fractional component used for deterministic particle placement. */
function fractionalPart(value: number) {
  return value - Math.floor(value);
}

const PARTICLES: readonly WaterParticle[] = Array.from(
  { length: PARTICLE_COUNT },
  (_, index) => {
    const sequence = index + 1;
    const bead = index % 5 === 0;

    return {
      alpha: 0.48 + fractionalPart(sequence * 0.569840291) * 0.46,
      bead,
      delay: fractionalPart(sequence * 0.414213562) * 7,
      drift: (fractionalPart(sequence * 0.732050808) - 0.5) * 76,
      duration: bead
        ? 4.2 + fractionalPart(sequence * 0.438447187) * 4.8
        : 2.2 + fractionalPart(sequence * 0.754877666) * 1.5,
      size: bead ? 3.4 + (index % 3) * 0.8 : 2 + (index % 4) * 0.55,
      sway: 0.7 + fractionalPart(sequence * 0.618033989) * 1.2,
      travel: bead ? 100 + (index % 7) * 12 : 190 + (index % 9) * 18,
      x: 0.17 + fractionalPart(sequence * 0.754877666) * 0.66,
      y: fractionalPart(sequence * 0.618033989),
    };
  },
);

/** Pre-renders one reusable bead or streak sprite for the particle canvas. */
function createParticleSprite(bead: boolean) {
  const sprite = document.createElement("canvas");
  const context = sprite.getContext("2d");

  sprite.width = bead ? 32 : 24;
  sprite.height = bead ? 32 : 64;

  if (!context) return sprite;

  context.shadowColor = "rgba(190, 255, 250, 0.72)";
  context.shadowBlur = 7;

  if (bead) {
    const gradient = context.createRadialGradient(12, 10, 1, 16, 16, 13);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.4, "rgba(213, 255, 252, 0.94)");
    gradient.addColorStop(1, "rgba(71, 183, 194, 0.12)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(16, 16, 7, 0, Math.PI * 2);
    context.fill();
  } else {
    const gradient = context.createLinearGradient(12, 8, 12, 56);
    gradient.addColorStop(0, "rgba(236, 255, 253, 0.08)");
    gradient.addColorStop(0.38, "rgba(245, 255, 254, 0.82)");
    gradient.addColorStop(0.72, "rgba(255, 255, 255, 0.94)");
    gradient.addColorStop(1, "rgba(116, 218, 222, 0.08)");
    context.strokeStyle = gradient;
    context.lineCap = "round";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(12, 9);
    context.lineTo(12, 55);
    context.stroke();
  }

  return sprite;
}

/** Draws an adaptive, viewport-bound waterfall particle field on one canvas. */
export function WaterfallAtmosphere() {
  const [atmosphereRef, isAtmosphereActive] =
    useViewportActivity<HTMLDivElement>({ rootMargin: "10% 0px" });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = atmosphereRef.current;
    const canvas = canvasRef.current;

    if (!container || !canvas || !isAtmosphereActive) return;

    const context = canvas.getContext("2d", { alpha: true });

    if (!context) return;

    const streakSprite = createParticleSprite(false);
    const beadSprite = createParticleSprite(true);
    let animationFrame = 0;
    let currentPixelRatio = Math.min(
      window.devicePixelRatio || 1,
      MAX_PIXEL_RATIO,
    );
    let measuredFrames = 0;
    let measuredTime = 0;
    let previousTime = performance.now();
    let width = 0;
    let height = 0;

    /** Resizes the backing buffer without exceeding the adaptive pixel ratio. */
    const resize = () => {
      const nextWidth = Math.max(1, Math.round(canvas.clientWidth));
      const nextHeight = Math.max(1, Math.round(canvas.clientHeight));

      if (nextWidth === width && nextHeight === height && canvas.width > 0) {
        return;
      }

      width = nextWidth;
      height = nextHeight;
      canvas.width = Math.round(width * currentPixelRatio);
      canvas.height = Math.round(height * currentPixelRatio);
      context.setTransform(currentPixelRatio, 0, 0, currentPixelRatio, 0, 0);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    /** Draws one particle frame and adapts resolution from observed frame time. */
    const render = (time: number) => {
      const frameDuration = Math.min(50, time - previousTime);
      previousTime = time;
      measuredFrames += 1;
      measuredTime += frameDuration;

      if (measuredFrames >= 90) {
        const averageFrameDuration = measuredTime / measuredFrames;
        const nextPixelRatio =
          averageFrameDuration > 24
            ? Math.max(0.72, currentPixelRatio * 0.82)
            : averageFrameDuration < 17 && currentPixelRatio < MAX_PIXEL_RATIO
              ? Math.min(MAX_PIXEL_RATIO, currentPixelRatio * 1.08)
              : currentPixelRatio;

        if (Math.abs(nextPixelRatio - currentPixelRatio) > 0.04) {
          currentPixelRatio = nextPixelRatio;
          canvas.width = 0;
          resize();
        }

        measuredFrames = 0;
        measuredTime = 0;
      }

      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";

      const containerRect = container.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const sceneHeight = Math.max(containerRect.height, height);
      const elapsed = time / 1000;

      for (const particle of PARTICLES) {
        const progress =
          ((elapsed + particle.delay) % particle.duration) / particle.duration;
        const easedProgress = particle.bead
          ? 0.5 - Math.cos(progress * Math.PI) / 2
          : progress;
        const worldY =
          (particle.y * sceneHeight + easedProgress * particle.travel) %
          sceneHeight;
        const screenY = worldY + containerRect.top - canvasRect.top;

        if (screenY < -70 || screenY > height + 70) continue;

        const fade = Math.sin(progress * Math.PI);
        const x =
          particle.x * width +
          particle.drift * progress +
          Math.sin(elapsed * particle.sway + particle.delay) * 6;
        const sprite = particle.bead ? beadSprite : streakSprite;
        const drawWidth = particle.bead
          ? particle.size * 4
          : particle.size * 4.5;
        const drawHeight = particle.bead
          ? particle.size * 4
          : 28 + particle.size * 8;

        context.globalAlpha = particle.alpha * fade;
        context.drawImage(
          sprite,
          x - drawWidth / 2,
          screenY - drawHeight / 2,
          drawWidth,
          drawHeight,
        );
      }

      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      context.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [atmosphereRef, isAtmosphereActive]);

  return (
    <div
      ref={atmosphereRef}
      className={styles.waterfallAtmosphereCanvas}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className={styles.waterfallParticleCanvas} />
    </div>
  );
}
