/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unsafe-call */
"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Sparkles, Trophy, Volume2, VolumeX } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Card } from "@forge/ui/card";

interface RaffleEntry {
  memberId: string;
  firstName: string;
  lastName: string;
  points: number;
}

export default function RaffleDraw({ entries }: { entries: RaffleEntry[] }) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentEntryIndex, setCurrentEntryIndex] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(50);
  const [winner, setWinner] = useState<RaffleEntry | null>(null);
  const [visibleEntries, setVisibleEntries] = useState<RaffleEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shuffledEntries, setShuffledEntries] = useState<RaffleEntry[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Audio context refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const winnerSoundRef = useRef<OscillatorNode | null>(null);

  /* ------------------------------------------------------------------ */
  /*  AudioContext lifecycle                                            */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    // Create the context on first mount, or recreate if it was closed
    if (typeof window !== "undefined") {
      if (
        !audioContextRef.current ||
        audioContextRef.current.state === "closed"
      ) {
        audioContextRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      }
    }

    // In React‑18 Strict Mode the component mounts twice in dev;
    // closing the context here would silence the second mount, so skip it.
    return () => {};
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Sound helpers                                                     */
  /* ------------------------------------------------------------------ */

  // Tick on every “spin” step
  const playTickSound = () => {
    if (!soundEnabled || !audioContextRef.current) return;
    const ctx = audioContextRef.current;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Pitch scales with speed (faster spin → higher pitch)
    const maxPitch = 880; // Hz
    const minPitch = 220; // Hz
    const speedRange = 1000 - 25;
    const normalized =
      Math.min(Math.max(animationSpeed - 25, 0), speedRange) / speedRange;
    const pitch = maxPitch - normalized * (maxPitch - minPitch);

    osc.type = "square"; // sharper click than sine
    osc.frequency.value = pitch;

    // Louder, short envelope
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc.start();
    osc.stop(ctx.currentTime + 0.18);

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  };

  // Fan‑fare for winner
  const playWinnerSound = () => {
    if (!soundEnabled || !audioContextRef.current) return;
    const ctx = audioContextRef.current;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "triangle";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.2);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.3);
    osc.frequency.linearRampToValueAtTime(990, ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.5);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);

    osc.start();
    osc.stop(ctx.currentTime + 0.8);
    winnerSoundRef.current = osc;

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      winnerSoundRef.current = null;
    };
  };

  /* ------------------------------------------------------------------ */
  /*  Raffle helpers                                                    */
  /* ------------------------------------------------------------------ */
  const shuffleArray = (array: RaffleEntry[]) => {
    const MAX_ATTEMPTS = 1000; // reasonable for a raffle‑sized list
    const arr = [...array];

    const fisherYates = (a: RaffleEntry[]) => {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        if (a[i] && a[j]) {
          [a[i], a[j]] = [a[j], a[i]!];
        }
      }
    };

    const adjacentOK = (a: RaffleEntry[]) => {
      for (let i = 1; i < a.length; i++) {
        if (a[i]?.memberId === a[i - 1]?.memberId) return false;
      }
      return true;
    };

    // 1️⃣  Try up to MAX_ATTEMPTS full shuffles
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      fisherYates(arr);
      if (adjacentOK(arr)) return arr;
    }

    // 2️⃣  Greedy post‑processing (rarely needed)
    for (let i = 1; i < arr.length; i++) {
      if (arr[i]?.memberId === arr[i - 1]?.memberId) {
        // Find the nearest swap candidate that doesn’t create another conflict
        for (let j = i + 1; j < arr.length; j++) {
          const leftOK = arr[j]?.memberId !== arr[i - 1]?.memberId;
          const rightOK =
            j === i + 1 || arr[j]?.memberId !== arr[i + 1]?.memberId;
          if (leftOK && rightOK && arr[j] && arr[i]) {
            [arr[i], arr[j]] = [arr[j]!, arr[i]!];
            break;
          }
        }
      }
    }

    // 3️⃣  Final guarantee (may still fail if mathematically impossible)
    return arr;
  };

  const startDraw = () => {
    if (entries.length === 0) return;

    // Some browsers suspend contexts until user gesture
    if (audioContextRef.current?.state === "suspended") {
      void audioContextRef.current.resume();
    }

    setIsDrawing(true);
    setWinner(null);
    setAnimationSpeed(25); // start fast

    const shuffled = shuffleArray(entries);
    setShuffledEntries(shuffled);

    // Pre‑fill list with 10 visible entries
    const initialVisible: RaffleEntry[] = [];
    for (let i = 0; i < 10; i++) {
      const entry = shuffled[i % shuffled.length];
      if (entry) {
        initialVisible.push(entry);
      }
    }
    setVisibleEntries(initialVisible);
    setCurrentEntryIndex(0);
  };

  /* ------------------------------------------------------------------ */
  /*  Animation loop                                                    */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!isDrawing) return;
    const timer = setTimeout(() => {
      playTickSound();

      // Rotate visible window
      setVisibleEntries((prev) => {
        const next = [...prev];
        next.shift();
        const nextIndex = (currentEntryIndex + 10) % shuffledEntries.length;
        const nextEntry = shuffledEntries[nextIndex];
        if (nextEntry) {
          next.push(nextEntry);
        }
        return next;
      });
      setCurrentEntryIndex((i) => (i + 1) % shuffledEntries.length);

      // Slow down gradually
      if (animationSpeed < 750) {
        setAnimationSpeed((s) => s * 1.025);
      } else {
        setIsDrawing(false);
        const mid = Math.floor(visibleEntries.length / 2);
        const finalEntry = visibleEntries[mid];
        setWinner(finalEntry ?? null);
        playWinnerSound();

        // Confetti
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          void confetti({
            particleCount: 150,
            spread: 90,
            origin: {
              x:
                rect.left / window.innerWidth +
                rect.width / window.innerWidth / 2,
              y: rect.top / window.innerHeight,
            },
          });
        }
      }
    }, animationSpeed);

    return () => clearTimeout(timer);
  }, [
    isDrawing,
    currentEntryIndex,
    animationSpeed,
    shuffledEntries,
    visibleEntries,
  ]);

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <div
        className="flex w-full max-w-3xl flex-col items-center"
        ref={containerRef}
      >
        <Card className="relative mb-8 w-full overflow-hidden rounded-lg border-2 border-primary bg-card p-1">
          <div className="flex h-[400px] flex-col items-center justify-center overflow-hidden">
            {/* ————————————————————————   STATES   ———————————————————————— */}
            {!isDrawing && !winner ? (
              <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center">
                <Sparkles className="h-16 w-16 text-primary" />
                <h2 className="text-2xl font-bold">Ready to Draw a Winner?</h2>
                <p className="text-muted-foreground">
                  Click the button below to start the raffle draw!
                </p>
                <p className="text-sm text-muted-foreground">
                  {entries.length} total entries from{" "}
                  {new Set(entries.map((e) => e.memberId)).size} participants
                </p>
              </div>
            ) : isDrawing ? (
              <div className="relative h-full w-full">
                {/* Fade overlays */}
                <div className="absolute left-0 top-0 z-10 h-1/4 w-full bg-gradient-to-b from-background to-transparent" />
                <div className="absolute bottom-0 left-0 z-10 h-1/4 w-full bg-gradient-to-t from-background to-transparent" />

                {/* Spinning names */}
                <div className="flex h-full flex-col items-center justify-center">
                  {visibleEntries.map((entry, index) => {
                    const center = Math.floor(visibleEntries.length / 2);
                    const isCenter = index === center;
                    const dist = Math.abs(index - center);
                    const opacity = 1 - dist * 0.2;
                    const scale = 1 - dist * 0.05;

                    return (
                      <div
                        key={`${entry.memberId}-${index}`}
                        className={`transition-all duration-${Math.floor(
                          animationSpeed,
                        )}ms ${isCenter ? "font-bold text-primary" : "text-foreground"}`}
                        style={{
                          opacity,
                          transform: `scale(${scale})`,
                          transition: `all ${animationSpeed}ms ease-out`,
                        }}
                      >
                        <span className={isCenter ? "text-4xl" : "text-3xl"}>
                          {entry.firstName} {entry.lastName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : winner ? (
              <div className="flex flex-col items-center justify-center space-y-6 p-8 text-center">
                <div className="animate-bounce">
                  <Trophy className="h-20 w-20 text-yellow-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="animate-pulse text-4xl font-bold text-primary">
                    Winner!
                  </h2>
                  <div className="mt-4 rounded-lg bg-primary/10 p-6">
                    <h3 className="text-4xl font-bold">
                      {winner.firstName} {winner.lastName}
                    </h3>
                    <p className="mt-2 text-lg font-medium">
                      {winner.points} points. Congratulations on winning the
                      $100 Amazon gift card, and thank you for participating in
                      Knight Hacks events!
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Sound toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-20 h-8 w-8 rounded-full bg-background/80 p-1.5"
            onClick={() => setSoundEnabled((s) => !s)}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
        </Card>

        {/* Controls */}
        <div className="flex gap-4">
          <Button
            size="lg"
            onClick={startDraw}
            disabled={isDrawing || entries.length === 0}
            className="px-8"
          >
            {winner ? "Draw Again" : "Start Raffle"}
          </Button>

          {winner && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setWinner(null)}
              className="px-8"
            >
              Reset
            </Button>
          )}
        </div>

        {entries.length === 0 && (
          <p className="mt-4 text-red-500">
            No entries available for the raffle.
          </p>
        )}
      </div>
    </div>
  );
}
