"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
  src?: string;
  alt?: string;
  size?: number;
  name?: string;
}

export default function CenterIcon({
  src,
  alt = "icon",
  size = 140,
}: Props) {
  const [spinning, setSpinning] = useState(false);
  const dim = { width: size, height: size };

  const toggleSpin = () => setSpinning((prev) => !prev);

  return (
    <div className="flex flex-col items-center gap-4">
      {src ? (
        <div
          onClick={toggleSpin}
          className={`rounded-full p-1 cursor-pointer transition-all duration-500 
            hover:ring-2 hover:ring-blue-400 hover:ring-offset-2 hover:ring-offset-black
            ${spinning ? "animate-spin" : ""}`}
          style={dim}
        >
          <Image
            src={src}
            alt={alt}
            width={size}
            height={size}
            className="rounded-full shadow-lg object-cover"
            priority
          />
        </div>
      ) : (
        <div
          aria-label="center icon placeholder"
          onClick={toggleSpin}
          className={`rounded-full ring-2 ring-white shadow-lg cursor-pointer transition-all duration-500 hover:ring-4 hover:ring-blue-400 hover:ring-offset-2 hover:ring-offset-black ${
            spinning ? "animate-spin" : ""
          }`}
          style={dim}
        />
      )}

      <p className="mt-2 text-sm md:text-xl text-gray-200/110 italic shadow-lg">
        hi! my name is ethan mckissic
      </p>
    </div>
  );
}
