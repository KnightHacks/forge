"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";

import { Badge } from "../../../../../packages/ui/src/badge";
import { Button } from "../../../../../packages/ui/src/button";

// 1. literally just UI/UX buzz words
const BUZZWORDS = [
  "React",
  "JavaScript",
  "TypeScript",
  "HTML",
  "CSS",
  "Frontend",
  "Components",
  "Hooks",
  "State",
  "Routing",
  "APIs",
  "GraphQL",
  "Optimization",
  "Horse",
  "Horse",
  "Horse",
  "Horse",
  "Horse",
  "Horse",
  "Testing",
  "Debugging",
  "Git",
  "CI",
  "Deployment",
  "Automation",
  "Research",
  "Documentation",
];

const SLICE_IMAGES = [
  "/anden_herman/slice0.png", // z=0
  "/anden_herman/slice1.png", // z=1
  "/anden_herman/slice2.png", // z=2
  "/anden_herman/slice3.png", // z=3
];

const CHECKPOINTS = {
  README: 0,
  profile: 5,
  skills: 10,
  experience: 15,
  links: 20,
  end: 25,
};

export default function Page() {
  const { resolvedTheme } = useTheme();
  // Prevent page scroll when using the trail
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);
  const [z, setZ] = useState(0);
  const [activeSign, setActiveSign] = useState<string | null>(null);
  const [exitTransition, setExitTransition] = useState<string>("");
  const [bubbles, setBubbles] = useState(() =>
    Array.from({ length: 18 }, (_, i) => makeBubble(i)),
  );

  // Helper to create a bubble
  function makeBubble(id: number) {
    const word = BUZZWORDS[id % BUZZWORDS.length];
    return {
      id,
      word,
      x: Math.random() * 100, // percent
      y: 100 + Math.random() * 20,
      speed: 0.15 + Math.random() * 0.15,
      popped: false,
      size: 48 + Math.random() * 32,
    };
  }

  useEffect(() => {
    if (activeSign) return;
    const moveInterval = setInterval(() => {
      setBubbles((prev) =>
        prev.map((b) => {
          if (b.popped) return b;
          const newY = b.y - b.speed;

          const frameLeft = 50 - (320 / window.innerWidth) * 100;
          const frameRight = 50 + (320 / window.innerWidth) * 100;
          if (newY < 50 && b.x > frameLeft && b.x < frameRight) {
            return { ...b, popped: true };
          }
          if (newY < -10) {
            return makeBubble(b.id);
          }
          return { ...b, y: newY };
        }),
      );
    }, 30);
    // Add a new bubble
    const addInterval = setInterval(() => {
      setBubbles((prev) => {
        const nextId = prev.length ? Math.max(...prev.map((b) => b.id)) + 1 : 0;
        return [...prev, makeBubble(nextId)];
      });
    }, 5000);
    return () => {
      clearInterval(moveInterval);
      clearInterval(addInterval);
    };
  }, [activeSign]);

  // Pop bubble
  const popBubble = (id: number) => {
    setBubbles((prev) =>
      prev.map((b) => (b.id === id ? { ...b, popped: true } : b)),
    );
    setTimeout(() => {
      setBubbles((prev) => prev.map((b) => (b.id === id ? makeBubble(id) : b)));
    }, 400);
  };

  // Lock scroll and use wheel/keys for movement lowkey highkey does not work at all
  useEffect(() => {
    const preventScroll = (e: Event) => e.preventDefault();
    window.addEventListener("scroll", preventScroll, { passive: false });
    return () => window.removeEventListener("scroll", preventScroll);
  }, []);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (activeSign) return;
      const step = Math.sign(e.deltaY);
      if (Math.abs(e.deltaY) > 10) {
        setZ((prev) => Math.max(0, Math.min(prev + step, 100)));
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (activeSign) return;
      if (e.key === "ArrowUp" || e.key === "w")
        setZ((prev) => Math.min(prev + 1, 100));
      if (e.key === "ArrowDown" || e.key === "s")
        setZ((prev) => Math.max(prev - 1, 0));
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [activeSign]);

  // Helper to get the image

  const getSliceImage = (z: number): string => {
    const idx = z % SLICE_IMAGES.length;
    return SLICE_IMAGES[idx] ?? SLICE_IMAGES[0] ?? "";
  };

  const SLICE_COUNT = 5;

  const sliceScales = Array.from(
    { length: SLICE_COUNT },
    (_, i) => 1 - i * 0.09,
  ); // 1, 0.91, ...
  const sliceYOffsets = Array.from({ length: SLICE_COUNT }, (_, i) => i); // 0, 5, 10, ...
  const sliceOpacities = Array.from(
    { length: SLICE_COUNT },
    (_, i) => 1 - i * 0.11,
  ); // 1, 0.89, ...
  const slicesToRender = Array.from({ length: SLICE_COUNT }, (_, offset) => ({
    imgSrc: getSliceImage(z + offset),
    z: z + offset,
    scale: sliceScales[offset],
    yOffset: sliceYOffsets[offset],
    opacity: sliceOpacities[offset],
  }));

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden">
      {/* woah more bubble stuff */}
      {!activeSign && (
        <div
          className="absolute inset-0 z-0"
          style={{
            background: resolvedTheme === "dark" ? "#111" : "#fff",
            transition: "background 0.3s",
          }}
        >
          {bubbles.map(
            (b) =>
              !b.popped && (
                <div
                  key={b.id}
                  onClick={() => popBubble(b.id)}
                  style={{
                    position: "absolute",
                    left: `${b.x}%`,
                    bottom: `${b.y}%`,
                    width: b.size,
                    height: b.size,
                    borderRadius: "50%",
                    background: resolvedTheme === "dark" ? "#fff" : "#111",
                    boxShadow:
                      resolvedTheme === "dark"
                        ? "0 2px 16px #fff8"
                        : "0 2px 16px #1118",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    color: resolvedTheme === "dark" ? "#111" : "#fff",
                    cursor: "pointer",
                    userSelect: "none",
                    opacity: 0.92,
                    transition:
                      "opacity 0.4s, transform 0.4s, background 0.3s, color 0.3s",
                    zIndex: 2,
                    border:
                      resolvedTheme === "dark"
                        ? "2px solid #eee"
                        : "2px solid #222",
                    transform: "scale(1)",
                    overflow: "hidden",
                    textAlign: "center",
                  }}
                >
                  <span
                    key={(b.word ?? "Bubble") + b.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "90%",
                      height: "90%",
                      margin: "auto",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontSize: `min(${Math.max(12, (b.size * 0.85) / ((b.word || "Bubble").length || 1))}px, ${b.size * 0.38}px)`,
                      lineHeight: 1.1,
                      fontWeight: 700,
                    }}
                  >
                    {b.word || "Bubble"}
                  </span>
                </div>
              ),
          )}
        </div>
      )}
      {/* Trail background thing */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-0"
        style={{
          width: 640,
          height: 640,
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 120px 40px #000 inset, 0 0 0 16px #3a2c1a inset",
          borderRadius: 32,
          background: "linear-gradient(160deg, #176a3a 0%, #1a2a1a 100%)",
        }}
      >
        {/* Forge UI Badge for bonus points */}
        <div
          style={{ position: "absolute", right: 24, bottom: 24, zIndex: 100 }}
        >
          <Badge variant="secondary">Powered by Forge UI</Badge>
        </div>
      </div>
      {/* Trail container with smooth slide */}
      <div
        className="relative transition-transform duration-700"
        style={{
          width: 640,
          height: 640,
          transform: activeSign ? "translateX(-220px)" : "translateX(0)",
        }}
      >
        {slicesToRender.map(
          ({ imgSrc, z: sliceZ, scale, yOffset, opacity }, i) => (
            <div
              key={sliceZ}
              style={{
                position: "absolute",
                left: "50%",
                top: `calc(50% + ${yOffset}px)`,
                transform: `translate(-50%, -50%) scale(${scale})`,
                zIndex: 10 - i,
                opacity,
                width: 640 * 1,
                height: 640 * 1,
                pointerEvents: "auto",
              }}
            >
              <Image
                src={imgSrc}
                alt={`Slice ${sliceZ}`}
                width={640 * 1}
                height={640 * 1}
                style={{ width: 640 * 1, height: 640 * 1, display: "block" }}
                draggable={false}
              />
              {/* Trail signs at checkpoints */}
              {Object.entries(CHECKPOINTS).map(([key, value]) =>
                sliceZ === value ? (
                  <div
                    key={key}
                    className={`group absolute left-1/2 top-2/3 z-30 -translate-x-1/2 -translate-y-1/2 cursor-pointer`}
                    style={{ width: 80, height: 80, pointerEvents: "auto" }}
                    onClick={() => setActiveSign(key)}
                    title={key
                      .replace(/^[a-z]/, (c) => c.toUpperCase())
                      .replace("_", " ")}
                  >
                    <Image
                      src="/anden_herman/trailsign.png"
                      alt={key}
                      width={80}
                      height={80}
                      style={{
                        width: 80,
                        height: 80,
                        objectFit: "contain",
                        filter:
                          z === value
                            ? "drop-shadow(0 0 24px #ffe066) drop-shadow(0 0 8px #fff) brightness(1.2)"
                            : "drop-shadow(0 2px 8px #000a)",
                        transition: "filter 0.4s cubic-bezier(.77,0,.18,1)",
                        animation:
                          z === value ? "pulse-sign 1.2s infinite" : "none",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "110%",
                        transform: "translateX(-50%)",
                        color: z === value ? "#ffe066" : "#fff8c0",
                        fontWeight: 700,
                        fontSize: 16,
                        textShadow:
                          z === value
                            ? "0 0 12px #ffe066, 2px 2px 6px #000"
                            : "2px 2px 6px #000",
                        fontFamily: "serif",
                        letterSpacing: "0.04em",
                        transition: "color 0.4s",
                      }}
                    >
                      {key
                        .replace(/^[a-z]/, (c) => c.toUpperCase())
                        .replace("_", " ")}
                    </span>
                    <style>{`
                    @keyframes pulse-sign {
                      0% { filter: drop-shadow(0 0 24px #ffe066) drop-shadow(0 0 8px #fff) brightness(1.2); }
                      50% { filter: drop-shadow(0 0 40px #ffe066) drop-shadow(0 0 16px #fff) brightness(1.4); }
                      100% { filter: drop-shadow(0 0 24px #ffe066) drop-shadow(0 0 8px #fff) brightness(1.2); }
                    }
                  `}</style>
                  </div>
                ) : null,
              )}
            </div>
          ),
        )}
      </div>
      {/* SVG Flood effect page transition */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-700 ${activeSign ? "pointer-events-auto" : "pointer-events-none opacity-0"}`}
        style={{
          background: "transparent",
        }}
      >
        {/* attempting more transtion effect */}
        <svg
          className={`absolute inset-0 z-40 h-full w-full transition-all duration-700 ${activeSign ? "flood-in" : "flood-out"}`}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ display: "block", pointerEvents: "none" }}
        >
          <path
            id="flood-path"
            d={
              activeSign || exitTransition
                ? "M0,0 Q50,10 100,0 L100,100 Q50,90 0,100 Z" // Flooded
                : "M0,0 Q50,0 100,0 L100,0 Q50,0 0,0 Z" // Hidden
            }
            fill={exitTransition ? "#222" : activeSign ? "#000000" : "#000"}
            style={{ transition: "all 0.7s cubic-bezier(.77,0,.18,1)" }}
          />
        </svg>
        {/* Info page content */}
        {activeSign && (
          <div
            className="absolute inset-0 z-50 flex h-full w-full flex-col items-center justify-center overflow-hidden"
            style={{ animation: "fadein 1.2s" }}
          >
            {/* pretty sure this transition doesnt work */}
            <div
              className={`pointer-events-none absolute inset-0 z-40 h-full w-full ${activeSign ? "page-in" : exitTransition}`}
              style={{
                transition: "all 0.7s cubic-bezier(.77,0,.18,1)",
                background: activeSign ? "transparent" : "var(--exit-bg)",
              }}
            />
            {/* README: Terminal/retro style */}
            {activeSign === "README" && (
              <div
                className="animate-pop-in flex h-full w-full flex-col items-center justify-center border-8 border-green-400 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 p-12 font-mono text-green-400 shadow-2xl"
                style={{
                  boxShadow: "0 0 64px #0f0, 0 0 32px #fff3",
                  position: "relative",
                }}
              >
                <button
                  className="group absolute left-8 top-8 flex flex-col items-center"
                  style={{
                    zIndex: 101,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setExitTransition("page-out-readme");
                    setTimeout(() => {
                      setActiveSign(null);
                      setExitTransition("");
                    }, 700);
                  }}
                  aria-label="Go Back"
                >
                  <Image
                    src="/anden_herman/trailsign.png"
                    alt="Go Back"
                    width={64}
                    height={64}
                    style={{
                      transform: "scaleY(-1)",
                      filter: "drop-shadow(0 0 8px #0f08)",
                    }}
                  />
                  <span className="mt-1 text-lg font-bold text-green-300 group-hover:underline">
                    Go Back
                  </span>
                </button>
                <div className="animate-blink mb-4 text-2xl tracking-widest">
                  $ cat README.TXT
                </div>
                <h2 className="animate-terminal-title mb-8 text-6xl font-extrabold tracking-tight">
                  WELCOME
                </h2>
                <p className="mb-8 text-2xl">
                  Welcome to my portfolio!
                  <br />
                  To interact with the trail, scroll or use arrow keys
                </p>
                <div className="animate-blink text-xl italic text-green-300">
                  “I had a vision for a site, and it was much less cool when I
                  put it together”
                </div>
                {/* Forge UI Button */}
                <div className="mt-8">
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => alert("You found the Forge UI Button!")}
                  >
                    Forge UI Button: Click Me!
                  </Button>
                </div>
              </div>
            )}
            {/* glassmorphism is the buzzword here */}
            {activeSign === "profile" && (
              <div
                className="animate-pop-in flex h-full w-full flex-col items-center justify-center rounded-3xl border-8 border-blue-400 bg-gradient-to-br from-blue-200/80 via-white/80 to-pink-100/80 p-12 shadow-2xl backdrop-blur-2xl"
                style={{
                  boxShadow: "0 0 64px #a0c4ff, 0 0 32px #fffbe6",
                  position: "relative",
                }}
              >
                <button
                  className="group absolute left-8 top-8 flex flex-col items-center"
                  style={{
                    zIndex: 101,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setExitTransition("page-out-profile");
                    setTimeout(() => {
                      setActiveSign(null);
                      setExitTransition("");
                    }, 700);
                  }}
                  aria-label="Go Back"
                >
                  <Image
                    src="/anden_herman/trailsign.png"
                    alt="Go Back"
                    width={64}
                    height={64}
                    style={{
                      transform: "scaleY(-1)",
                      filter: "drop-shadow(0 0 8px #2196f3)",
                    }}
                  />
                  <span className="mt-1 text-lg font-bold text-blue-700 group-hover:underline">
                    Go Back
                  </span>
                </button>
                <h2 className="animate-profile-title mb-6 font-serif text-7xl font-extrabold tracking-tight text-blue-900 drop-shadow-2xl">
                  Traveler Profile
                </h2>
                <div className="flex flex-row items-center gap-12">
                  <Image
                    src="/anden_herman/profile.png"
                    alt="Profile"
                    width={192}
                    height={192}
                    className="animate-profile-img h-48 w-48 rounded-full border-4 border-blue-400 object-cover shadow-xl"
                  />
                  <div className="flex flex-col gap-2 font-mono text-3xl text-blue-900">
                    <span>Anden Herman</span>
                    <span>UCF co 2029</span>
                    <span>
                      Runner & Biker | T-shirt fanatic | Codes and Stuff
                    </span>
                  </div>
                </div>
                <div className="mt-8 animate-pulse text-2xl font-black italic text-blue-700">
                  “Soda Burps”
                </div>
              </div>
            )}
            {/* Skills */}
            {activeSign === "skills" && (
              <div
                className="animate-pop-in relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-3xl border-8 border-pink-500 bg-black p-12 shadow-2xl"
                style={{
                  boxShadow: "0 0 64px #f15bb5, 0 0 32px #fff3",
                  position: "relative",
                }}
              >
                <button
                  className="group absolute left-8 top-8 flex flex-col items-center"
                  style={{
                    zIndex: 101,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setExitTransition("page-out-skills");
                    setTimeout(() => {
                      setActiveSign(null);
                      setExitTransition("");
                    }, 700);
                  }}
                  aria-label="Go Back"
                >
                  <Image
                    src="/anden_herman/trailsign.png"
                    alt="Go Back"
                    width={64}
                    height={64}
                    style={{
                      transform: "scaleY(-1)",
                      filter: "drop-shadow(0 0 8px #f15bb5)",
                    }}
                  />
                  <span className="mt-1 text-lg font-bold text-pink-400 group-hover:underline">
                    Go Back
                  </span>
                </button>
                <div className="animate-cyber-grid pointer-events-none absolute inset-0 z-0" />
                <h2 className="animate-cyber-title mb-6 font-mono text-7xl font-extrabold tracking-tight text-pink-500 drop-shadow-2xl">
                  Skills Perhaps
                </h2>
                <div className="animate-cyber-list z-10 grid grid-cols-2 gap-8 font-mono text-3xl text-cyan-200">
                  <span>Next.Js</span>
                  <span>React</span>
                  <span>Tailwind CSS</span>
                  <span>UI/UX</span>
                  <span>Design</span>
                  <span>JavaScript</span>
                  <span>TypeScript</span>
                  <span>Git</span>
                </div>
                <div className="z-10 mt-8 animate-pulse text-2xl font-black italic text-pink-400">
                  “And Speedy Development. Slapped this together in 2 days.”
                </div>
                <style>{`
                  .animate-cyber-grid::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: repeating-linear-gradient(90deg, #0ff2 0 2px, transparent 2px 40px), repeating-linear-gradient(0deg, #0ff2 0 2px, transparent 2px 40px);
                    opacity: 0.18;
                    z-index: 0;
                  }
                `}</style>
              </div>
            )}
            {/* Experience */}
            {activeSign === "experience" && (
              <div
                className="animate-pop-in flex h-full w-full flex-col items-center justify-center rounded-3xl border-8 border-orange-400 bg-gradient-to-br from-yellow-100 via-orange-100 to-pink-200 p-12 font-serif shadow-2xl"
                style={{
                  boxShadow: "0 0 64px #ffb347, 0 0 32px #fff3",
                  position: "relative",
                }}
              >
                <button
                  className="group absolute left-8 top-8 flex flex-col items-center"
                  style={{
                    zIndex: 101,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setExitTransition("page-out-experience");
                    setTimeout(() => {
                      setActiveSign(null);
                      setExitTransition("");
                    }, 700);
                  }}
                  aria-label="Go Back"
                >
                  <Image
                    src="/anden_herman/trailsign.png"
                    alt="Go Back"
                    width={64}
                    height={64}
                    style={{
                      transform: "scaleY(-1)",
                      filter: "drop-shadow(0 0 8px #ffb347)",
                    }}
                  />
                  <span className="mt-1 text-lg font-bold text-orange-700 group-hover:underline">
                    Go Back
                  </span>
                </button>
                <div className="animate-scroll-paper relative w-full max-w-2xl rounded-2xl border-4 border-yellow-300 bg-white/90 p-8 shadow-xl">
                  <h2 className="animate-scroll-title mb-4 text-6xl font-extrabold tracking-tight text-orange-700 drop-shadow-2xl">
                    Expedition Log
                  </h2>
                  <p className="animate-scroll-text font-mono text-2xl text-gray-800">
                    Programmed several frontend interfaces using React, next.js,
                    and html
                  </p>
                  <p className="animate-scroll-text mt-4 font-mono text-2xl text-gray-700">
                    Have implemented several APIs, including GraphQL and Stripe
                  </p>
                  <p className="animate-scroll-text mt-4 font-mono text-2xl text-gray-600">
                    Rewrote a VESC firmware for integration with standarly
                    noncompatable motors.
                  </p>
                  <div className="mt-8 animate-pulse text-xl font-black italic text-orange-700">
                    “Wowzers this guy is good”
                  </div>
                  <div className="animate-scroll-tab absolute -top-8 left-1/2 h-8 w-32 -translate-x-1/2 rounded-b-2xl bg-yellow-300 shadow-md" />
                  <div className="animate-scroll-tab absolute -bottom-8 left-1/2 h-8 w-32 -translate-x-1/2 rounded-t-2xl bg-yellow-300 shadow-md" />
                </div>
              </div>
            )}
            {/* Links */}
            {activeSign === "links" && (
              <div
                className="animate-pop-in flex h-full w-full flex-col items-center justify-center rounded-3xl border-8 border-purple-600 bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900 p-12 shadow-2xl"
                style={{
                  boxShadow: "0 0 64px #a0c4ff, 0 0 32px #fffbe6",
                  position: "relative",
                }}
              >
                <button
                  className="group absolute left-8 top-8 flex flex-col items-center"
                  style={{
                    zIndex: 101,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setExitTransition("page-out-links");
                    setTimeout(() => {
                      setActiveSign(null);
                      setExitTransition("");
                    }, 700);
                  }}
                  aria-label="Go Back"
                >
                  <Image
                    src="/anden_herman/trailsign.png"
                    alt="Go Back"
                    width={64}
                    height={64}
                    style={{
                      transform: "scaleY(-1)",
                      filter: "drop-shadow(0 0 8px #a0c4ff)",
                    }}
                  />
                  <span className="mt-1 text-lg font-bold text-purple-200 group-hover:underline">
                    Go Back
                  </span>
                </button>
                <div className="animate-portal-glow relative flex flex-col items-center gap-8 rounded-2xl border-4 border-purple-400 bg-white/10 p-12 shadow-xl">
                  <h2 className="animate-portal-title mb-6 font-mono text-7xl font-extrabold tracking-tight text-purple-200 drop-shadow-2xl">
                    Mystical Portals
                  </h2>
                  <div className="mt-4 flex flex-col gap-6">
                    <a
                      href="https://github.com/Xqudd"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="animate-link-wiggle text-4xl font-extrabold text-green-300 hover:underline"
                    >
                      GitHub
                    </a>
                    <a
                      href="https://www.linkedin.com/in/anden-herman/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="animate-link-wiggle text-4xl font-extrabold text-blue-300 hover:underline"
                    >
                      LinkedIn
                    </a>
                    <a
                      href="https://www.andenwebsite.com/portfolio"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="animate-link-wiggle text-4xl font-extrabold text-yellow-200 hover:underline"
                    >
                      Other Portfolio
                    </a>
                    <a
                      href="https://www.andenwebsite.com/shop"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="animate-link-wiggle text-4xl font-extrabold text-orange-300 hover:underline"
                    >
                      Webstore I made
                    </a>
                  </div>
                  <div className="mt-8 animate-pulse text-2xl font-black italic text-purple-200">
                    “go check me out twin”
                  </div>
                </div>
              </div>
            )}
            {/* I lowkey stole this fade effect 🔥 */}
            {activeSign === "end" && (
              <div
                className="animate-pop-in flex h-full w-full flex-col items-center justify-center rounded-3xl border-8 border-gray-400 bg-gradient-to-br from-gray-100 via-gray-300 to-gray-200 p-12 shadow-2xl"
                style={{
                  boxShadow: "0 0 64px #bbb, 0 0 32px #fff3",
                  position: "relative",
                }}
              >
                <button
                  className="group absolute left-8 top-8 flex flex-col items-center"
                  style={{
                    zIndex: 101,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setExitTransition("page-out-end");
                    setTimeout(() => {
                      setActiveSign(null);
                      setExitTransition("");
                    }, 700);
                  }}
                  aria-label="Go Back"
                >
                  <Image
                    src="/anden_herman/trailsign.png"
                    alt="Go Back"
                    width={64}
                    height={64}
                    style={{
                      transform: "scaleY(-1)",
                      filter: "drop-shadow(0 0 8px #bbb)",
                    }}
                  />
                  <span className="mt-1 text-lg font-bold text-gray-700 group-hover:underline">
                    Go Back
                  </span>
                </button>
                <h2 className="animate-end-title mb-6 font-serif text-7xl font-extrabold tracking-tight text-gray-700 drop-shadow-2xl">
                  Trail's End
                </h2>
                <p className="animate-bounce font-mono text-3xl text-gray-600">
                  Thanks for visiting!
                </p>
                <div className="mt-8 animate-pulse text-2xl font-black italic text-gray-700">
                  Come back soon
                </div>
              </div>
            )}{" "}
            {/* Pretty sure half of this doesn't work */}
            <style>{`
              @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
              @keyframes page-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
              /* New bold exit transitions for each info page */
              @keyframes page-out-readme {
                0% { opacity: 1; transform: scale(1) rotate(0deg); filter: none; background: #222; }
                60% { opacity: 0.7; transform: scale(1.15) rotate(-8deg); filter: blur(2px) brightness(1.2); background: #0f0; }
                100% { opacity: 0; transform: scale(1.3) rotate(-16deg); filter: blur(8px) brightness(2); background: #0f0; }
              }
              @keyframes page-out-profile {
                0% { opacity: 1; transform: scale(1) rotate(0deg); filter: none; background: #fff; }
                60% { opacity: 0.7; transform: scale(1.15) rotate(8deg); filter: blur(2px) brightness(1.2); background: #2196f3; }
                100% { opacity: 0; transform: scale(1.3) rotate(16deg); filter: blur(8px) brightness(2); background: #2196f3; }
              }
              @keyframes page-out-skills {
                0% { opacity: 1; transform: scale(1) skewX(0deg); filter: none; background: #000; }
                60% { opacity: 0.7; transform: scale(1.15) skewX(-12deg); filter: blur(2px) brightness(1.2); background: #f15bb5; }
                100% { opacity: 0; transform: scale(1.3) skewX(-24deg); filter: blur(8px) brightness(2); background: #f15bb5; }
              }
              @keyframes page-out-experience {
                0% { opacity: 1; transform: scale(1) skewY(0deg); filter: none; background: #fffbe6; }
                60% { opacity: 0.7; transform: scale(1.15) skewY(12deg); filter: blur(2px) brightness(1.2); background: #ffb347; }
                100% { opacity: 0; transform: scale(1.3) skewY(24deg); filter: blur(8px) brightness(2); background: #ffb347; }
              }
              @keyframes page-out-links {
                0% { opacity: 1; transform: scale(1) rotate(0deg); filter: none; background: #a0c4ff; }
                60% { opacity: 0.7; transform: scale(1.15) rotate(-12deg); filter: blur(2px) brightness(1.2); background: #4b2e83; }
                100% { opacity: 0; transform: scale(1.3) rotate(-24deg); filter: blur(8px) brightness(2); background: #4b2e83; }
              }
              @keyframes page-out-end {
                0% { opacity: 1; transform: scale(1) rotate(0deg); filter: none; background: #bbb; }
                60% { opacity: 0.7; transform: scale(1.15) rotate(12deg); filter: blur(2px) brightness(1.2); background: #222; }
                100% { opacity: 0; transform: scale(1.3) rotate(24deg); filter: blur(8px) brightness(2); background: #222; }
              }
              .page-in { animation: page-in 0.7s cubic-bezier(.77,0,.18,1); }
              .page-out-readme { animation: page-out-readme 0.7s cubic-bezier(.77,0,.18,1); --exit-bg: #0f0; }
              .page-out-profile { animation: page-out-profile 0.7s cubic-bezier(.77,0,.18,1); --exit-bg: #2196f3; }
              .page-out-skills { animation: page-out-skills 0.7s cubic-bezier(.77,0,.18,1); --exit-bg: #f15bb5; }
              .page-out-experience { animation: page-out-experience 0.7s cubic-bezier(.77,0,.18,1); --exit-bg: #ffb347; }
              .page-out-links { animation: page-out-links 0.7s cubic-bezier(.77,0,.18,1); --exit-bg: #4b2e83; }
              .page-out-end { animation: page-out-end 0.7s cubic-bezier(.77,0,.18,1); --exit-bg: #222; }
              @keyframes wiggle { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
              .animate-wiggle { animation: wiggle 1.2s infinite; }
              @keyframes pop-in { 0% { transform: scale(0.7) rotate(-8deg); opacity: 0; } 80% { transform: scale(1.1) rotate(2deg); opacity: 1; } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
              .animate-pop-in { animation: pop-in 0.8s cubic-bezier(.77,0,.18,1); }
              @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
              .animate-blink { animation: blink 1.2s step-end infinite; }
              @keyframes terminal-title { 0% { color: #0f0; } 100% { color: #0f0; text-shadow: 0 0 16px #0f08; } }
              .animate-terminal-title { animation: terminal-title 2s infinite alternate; }
              @keyframes profile-title { 0% { color: #2196f3; } 100% { color: #1a237e; text-shadow: 0 0 16px #a0c4ff; } }
              .animate-profile-title { animation: profile-title 2s infinite alternate; }
              @keyframes profile-img { 0% { filter: grayscale(1) blur(2px); } 100% { filter: grayscale(0) blur(0); } }
              .animate-profile-img { animation: profile-img 1.2s cubic-bezier(.77,0,.18,1) forwards; }
              @keyframes cyber-title { 0% { color: #0ff; } 100% { color: #f15bb5; text-shadow: 0 0 16px #0ff8; } }
              .animate-cyber-title { animation: cyber-title 2s infinite alternate; }
              @keyframes cyber-list { 0% { color: #0ff; } 100% { color: #fff; } }
              .animate-cyber-list span { animation: cyber-list 2s infinite alternate; }
              @keyframes scroll-title { 0% { color: #ffb347; } 100% { color: #ff6f00; text-shadow: 0 0 16px #ffb347; } }
              .animate-scroll-title { animation: scroll-title 2s infinite alternate; }
              @keyframes scroll-paper { 0% { box-shadow: 0 0 0 #ffb347; } 100% { box-shadow: 0 0 32px #ffb347; } }
              .animate-scroll-paper { animation: scroll-paper 2s infinite alternate; }
              @keyframes scroll-tab { 0% { background: #ffe066; } 100% { background: #ffb347; } }
              .animate-scroll-tab { animation: scroll-tab 2s infinite alternate; }
              @keyframes scroll-text { 0% { color: #ffb347; } 100% { color: #ff6f00; } }
              .animate-scroll-text { animation: scroll-text 2s infinite alternate; }
              @keyframes portal-title { 0% { color: #a0c4ff; } 100% { color: #f15bb5; text-shadow: 0 0 16px #a0c4ff; } }
              .animate-portal-title { animation: portal-title 2s infinite alternate; }
              @keyframes portal-glow { 0% { box-shadow: 0 0 0 #a0c4ff; } 100% { box-shadow: 0 0 32px #a0c4ff; } }
              .animate-portal-glow { animation: portal-glow 2s infinite alternate; }
              @keyframes end-title { 0% { color: #bbb; } 100% { color: #888; text-shadow: 0 0 16px #bbb; } }
              .animate-end-title { animation: end-title 2s infinite alternate; }
              @keyframes link-wiggle { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
              .animate-link-wiggle:hover { animation: link-wiggle 0.7s; }
              @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
              .animate-bounce { animation: bounce 1.2s infinite; }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}
