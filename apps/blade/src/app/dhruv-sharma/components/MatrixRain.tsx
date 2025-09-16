import { useEffect, useRef } from "react";

const MatrixRain: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars =
      "KNIGHTHACKS♦◊◘○●◙♠♣♥♦★☆✦✧✩✪✫❀❁JOB❂❃✻✼✽✾✿❀❁JOB❂❃❄❅❆❀❁JOB❂❃◕◖◗◘◙◚◛◜❀❁JOB❂❃◬◭◮◯◰◱◲◳◴◵◶◷◸◹◺◻◼◽◾◿";
    const fontSize = 35;
    const columns = canvas.width / fontSize;
    const drops: number[] = new Array(Math.floor(columns)).fill(1) as number[];
    const speeds: number[] = new Array(Math.floor(columns))
      .fill(0)
      .map(() => Math.random() * 2 + 0.5);

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;

      drops.forEach((y, i) => {
        const hue = (i * 15 + Date.now() * 0.05) % 360;
        const saturation = 70 + Math.sin(Date.now() * 0.001 + i) * 20;
        const lightness = 50 + Math.cos(Date.now() * 0.002 + i) * 25;
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        const text = chars[Math.floor(Math.random() * chars.length)] || "★";
        ctx.fillText(text, i * fontSize, y * fontSize);
        if (y * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
          speeds[i] = Math.random() * 2 + 0.5;
        }
        if (drops[i] !== undefined && speeds[i] !== undefined) {
          drops[i] += speeds[i];
        }
      });
    };

    const interval = setInterval(draw, 35);
    return () => clearInterval(interval);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 opacity-20"
    />
  );
};

export default MatrixRain;
