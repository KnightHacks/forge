"use client";

import { useEffect, useRef } from "react";
import {
  siCplusplus,
  siRust,
  siTypescript,
  siPython,
  siHono,
  siSolid,
  siTailwindcss,
  siShadcnui
} from "simple-icons";

const ICONS = [
  siCplusplus,
  siRust,
  siTypescript,
  siPython,
  siHono,
  siSolid,
  siTailwindcss,
  siShadcnui
];

const SIZE = 60;

export default function Playground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !container || !ctx) return;

    const icon = new Image();

    let x = 40;
    let y = 40;
    let vx = 100;
    let vy = 100;
    let width = 0;
    let height = 0;
    let iconIndex = 0;
    let frame = 0;
    let previous = performance.now();

    const loadIcon = () => {
      const { path, hex } = ICONS[iconIndex]!;

      icon.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path fill="#${hex}" d="${path}"/>
        </svg>
      `)}`;
    };

    const nextIcon = () => {
      let next = iconIndex;

      while (next === iconIndex) {
        next = Math.floor(Math.random() * ICONS.length);
      }

      iconIndex = next;
      loadIcon();
    };

    const resize = () => {
      const { width: w, height: h } = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      width = w;
      height = h;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      x = Math.max(0, Math.min(x, width - SIZE));
      y = Math.max(0, Math.min(y, height - SIZE));
    };

    const draw = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;

      x += vx * dt;
      y += vy * dt;

      let hit = false;

      if (x <= 0 && vx < 0) {
        x = 0;
        vx *= -1;
        hit = true;
      } else if (x + SIZE >= width && vx > 0) {
        x = width - SIZE;
        vx *= -1;
        hit = true;
      }

      if (y <= 0 && vy < 0) {
        y = 0;
        vy *= -1;
        hit = true;
      } else if (y + SIZE >= height && vy > 0) {
        y = height - SIZE;
        vy *= -1;
        hit = true;
      }

      if (hit) nextIcon();

      ctx.clearRect(0, 0, width, height);

      ctx.beginPath();
      ctx.roundRect(x, y, SIZE, SIZE, 8);
      ctx.fillStyle = "rgba(245, 245, 245, 0.9)";
      ctx.fill();
      ctx.strokeStyle = "rgba(64, 64, 64, 0.8)";
      ctx.stroke();

      if (icon.complete) {
        ctx.drawImage(icon, x + 7, y + 7, SIZE - 14, SIZE - 14);
      }

      frame = requestAnimationFrame(draw);
    };

    resize();
    loadIcon();
    frame = requestAnimationFrame(draw);

    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <section className="mt-1 scroll-mt-24">
      <div
        ref={containerRef}
        className="mt-2 h-72 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950"
      >
        <canvas ref={canvasRef} />
      </div>
    </section>
  );
}
