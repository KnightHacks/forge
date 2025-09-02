"use client";

import { useState } from "react";
import Image from "next/image";

interface Slide { src: string; alt?: string }

interface Props {
  slides: Slide[];
  heightClass?: string;     
};

export default function Carousel({ slides, heightClass = "h-72 md:h-96",}: Props) {
  const [idx, setIdx] = useState(0);

  const next = () => setIdx((i) => (i + 1) % slides.length);
  const prev = () => setIdx((i) => (i - 1 + slides.length) % slides.length);


  return (
    <div className={`relative w-full ${heightClass} rounded-xl overflow-hidden shadow-lg`}>
      {/* Slides */}
      {slides.map((s, i) => (
        <div
          key={s.src}
          className={`absolute inset-0 transition-opacity duration-500 ${
            i === idx ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={s.src}
            alt={s.alt ?? ""}
            fill
            className="object-cover"
            priority={i === 0}
          />
        </div>
      ))}

      {/* Controls */}
      <button
        aria-label="Previous"
        onClick={prev}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md bg-black/50 px-3 py-1.5 text-white hover:bg-black/70"
      >
        ‹
      </button>
      <button
        aria-label="Next"
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-black/50 px-3 py-1.5 text-white hover:bg-black/70"
      >
        ›
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2.5 w-2.5 rounded-full transition ${
              i === idx ? "bg-white" : "bg-white/50 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
